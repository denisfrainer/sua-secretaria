import { NextResponse } from 'next/server';

// Optional: Netlify's Next.js adapter standard for scheduling
export const config = { schedule: "0 11-20 * * 1-5" };

export async function POST(req: Request) {
    console.log('\n--- 🐺 INICIANDO SCHEDULED CRON DO LOBO ---');
    try {
        const targetUrl = process.env.NEXT_PUBLIC_SITE_URL 
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/lobo`
            : 'https://wolfagent.netlify.app/api/lobo';

        const token = process.env.WOLF_SECRET_TOKEN;
        
        if (!token) {
            console.error('❌ ERRO: WOLF_SECRET_TOKEN não configurado no servidor.');
            return NextResponse.json({ error: 'Missing token in env' }, { status: 500 });
        }

        console.log(`📡 Disparando fetch interno para: ${targetUrl}`);
        
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-wolf-token': token
            },
            body: JSON.stringify({ type: 'daily_hunt' })
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error(`❌ Falha na rota do Lobo (Status: ${response.status})`, responseData);
            return NextResponse.json(
                { error: 'Lobo trigger failed', details: responseData },
                { status: response.status }
            );
        }

        console.log(`✅ Sucesso no Lobo Cron (Status: ${response.status}):`, responseData);
        return NextResponse.json({ success: true, details: responseData });
    } catch (error) {
        console.error('❌ Erro Crítico durante execução do Lobo Cron:', error);
        return NextResponse.json({ error: 'Cron execution failed' }, { status: 500 });
    }
}

// Netlify Cron normally triggers functions via GET requests, so we expose GET as well 
// and just redirect it to the POST logic.
export async function GET(req: Request) {
    return POST(req);
}
