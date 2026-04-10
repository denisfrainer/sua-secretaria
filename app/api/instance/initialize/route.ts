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
            .select('context_json')
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

        const { error: upsertError } = await supabaseAdmin
            .from('business_config')
            .upsert({
                owner_id: tenantId,
                instance_name: instanceName,
                plan_tier: 'ELITE', // Default to ELITE as requested
                context_json: existingConfig?.context_json 
                    ? { ...defaultContext, ...existingConfig.context_json, is_ai_enabled: true } 
                    : defaultContext,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'owner_id' 
            });

        if (upsertError) {
            console.error('❌ [EVOLUTION] Failed to sync business_config:', upsertError);
            return NextResponse.json({ error: 'Failed to provision account configuration' }, { status: 500 });
        }

        console.log(`✅ [EVOLUTION] business_config synced for ${tenantId} with instance ${instanceName}`);

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

        // 1. Create the Instance
        const createRes = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify({
                instanceName: instanceName,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            }),
        });

        const createData = await createRes.json();
        
        if (!createRes.ok) {
            console.error('❌ [EVOLUTION] Failed to create instance:', createData);
            return NextResponse.json({ error: 'Failed to create instance', details: createData }, { status: createRes.status });
        }

        console.log(`✅ [EVOLUTION] Instance ${instanceName} created successfully.`);

        // 2. Set the Webhook for the Worker
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
                        "CONNECTION_UPDATE"
                    ]
                }
            }),
        });

        if (!webhookRes.ok) {
            console.error('⚠️ [EVOLUTION] Failed to set webhook, but instance was created.', await webhookRes.text());
        } else {
            console.log(`✅ [EVOLUTION] Webhook set successfully to ${webhookUrl}`);
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
