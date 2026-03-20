import { NextResponse } from 'next/server';

// 🐺 AGUDA: A cada 10 minutos durante o horário comercial
export const config = {
    schedule: "*/10 10-20 * * 1-5"
};

export async function POST(req: Request) {
    const cronId = Math.random().toString(36).substring(7);
    console.log(`\n--- 🐺 [${cronId}] INICIANDO CAÇADA AGENDADA (LOTE SEGURO) ---`);

    try {
        const targetUrl = process.env.WOLF_SITE_URL
            ? `${process.env.WOLF_SITE_URL}/api/lobo`
            : 'http://localhost:3000/api/lobo';

        const token = process.env.ADMIN_SECRET_PASSWORD;

        if (!token) {
            console.error(`❌ [${cronId}] ERRO: WOLF_ADMIN_TOKEN não configurado.`);
            return NextResponse.json({ error: 'Missing token' }, { status: 500 });
        }

        // Timeout AbortController: 20 Segundos é a linha vermelha do Serverless
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-wolf-token': token
            },
            body: JSON.stringify({
                type: 'daily_hunt',
                batch_size: 2, // 🎯 A MATEMÁTICA PERFEITA: 2 leads x 8s = 16s totais.
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
        const errorMsg = error.name === 'AbortError' ? 'Timeout Preventivo de 20s acionado' : error.message;
        console.error(`❌ [${cronId}] Erro Crítico:`, errorMsg);
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return POST(req);
}