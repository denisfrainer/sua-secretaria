import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
