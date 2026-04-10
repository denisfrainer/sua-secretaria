import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { instanceName } = await request.json();

        // 1. Recover the Tenant ID directly from the server-side session
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const tenantId = user?.id;

        if (!tenantId) {
            console.error('🚫 [EVOLUTION] Unauthorized: No session found for instance initialization.');
            return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
        }

        if (!instanceName) {
            return NextResponse.json({ error: 'instanceName is required' }, { status: 400 });
        }

        // 1.5 AUTO-PROVISIONING & SYNC: Ensure business_config exists and is synced with the instance_name
        console.log(`📡 [EVOLUTION] Ensuring business_config for ${tenantId}...`);
        
        const { data: existingConfig } = await supabaseAdmin
            .from('business_config')
            .select('id, context_json')
            .eq('owner_id', tenantId)
            .maybeSingle();

        const defaultContext = {
            is_ai_enabled: true,
            connection_status: 'DISCONNECTED',
            business_info: { name: '', handoff_phone: '', scheduling_link: '' },
            operating_hours: {
                weekdays: { open: "09:00", close: "18:00", is_closed: false },
                saturday: { open: "09:00", close: "13:00", is_closed: false },
                sunday: { open: "00:00", close: "00:00", is_closed: true }
            },
            services: [],
            faq: []
        };

        let provisionError: any = null;

        if (existingConfig) {
            // UPDATE existing record — preserve user data, sync instance_name
            const mergedContext = { ...defaultContext, ...existingConfig.context_json, is_ai_enabled: (existingConfig.context_json as any)?.is_ai_enabled ?? true };
            const { error } = await supabaseAdmin
                .from('business_config')
                .update({
                    instance_name: instanceName,
                    plan_tier: 'ELITE',
                    context_json: mergedContext,
                    updated_at: new Date().toISOString()
                })
                .eq('owner_id', tenantId);
            provisionError = error;
        } else {
            // INSERT new record for first-time users
            const { error } = await supabaseAdmin
                .from('business_config')
                .insert({
                    owner_id: tenantId,
                    instance_name: instanceName,
                    plan_tier: 'ELITE',
                    context_json: defaultContext,
                    updated_at: new Date().toISOString()
                });
            provisionError = error;
        }

        if (provisionError) {
            console.error('❌ [EVOLUTION] Failed to sync business_config:', provisionError);
            return NextResponse.json({ error: 'Failed to provision account configuration' }, { status: 500 });
        }

        console.log(`✅ [EVOLUTION] business_config synced for ${tenantId} with instance ${instanceName}`);

        // 🛡️ ANTI-ABUSE: Check if user already has an active instance
        const { data: currentConfig } = await supabaseAdmin
            .from('business_config')
            .select('instance_name, context_json')
            .eq('owner_id', tenantId)
            .maybeSingle();

        const existingInstanceName = currentConfig?.instance_name;
        const connectionStatus = (currentConfig?.context_json as any)?.connection_status;

        if (existingInstanceName && existingInstanceName !== instanceName) {
            console.warn(`🛡️ [ANTI-ABUSE] User ${tenantId} already has instance "${existingInstanceName}" (status: ${connectionStatus}). Blocking creation.`);
            return NextResponse.json({ 
                error: 'Você já possui uma instância. Exclua a atual antes de criar uma nova.',
                existingInstance: existingInstanceName,
                status: connectionStatus
            }, { status: 409 });
        }

        const baseUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY;
        const webhookUrl = process.env.WEBHOOK_URL?.replace(/\/$/, ""); // Ensure no trailing slash

        if (!baseUrl || !apiKey || !webhookUrl) {
           console.error('🚨 [EVOLUTION] Missing env credentials (EVOLUTION_API_URL, EVOLUTION_API_KEY or WEBHOOK_URL).');
           return NextResponse.json({ error: 'Evolution API credentials not configured.' }, { status: 500 });
        }

        // 2. Build the exact webhook path required for the Eliza architecture
        const webhookFullUrl = `${webhookUrl}/api/webhook/evolution?tenantId=${tenantId}`;

        console.log(`🚀 [EVOLUTION] Initiating instance: ${instanceName} | Tenant: ${tenantId}`);
        console.log(`🔗 [EVOLUTION] Target Webhook: ${webhookFullUrl}`);

        // 1. Create the Instance WITH webhook subscription bundled in
        //    This ensures CONNECTION_UPDATE events fire from the very first second.
        const createRes = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify({
                instanceName: instanceName,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                webhook: {
                    url: webhookFullUrl,
                    byEvents: false,
                    base64: false,
                    events: [
                        "MESSAGES_UPSERT",
                        "CONNECTION_UPDATE",
                        "messages.upsert",
                        "connection.update"
                    ]
                }
            }),
        });

        const createData = await createRes.json();
        
        if (!createRes.ok) {
            console.error('❌ [EVOLUTION] Failed to create instance:', createData);
            return NextResponse.json({ error: 'Failed to create instance', details: createData }, { status: createRes.status });
        }

        console.log(`✅ [EVOLUTION] Instance ${instanceName} created with inline webhook.`);

        // 2. Belt-and-suspenders: Also set webhook explicitly in case the create payload didn't register it
        try {
            const webhookRes = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey,
                },
                body: JSON.stringify({
                    webhook: {
                        enabled: true,
                        url: webhookFullUrl,
                        webhookByEvents: false,
                        webhookBase64: false,
                        events: [
                            "MESSAGES_UPSERT",
                            "CONNECTION_UPDATE",
                            "messages.upsert",
                            "connection.update"
                        ]
                    }
                }),
            });

            if (!webhookRes.ok) {
                console.warn('⚠️ [EVOLUTION] Fallback webhook/set returned non-200:', await webhookRes.text());
            } else {
                console.log(`✅ [EVOLUTION] Fallback webhook/set confirmed for ${instanceName}`);
            }
        } catch (webhookErr: any) {
            console.warn(`⚠️ [EVOLUTION] Fallback webhook/set failed (non-fatal):`, webhookErr.message);
        }

        // Return the QR Code and the created instance data
        return NextResponse.json({
            success: true,
            instance: createData.instance || createData, // V2 format
            qrcode: createData.qrcode || createData.base64 // Catching variations of V2 response base64
        });

    } catch (error: any) {
        console.error('💥 [EVOLUTION] Exception during instance initialization:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
