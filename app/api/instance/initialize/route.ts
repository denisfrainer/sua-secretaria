import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { instanceName } = await request.json();

        // 1. Auth — recover Tenant ID from server-side session
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

        // 2. Fetch existing config + anti-abuse gate
        const { data: existingConfig } = await supabaseAdmin
            .from('business_config')
            .select('id, instance_name, context_json')
            .eq('owner_id', tenantId)
            .maybeSingle();

        const existingInstanceName = existingConfig?.instance_name;

        if (existingInstanceName && existingInstanceName.trim().length > 0) {
            const connectionStatus = (existingConfig?.context_json as any)?.connection_status;
            console.warn(`🛡️ [ANTI-ABUSE] User ${tenantId} already has instance "${existingInstanceName}" (status: ${connectionStatus}). Blocking creation.`);
            return NextResponse.json({ 
                error: 'Você já possui uma instância. Exclua a atual antes de criar uma nova.',
                existingInstance: existingInstanceName,
                status: connectionStatus
            }, { status: 409 });
        }

        // 3. Validate env
        const baseUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY;
        const webhookUrl = process.env.WEBHOOK_URL?.replace(/\/$/, "");

        if (!baseUrl || !apiKey || !webhookUrl) {
           console.error('🚨 [EVOLUTION] Missing env credentials (EVOLUTION_API_URL, EVOLUTION_API_KEY or WEBHOOK_URL).');
           return NextResponse.json({ error: 'Evolution API credentials not configured.' }, { status: 500 });
        }

        // ============================================================
        // 4. PRE-COMMIT: Write DISCONNECTED state to DB BEFORE calling
        //    Evolution API. This ensures the webhook's CONNECTED update
        //    always arrives AFTER this write, never before it.
        // ============================================================
        console.log(`📡 [EVOLUTION] PRE-COMMIT: Writing instance_name=${instanceName} + DISCONNECTED to DB...`);

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
            const mergedContext = {
                ...defaultContext,
                ...(existingConfig.context_json || {}),
                is_ai_enabled: (existingConfig.context_json as any)?.is_ai_enabled ?? true,
                connection_status: 'DISCONNECTED'
            };
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
            console.error('❌ [EVOLUTION] PRE-COMMIT failed:', provisionError);
            return NextResponse.json({ error: 'Failed to provision account configuration' }, { status: 500 });
        }

        console.log(`✅ [EVOLUTION] PRE-COMMIT done. DB ready for webhook events.`);

        // ============================================================
        // 5. Call Evolution API — the webhook can now safely fire
        //    CONNECTION_UPDATE at any time without being overwritten.
        // ============================================================
        const webhookFullUrl = `${webhookUrl}/api/webhook/evolution?tenantId=${tenantId}`;

        console.log(`🚀 [EVOLUTION] Creating instance: ${instanceName} | Tenant: ${tenantId}`);
        console.log(`🔗 [EVOLUTION] Target Webhook: ${webhookFullUrl}`);

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
                        "CONNECTION_UPDATE"
                    ]
                }
            }),
        });

        const createData = await createRes.json();
        
        if (!createRes.ok) {
            // ============================================================
            // 6. ROLLBACK: Evolution API failed — undo the pre-commit
            // ============================================================
            console.error('❌ [EVOLUTION] Failed to create instance. ROLLING BACK DB...', createData);

            const rollbackContext = existingConfig?.context_json || defaultContext;
            const cleanedRollback = {
                ...(typeof rollbackContext === 'object' ? rollbackContext : {}),
                connection_status: 'DISCONNECTED',
            };

            await supabaseAdmin
                .from('business_config')
                .update({
                    instance_name: null,
                    context_json: cleanedRollback,
                    updated_at: new Date().toISOString()
                })
                .eq('owner_id', tenantId);

            console.log(`🔄 [EVOLUTION] Rollback complete. instance_name set back to null.`);
            return NextResponse.json({ error: 'Failed to create instance', details: createData }, { status: createRes.status });
        }

        console.log(`✅ [EVOLUTION] Instance ${instanceName} created with inline webhook.`);

        // 7. Belt-and-suspenders: Explicit webhook/set (non-fatal)
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
                            "CONNECTION_UPDATE"
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

        // ============================================================
        // 8. SUCCESS — return to client. NO further DB writes.
        //    The webhook handler on Railway owns connection_status now.
        // ============================================================
        return NextResponse.json({
            success: true,
            instance: createData.instance || createData,
            qrcode: createData.qrcode || createData.base64
        });

    } catch (error: any) {
        console.error('💥 [EVOLUTION] Exception during instance initialization:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
