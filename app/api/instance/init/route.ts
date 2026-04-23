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
        const finalInstanceName = cleanName.startsWith(prefix) 
            ? cleanName 
            : `${prefix}-${cleanName}`;

        // 3. Pre-Flight Validation (URLs & Keys)
        const baseUrl = process.env.EVOLUTION_API_URL;
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
            is_ai_enabled: true,
            business_info: { name: '', handoff_phone: '', scheduling_link: '' },
            operating_hours: {
                weekdays: { open: "09:00", close: "18:00", is_closed: false },
                saturday: { open: "09:00", close: "13:00", is_closed: false },
                sunday: { open: "00:00", close: "00:00", is_closed: true }
            },
            services: [],
            faq: []
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

        // Force the Railway URL for the Webhook Payload
        const WEBHOOK_TARGET = "https://sua-secretaria.up.railway.app";
        const webhookFullUrl = `${WEBHOOK_TARGET}/api/webhook/evolution?tenantId=${tenantId}`;
        
        console.log(`[EVOLUTION_API] Initiating creation for instance: ${finalInstanceName} | Tenant: ${tenantId}`);

        // 5. Evolution API Handshake
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
                    enabled: true,
                    webhookByEvents: true,
                    events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"]
                }
            }),
        });

        if (!createRes.ok && createRes.status === 401) {
            throw new Error("Evolution API authentication failed (401).");
        }

        // Force logout to clear any stuck sessions
        try {
             await fetch(`${baseUrl}/instance/logout/${finalInstanceName}`, {
                 method: 'DELETE', headers: { 'apikey': apiKey }
             });
        } catch (e) {}

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 6. Generate QR Code
        console.log(`🔗 [EVOLUTION] Generating QR code for ${finalInstanceName}...`);
        const connectRes = await fetch(`${baseUrl}/instance/connect/${finalInstanceName}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey }
        });

        const connectData = await connectRes.json();

        if (!connectRes.ok) {
            throw new Error(`Failed to fetch fresh QR code: ${JSON.stringify(connectData)}`);
        }

        // Set webhook explicitly (Belt-and-suspenders)
        try {
            await fetch(`${baseUrl}/webhook/set/${finalInstanceName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({
                    webhook: {
                        enabled: true,
                        url: webhookFullUrl,
                        webhookByEvents: true,
                        webhookBase64: false,
                        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"]
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
