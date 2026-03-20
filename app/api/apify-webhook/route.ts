import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { cleanPhone } from '../../../lib/prospector/scraper';

export async function POST(req: Request) {
    console.log('--- 🐺 REQUISIÇÃO RECEBIDA NO WEBHOOK APIFY ---');
    
    try {
        // 1. Validar Token de Segurança na Query String
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token || token !== process.env.WOLF_SECRET_TOKEN) {
            console.log('⚠️ Apify Webhook Token inválido ou ausente:', token);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Parse payload do evento
        const body = await req.json();
        console.log('📦 Webhook event payload:', JSON.stringify(body, null, 2));

        const datasetId = body?.eventData?.datasetId;

        if (!datasetId) {
            console.log('⚠️ Dataset ID não encontrado no payload do webhook');
            return NextResponse.json({ error: 'Missing datasetId' }, { status: 400 });
        }

        const apifyToken = process.env.APIFY_API_TOKEN;
        if (!apifyToken) {
            console.error('❌ ERRO: APIFY_API_TOKEN não definido no ambiente.');
            return NextResponse.json({ error: 'Missing Apify API token' }, { status: 500 });
        }

        // 3. Buscar os Leads Raspados no Dataset
        console.log(`🐺 Buscando resultados do dataset Apify: ${datasetId}`);
        const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`;
        
        const apifyRes = await fetch(datasetUrl, { method: 'GET' });
        
        if (!apifyRes.ok) {
            console.error(`❌ Falha ao buscar dataset do Apify (Status ${apifyRes.status})`);
            return NextResponse.json({ error: 'Failed to fetch dataset from Apify' }, { status: 500 });
        }

        const items = await apifyRes.json();
        console.log(`✅ Apify Webhook extraiu ${items.length || 0} locais.`);

        if (!Array.isArray(items) || items.length === 0) {
            console.log('Nenhum lead processável ou resultado recebido do Apify.');
            return NextResponse.json({ status: 'success', message: 'No items to process' }, { status: 200 });
        }

        // 4. Transformar e Salvar no Supabase
        let insertedCount = 0;

        for (const item of items) {
            const rawPhone = item.phone || item.phoneNumber || item.phoneUnformatted;

            if (!rawPhone) {
                console.log(`⚠️ Ignorando lead sem telefone (${item.title || 'Desconhecido'})`);
                continue;
            }

            const phone = cleanPhone(rawPhone);
            // Ignore small phone instances
            if (phone.length < 12) continue;

            // Mapeamento: title -> name, categoryName -> niche, city -> city
            const name = item.title || 'Lead Desconhecido';
            const niche = item.categoryName || item.category || 'Desconhecido';
            const city = item.city || item.address?.split(',')?.pop()?.trim() || '';

            // Upsert onto Supabase using the 'phone' unique key exactly as specified
            const { error } = await supabaseAdmin.from('leads_lobo').upsert(
                {
                    phone,
                    name,
                    niche,
                    city,
                    status: 'pending'
                },
                { onConflict: 'phone' }
            );

            if (error) {
                console.error(`❌ Erro no upsert do BD (${name} - ${phone}):`, error.message);
            } else {
                insertedCount++;
            }
        }

        console.log(`🏁 🐺 CAÇADA ASSÍNCRONA WEBHOOK FINALIZADA: ${insertedCount} leads únicos gravados com sucesso!`);
        return NextResponse.json({ status: 'success', insertedCount });

    } catch (err) {
        console.error('❌ Erro Crítico na Rota Apify-Webhook:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
