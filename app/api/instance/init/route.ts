import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    console.log('🚀 [API/INIT] Request received');
    try {
        const body = await request.json();

        // 1. Auth
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const tenantId = user?.id;

        if (!tenantId) {
            console.error('🚫 [EVOLUTION] Unauthorized: No session found.');
            return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
        }

        // 2. Deterministic Instance Name (Tenant-Unique)
        // Uses a prefix + sanitized owner_id portion to guarantee uniqueness per tenant.
        const prefix = process.env.NEXT_PUBLIC_INSTANCE_PREFIX || "belezap";
        const ownerHash = tenantId.replace(/-/g, '').substring(0, 10);
        const fallbackName = `${prefix}_${ownerHash}`;
        const rawName = body.instanceName || body.companyName || fallbackName;
        
        // Sanitize and build name (strip special chars, lowercase)
        const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const rawInstanceName = cleanName.startsWith(prefix) 
            ? cleanName 
            : `${prefix}${cleanName}`;
        const finalInstanceName = rawInstanceName.substring(0, 20); // Limit to 20 chars for Baileys compatibility

        console.log(`[INSTANCE_FACTORY] Resolved name: ${finalInstanceName} | Tenant: ${tenantId}`);

        // 3. Pre-Flight Validation (URLs & Keys)
        const baseUrl = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
        const apiKey = process.env.EVOLUTION_API_KEY;
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

        if (!apiKey || apiKey === "PASTE_YOUR_KEY_HERE" || apiKey === "SUA_CHAVE_AQUI") {
            throw new Error("Evolution API Global Key not configured.");
        }

        if (!baseUrl || !appUrl) {
            throw new Error("Missing Evolution API URL or App URL configuration.");
        }

        // 4. Auto-Seed Database (UPSERT)
        const defaultContext = {
            faq: [],
            services: [
                {
                    name: "Serviço Base",
                    price: 0,
                    duration: "1h",
                    description: "Configure este serviço no painel."
                }
            ],
            business_info: {
                name: "Nova Empresa",
                handoff_phone: "5500000000000",
                scheduling_link: ""
            },
            is_ai_enabled: true,
            operating_hours: {
                weekdays: { open: "09:00", close: "18:00", is_closed: false },
                saturday: { open: "09:00", close: "13:00", is_closed: false },
                sunday: { open: "00:00", close: "00:00", is_closed: true }
            },
            connection_status: "CONNECTING"
        };

        const { data: config, error: upsertError } = await supabaseAdmin
            .from('business_config')
            .upsert({
                owner_id: tenantId,
                instance_name: finalInstanceName,
                status: 'CONNECTING',
                context_json: defaultContext,
                plan_tier: 'ELITE',
                updated_at: new Date().toISOString()
            }, { onConflict: 'owner_id' })
            .select()
            .single();

        if (upsertError) {
            console.error('❌ [API/INIT] DB Upsert failed:', upsertError);
            throw new Error(`Falha ao preparar registro: ${upsertError.message}`);
        }

        // 5. Webhook Target Resolution
        const railwayWorkerUrl = (process.env.RAILWAY_WEBHOOK_URL || "https://sua-secretaria.up.railway.app").replace(/\/$/, "");
        const webhookFullUrl = railwayWorkerUrl.endsWith('/api/webhook/evolution') 
            ? `${railwayWorkerUrl}?tenantId=${tenantId}`
            : `${railwayWorkerUrl}/api/webhook/evolution?tenantId=${tenantId}`;
        console.log(`[INSTANCE_FACTORY] Webhook Target: ${webhookFullUrl}`);

        // ============================================================
        // 6. IDEMPOTENT INSTANCE CREATION (Core Fix)
        // ============================================================
        let instanceAlreadyExists = false;

        console.log(`📡 [EVOLUTION] POST /instance/create for ${finalInstanceName}`);
        const payload = {
            instanceName: finalInstanceName,
            token: process.env.WOLF_SECRET_TOKEN || 'wolfagent2026',
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
            webhook: {
                url: webhookFullUrl,
                enabled: true,
                webhookByEvents: false,
                events: [
                    "MESSAGES_UPSERT",
                    "CONNECTION_UPDATE"
                ]
            }
        };

        const createRes = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify(payload),
        });

        const createData = await createRes.json();
        console.log(`📡 [EVOLUTION] Creation Status: ${createRes.status}`);

        if (!createRes.ok) {
            // ---- GRACEFUL FALLBACK: Instance already exists ----
            if (createRes.status === 403 || createRes.status === 409 ||
                JSON.stringify(createData).toLowerCase().includes('already') ||
                JSON.stringify(createData).toLowerCase().includes('in use')) {
                
                console.log(`⚡ [EVOLUTION] Instance "${finalInstanceName}" already exists. Bypassing creation...`);
                instanceAlreadyExists = true;
            } else {
                // Genuine failure — not a collision
                throw new Error(`Evolution API Instance Creation Failed (${createRes.status}): ${JSON.stringify(createData)}`);
            }
        }

        // ============================================================
        // 7. CONNECTION STATE CHECK (for existing ghost instances)
        // ============================================================
        if (instanceAlreadyExists) {
            console.log(`🔍 [EVOLUTION] Fetching connection state for ghost instance: ${finalInstanceName}`);
            try {
                const stateRes = await fetch(`${baseUrl}/instance/connectionState/${finalInstanceName}`, {
                    method: 'GET',
                    headers: { 'apikey': apiKey }
                });
                if (stateRes.ok) {
                    const stateData = await stateRes.json();
                    const currentState = stateData?.instance?.state || stateData?.state || 'unknown';
                    console.log(`📊 [EVOLUTION] Ghost instance state: ${currentState}`);

                    // If already connected, just return success
                    if (currentState === 'open' || currentState === 'connected') {
                        console.log(`✅ [EVOLUTION] Instance ${finalInstanceName} is already CONNECTED. Returning success.`);
                        
                        await supabaseAdmin
                            .from('business_config')
                            .update({ status: 'CONNECTED', updated_at: new Date().toISOString() })
                            .eq('owner_id', tenantId);

                        return NextResponse.json({
                            success: true,
                            instance: { instanceName: finalInstanceName, state: currentState },
                            qrcode: null,
                            alreadyConnected: true
                        });
                    }
                }
            } catch (stateErr: any) {
                console.warn(`⚠️ [EVOLUTION] Failed to check connection state: ${stateErr.message}`);
            }
        }

        // ============================================================
        // 8. LOGOUT STALE SESSION (Clean slate for QR generation)
        // ============================================================
        if (!instanceAlreadyExists) {
            try {
                await fetch(`${baseUrl}/instance/logout/${finalInstanceName}`, {
                    method: 'DELETE', headers: { 'apikey': apiKey }
                });
            } catch (e) {}
        }

        // Mandatory propagation gap
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ============================================================
        // 9. GENERATE QR CODE (with retry logic)
        // ============================================================
        let connectData: any;
        let qrRetries = 0;
        const maxQrRetries = 3;

        while (qrRetries < maxQrRetries) {
            console.log(`🔗 [EVOLUTION] Fetching QR code for ${finalInstanceName} (Attempt ${qrRetries + 1})...`);
            const connectRes = await fetch(`${baseUrl}/instance/connect/${finalInstanceName}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey }
            });

            if (connectRes.ok) {
                connectData = await connectRes.json();
                break;
            }

            if (connectRes.status === 404) {
                qrRetries++;
                console.warn(`⚠️ [EVOLUTION] Instance not found (404) during QR fetch. Retrying in 2s... (${qrRetries}/${maxQrRetries})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }

            const errorData = await connectRes.json();
            throw new Error(`Failed to fetch fresh QR code: ${JSON.stringify(errorData)}`);
        }

        if (!connectData) {
            throw new Error(`Instance failed to initialize after ${maxQrRetries} attempts. Final 404.`);
        }

        // 10. Set webhook explicitly (Belt-and-suspenders)
        try {
            await fetch(`${baseUrl}/webhook/set/${finalInstanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({
                    webhook: {
                        url: webhookFullUrl,
                        enabled: true,
                        webhookByEvents: false,
                        events: [
                            "MESSAGES_UPSERT",
                            "CONNECTION_UPDATE"
                        ]
                    }
                }),
            });
        } catch (e) {}

        console.log(`✅ [EVOLUTION] Instance ${finalInstanceName} initialized successfully.`);

        return NextResponse.json({
            success: true,
            instance: connectData.instance || connectData,
            qrcode: connectData.qrcode || connectData.base64
        });

    } catch (error: any) {
        console.error("❌ [API/INIT_CRASH] Failed for user. Error:", error.message);
        return NextResponse.json(
            { 
                error: "Erro de inicialização: Dados da empresa incompletos ou falha na API.", 
                details: error.message 
            }, 
            { status: 400 }
        );
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Init route is alive' });
}
