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

        // 2. Null-Safe Instance Generation (Step 1)
        const prefix = process.env.NEXT_PUBLIC_INSTANCE_PREFIX || "secretaria";
        const fallbackName = `user-${tenantId.split('-')[0]}`;
        const rawName = body.instanceName || body.companyName || fallbackName;
        
        // Sanitize and build name (strip special chars, lowercase)
        const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const rawInstanceName = cleanName.startsWith(prefix) 
            ? cleanName 
            : `${prefix}-${cleanName}`;
        const finalInstanceName = rawInstanceName.substring(0, 20); // Limit to 20 chars for Baileys compatibility

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

        // 4. Auto-Seed Database (Step 2: UPSERT)
        // Ensure baseline record exists BEFORE calling the Evolution API
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
                plan_tier: 'ELITE', // Defaulting for new users
                updated_at: new Date().toISOString()
            }, { onConflict: 'owner_id' })
            .select()
            .single();

        if (upsertError) {
            console.error('❌ [API/INIT] DB Upsert failed:', upsertError);
            throw new Error(`Falha ao preparar registro: ${upsertError.message}`);
        }

        // 🛡️ Webhook Target Resolution (Unified Express Monolith)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
        if (!appUrl) {
            console.error("🚨 [FATAL_CONFIG] Webhook URL resolution failed: Missing environment variables.");
            throw new Error("FATAL: NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL is undefined.");
        }
        
        const WEBHOOK_TARGET = appUrl.replace(/\/$/, "");
        const webhookFullUrl = `${WEBHOOK_TARGET}/webhook/evolution?tenantId=${tenantId}`;
        
        console.log(`[INSTANCE FACTORY] Webhook Target: ${webhookFullUrl}`);
        
        console.log(`[EVOLUTION_API] Initiating creation for instance: ${finalInstanceName} | Tenant: ${tenantId}`);

        // 5. Evolution API Handshake
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

        console.log(`📤 [EVOLUTION] Sending payload:`, JSON.stringify(payload, null, 2));
        const createRes = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify(payload),
        });

        const createData = await createRes.json();
        console.log(`📡 [EVOLUTION_DEBUG] Creation Status: ${createRes.status}`);
        console.log(`📡 [EVOLUTION_DEBUG] Creation Body: ${JSON.stringify(createData)}`);

        if (!createRes.ok) {
            throw new Error(`Evolution API Instance Creation Failed (${createRes.status}): ${JSON.stringify(createData)}`);
        }

        // Force logout to clear any stuck sessions
        try {
             await fetch(`${baseUrl}/instance/logout/${finalInstanceName}`, {
                 method: 'DELETE', headers: { 'apikey': apiKey }
             });
        } catch (e) {}

        // Mandatory propagation gap
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 6. Generate QR Code with Retry logic
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

        // Set webhook explicitly (Belt-and-suspenders)
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
