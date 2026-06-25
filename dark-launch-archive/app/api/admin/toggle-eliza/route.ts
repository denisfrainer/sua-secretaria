// app/api/admin/toggle-eliza/route.ts
// 🐺 Godspeed Kill Switch — Liga/Desliga webhook da Eliza na Z-API
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const tag = '⚡ [KILL SWITCH]:';

    try {
        // 1. AUTH
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token || token !== process.env.ADMIN_SECRET_PASSWORD) {
            console.log(`${tag} ❌ Acesso negado.`);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. PARSE PAYLOAD
        const { active } = await req.json();

        if (typeof active !== 'boolean') {
            return NextResponse.json({ error: 'Payload inválido. Esperado: { active: boolean }' }, { status: 400 });
        }

        // 3. BUILD Z-API ENDPOINT
        // ZAPI_URL ends with /send-text — strip that to get the base
        const zapiUrl = process.env.ZAPI_URL || '';
        const zapiBase = zapiUrl.replace(/\/send-text$/, '');
        const updateWebhookUrl = `${zapiBase}/update-webhook-received`;
        const clientToken = process.env.ZAPI_CLIENT_TOKEN || '';

        // 4. TOGGLE WEBHOOK
        const webhookValue = active ? (process.env.WEBHOOK_URL || '') : '';

        console.log(`${tag} ${active ? '🟢 LIGANDO' : '🔴 DESLIGANDO'} Eliza...`);
        console.log(`${tag} Webhook URL → "${webhookValue}"`);

        const response = await fetch(updateWebhookUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': clientToken,
            },
            body: JSON.stringify({ value: webhookValue }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`${tag} ❌ Z-API retornou erro ${response.status}: ${errorBody}`);
            return NextResponse.json(
                { error: 'Z-API request failed', details: errorBody },
                { status: 502 }
            );
        }

        const result = await response.json();
        console.log(`${tag} ✅ Webhook ${active ? 'ATIVADO' : 'DESATIVADO'} com sucesso!`);

        return NextResponse.json({
            success: true,
            active,
            message: active ? 'Eliza está ONLINE ☀️' : 'Eliza está DORMINDO 🌙',
            zapiResponse: result,
        });
    } catch (error) {
        console.error(`${tag} 💀 Erro crítico:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
