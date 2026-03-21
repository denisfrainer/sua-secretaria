import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { cleanPhone } from '../../../lib/prospector/scraper';

export async function POST(req: Request) {
    console.log('--- 🐺 PROCESSANDO DATASET APIFY (BULK MODE) ---');

    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token || token !== process.env.WOLF_SECRET_TOKEN) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const datasetId = body?.resource?.defaultDatasetId;

        if (!datasetId) {
            return NextResponse.json({ error: 'Missing datasetId' }, { status: 400 });
        }

        const apifyToken = process.env.APIFY_API_TOKEN;
        const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`;

        const apifyRes = await fetch(datasetUrl, { method: 'GET' });
        if (!apifyRes.ok) return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 });

        const items = await apifyRes.json();

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ message: 'No items' }, { status: 200 });
        }

        // 1. Mapeamento e Limpeza em Massa
        const leadsToUpsert = items
            .map((item: any) => {
                const rawPhone = item.phone || item.phoneNumber || item.phoneUnformatted;
                if (!rawPhone) return null;

                const phone = cleanPhone(rawPhone);
                if (phone.length < 12) return null;

                return {
                    phone,
                    name: item.title || 'Lead Desconhecido',
                    niche: item.categoryName || item.category || 'Negócio',
                    city: item.city || '',
                    website: item.website || null, // CRUCIAL para a bifurcação do Lobo
                    score: item.totalScore || null,
                    reviews_count: item.reviewsCount || null,
                    maps_url: item.url || null,
                    status: 'pending', // Valor inicial para novos leads
                    updated_at: new Date().toISOString()
                };
            })
            .filter(Boolean); // Remove os nulos

        if (leadsToUpsert.length === 0) {
            return NextResponse.json({ message: 'No valid leads found' });
        }

        // 2. Bulk Upsert no Supabase
        // Usamos ignoreDuplicates: false para atualizar dados de leads existentes, 
        // mas você pode querer proteger o 'status' se ele já for 'contacted'.
        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .upsert(leadsToUpsert, {
                onConflict: 'phone',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('❌ Erro no Bulk Upsert:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`🏁 🐺 CAÇADA FINALIZADA: ${leadsToUpsert.length} leads processados.`);
        return NextResponse.json({ status: 'success', count: leadsToUpsert.length });

    } catch (err) {
        console.error('❌ Erro Crítico:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}