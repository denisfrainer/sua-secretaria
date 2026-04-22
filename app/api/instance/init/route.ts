import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    console.log('🚀 [API/INIT] Request received');
    try {
        const { instanceName } = await request.json();

        // 1. Auth
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const tenantId = user?.id;

        if (!tenantId) {
            console.error('🚫 [EVOLUTION] Unauthorized: No session found.');
            return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
        }

        if (!instanceName) {
            return NextResponse.json({ error: 'instanceName is required' }, { status: 400 });
        }

        // 2. Anti-abuse: block if user already has an instance
        const { data: existingConfig } = await supabaseAdmin
            .from('business_config')
            .select('id, instance_name, context_json')
            .eq('owner_id', tenantId)
            .maybeSingle();

        if (existingConfig?.instance_name?.trim()) {
            const cs = (existingConfig.context_json as any)?.connection_status;
            console.warn(`🛡️ [ANTI-ABUSE] User ${tenantId} already has "${existingConfig.instance_name}" (${cs}). Blocked.`);
            return NextResponse.json({
                error: 'Você já possui uma instância. Exclua a atual antes de criar uma nova.',
                existingInstance: existingConfig.instance_name,
                status: cs
            }, { status: 409 });
        }

        // 3. Pre-Flight Validation
        const baseUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY;
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
        const prefix = process.env.NEXT_PUBLIC_INSTANCE_PREFIX || "secretaria";

        console.log(`🔑 [PRE-FLIGHT] Checking API Key: ${apiKey?.substring(0, 5)}...`);

        if (!apiKey || apiKey === "PASTE_YOUR_KEY_HERE" || apiKey === "SUA_CHAVE_AQUI") {
            console.error('🛑 [FATAL] EVOLUTION_API_KEY is missing or contains a placeholder!');
            return NextResponse.json({ 
                error: 'Evolution API Global Key not configured. Please check your .env.local file.',
                code: 'MISSING_API_KEY'
            }, { status: 500 });
        }

        if (!baseUrl || !appUrl) {
            console.error('🚨 [EVOLUTION] Missing env credentials (URL or App URL).');
            return NextResponse.json({ error: 'Evolution API credentials not configured.' }, { status: 500 });
        }

        // Force naming convention: secretaria-uuid or provided name with prefix
        const finalInstanceName = instanceName.startsWith(prefix) 
            ? instanceName 
            : `${prefix}-${instanceName}`;

        const webhookFullUrl = `${appUrl}/api/webhook/evolution?tenantId=${tenantId}`;
        
        console.log(`[EVOLUTION_API] Initiating creation for instance: ${finalInstanceName} | Prefix: ${prefix} | Tenant: ${tenantId}`);
        console.log(`🔗 [EVOLUTION_API] Webhook target: ${webhookFullUrl}`);

        // 4. Ensure instance exists on Evolution
        console.log(`📡 [EVOLUTION] POST /instance/create for ${finalInstanceName}`);
        const createRes = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
                instanceName: finalInstanceName,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                webhook: {
                    url: webhookFullUrl,
                    byEvents: false,
                    base64: false,
                    events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
                }
            }),
        });

        if (!createRes.ok) {
            const errorText = await createRes.text();
            
            // STRICT ERROR BOUNDARY: Handle 401 Unauthorized
            if (createRes.status === 401) {
                console.error(`🛑 [FATAL] Evolution API returned 401 Unauthorized. Key is likely invalid.`);
                return NextResponse.json({ 
                    error: 'Evolution API authentication failed. Verify your Global API Key.',
                    details: errorText
                }, { status: 401 });
            }

            console.warn(`⚠️ [EVOLUTION] Instance creation warned (status ${createRes.status}):`, errorText);
        }

        // 5. PURGE: Force logout to clear any stuck 440 conflict sessions
        console.log(`🧹 [EVOLUTION] Purging potentially stuck connection for ${finalInstanceName}...`);
        try {
             await fetch(`${baseUrl}/instance/logout/${finalInstanceName}`, {
                 method: 'DELETE',
                 headers: { 'apikey': apiKey }
             });
        } catch (e: any) {
             console.log(`⚠️ [EVOLUTION] Logout returned exception (safe to ignore):`, e.message);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 6. GENERATE: Fetch fresh QR code via connect endpoint
        console.log(`🔗 [EVOLUTION] Generating fresh QR code for ${finalInstanceName}...`);
        const connectRes = await fetch(`${baseUrl}/instance/connect/${finalInstanceName}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey }
        });

        const connectData = await connectRes.json();

        if (!connectRes.ok) {
            console.error('❌ [EVOLUTION] Failed to connect instance:', connectData);
            return NextResponse.json({ error: 'Failed to fetch fresh QR code', details: connectData }, { status: connectRes.status });
        }

        console.log(`✅ [EVOLUTION] Instance ${finalInstanceName} created.`);

        // 5. Belt-and-suspenders: explicit webhook/set (non-fatal)
        try {
            const wRes = await fetch(`${baseUrl}/webhook/set/${finalInstanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({
                    webhook: {
                        enabled: true,
                        url: webhookFullUrl,
                        webhookByEvents: false,
                        webhookBase64: false,
                        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
                    }
                }),
            });
            if (!wRes.ok) console.warn('⚠️ [EVOLUTION] webhook/set non-200:', await wRes.text());
            else console.log(`✅ [EVOLUTION] webhook/set confirmed for ${instanceName}`);
        } catch (e: any) {
            console.warn(`⚠️ [EVOLUTION] webhook/set failed (non-fatal):`, e.message);
        }

        if (existingConfig) {
            const { error } = await supabaseAdmin
                .from('business_config')
                .update({
                    instance_name: finalInstanceName,
                    status: 'CONNECTING',
                    updated_at: new Date().toISOString()
                })
                .eq('owner_id', tenantId);

            if (error) {
                console.error('❌ [EVOLUTION] DB update failed:', error);
                return NextResponse.json({ error: 'Failed to save instance name' }, { status: 500 });
            }
        } else {
            const { error } = await supabaseAdmin
                .from('business_config')
                .insert({
                    owner_id: tenantId,
                    instance_name: finalInstanceName,
                    status: 'CONNECTING',
                    plan_tier: 'ELITE',
                    context_json: {
                        is_ai_enabled: true,
                        business_info: { name: '', handoff_phone: '', scheduling_link: '' },
                        operating_hours: {
                            weekdays: { open: "09:00", close: "18:00", is_closed: false },
                            saturday: { open: "09:00", close: "13:00", is_closed: false },
                            sunday: { open: "00:00", close: "00:00", is_closed: true }
                        },
                        services: [],
                        faq: []
                    },
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('❌ [EVOLUTION] DB insert failed:', error);
                return NextResponse.json({ error: 'Failed to create config' }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            instance: connectData.instance || connectData,
            qrcode: connectData.qrcode || connectData.base64
        });

    } catch (error: any) {
        console.error('💥 [EVOLUTION] Exception:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Init route is alive' });
}
