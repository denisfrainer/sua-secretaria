import { NextResponse } from 'next/server';

// 🐺 AGUDA: Rodar a cada 15 minutos durante o horário comercial (Seg-Sex)
// Isso permite enviar lotes pequenos com mais frequência, o que é MUITO mais seguro.
export const config = {
    schedule: "*/15 10-21 * * 1-5"
};

export async function POST(req: Request) {
    const cronId = Math.random().toString(36).substring(7); // ID para rastrear no log
    console.log(`\n--- 🐺 [${cronId}] INICIANDO CAÇADA AGENDADA ---`);

    try {
        const targetUrl = process.env.WOLF_SITE_URL
            ? `${process.env.WOLF_SITE_URL}/api/lobo`
            : 'http://localhost:3000/api/lobo';

        // Padronizando para a mesma chave do Admin
        const token = process.env.ADMIN_SECRET_PASSWORD;

        if (!token) {
            console.error(`❌ [${cronId}] ERRO: WOLF_ADMIN_TOKEN não configurado.`);
            return NextResponse.json({ error: 'Missing token' }, { status: 500 });
        }

        console.log(`📡 [${cronId}] Disparando lote para: ${targetUrl}`);

        // Timeout AbortController: Evita que a função fique "pendurada"
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-wolf-token': token // Usando o header padronizado
            },
            body: JSON.stringify({
                type: 'daily_hunt',
                batch_size: 3, // 🐺 SEGURANÇA: Processa apenas 3 leads por vez (a cada 15 min)
                cron_ref: cronId
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(`Lobo API respondeu com erro: ${response.status}`);
        }

        console.log(`✅ [${cronId}] Sucesso:`, responseData);
        return NextResponse.json({ success: true, cronId, details: responseData });

    } catch (error: any) {
        const errorMsg = error.name === 'AbortError' ? 'Timeout na API do Lobo' : error.message;
        console.error(`❌ [${cronId}] Erro Crítico:`, errorMsg);
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return POST(req);
}