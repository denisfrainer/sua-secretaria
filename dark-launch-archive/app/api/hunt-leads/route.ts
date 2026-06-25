import { NextResponse } from 'next/server';
import { processHunt } from '../../../lib/prospector/scraper';

export async function POST(req: Request) {
    console.log('--- 🐺 REQUISIÇÃO RECEBIDA PARA HUNT LEADS (SCRAPER) ---');

    try {
        // 1. Validar Token de Segurança
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.WOLF_SECRET_TOKEN) {
            console.log('⚠️ Token inválido ou ausente:', token);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Parse do Payload
        let body;
        try {
            body = await req.json();
            console.log('📦 Payload recebido (Hunt):', body);
        } catch (err) {
            console.error('❌ Erro ao ler JSON da requisição (Hunt):', err);
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const query = body.query;
        const limit = body.limit || 30;

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'O campo "query" é obrigatório. Ex: "Lojas de Roupa em Florianópolis"' }, 
                { status: 400 }
            );
        }

        // 3. Iniciar Caçada Assíncrona (Async Trigger with Webhooks)
        await processHunt({ query, limit });

        return NextResponse.json({ 
            status: 'success',
            message: 'Scraper triggered. Apify will ping the webhook when done.',
            query, 
            limit 
        });

    } catch (err) {
        console.error('❌ Erro Crítico na Rota Hunt-Leads:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
