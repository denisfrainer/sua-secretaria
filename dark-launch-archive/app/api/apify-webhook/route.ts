import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { cleanPhone } from '../../../lib/prospector/scraper';
import { error } from 'console';

// Fast-Lane Extractor
function extractFastLaneData(item: any): { phone: string | null, requiresSlowLane: boolean } {
    let phone = null;
    let requiresSlowLane = false;
    const urlsToScan = [];

    if (item.externalUrl) urlsToScan.push(item.externalUrl);
    if (Array.isArray(item.externalUrls)) {
        item.externalUrls.forEach((u: any) => {
            if (u.url) urlsToScan.push(u.url);
            if (u.lynx_url) urlsToScan.push(u.lynx_url);
        });
    }

    const waUrl = urlsToScan.find(url => url.includes('wa.me/') || url.includes('whatsapp.com/'));

    if (waUrl) {
        // Tenta extrair número direto da URL (ex: wa.me/554899999999)
        const match = waUrl.match(/(?:wa\.me\/|phone=)(\d{10,15})/);
        if (match) {
            phone = match[1];
        } else {
            // URL é tipo wa.me/message/HASH. Requer Slow-Lane (Puppeteer/Fetch) para resolver o redirect.
            requiresSlowLane = true;
        }
    } else if (item.biography) {
        requiresSlowLane = true;
    }

    return { phone, requiresSlowLane };
}

export async function POST(req: Request) {
    console.log('--- 🐺 PROCESSANDO DATASET APIFY (HYBRID B2B/B2C) ---');

    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token || token !== process.env.WOLF_SECRET_TOKEN) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        let items = [];

        // 🧪 BIFURCAÇÃO: TESTE LOCAL vs PRODUÇÃO APIFY
        if (Array.isArray(body)) {
            console.log('🧪 MODO LABORATÓRIO: Lendo dados diretos do payload local.');
            items = body;
        } else {
            const datasetId = body?.resource?.defaultDatasetId;
            if (!datasetId) return NextResponse.json({ error: 'Missing datasetId' }, { status: 400 });

            const apifyToken = process.env.APIFY_API_TOKEN;
            const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&token=${apifyToken}`;

            const apifyRes = await fetch(datasetUrl, { method: 'GET' });
            if (!apifyRes.ok) return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 });

            items = await apifyRes.json();
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ message: 'No items' }, { status: 200 });
        }

        const slowLaneQueue: any[] = [];

        const leadsToUpsert = items.map((item: any) => {
            const isInstagram = !!item.username || !!item.biography;

            let phone = null;
            let name = 'Lead Desconhecido';
            let niche = 'Negócio';
            let raw_bio_link = item.externalUrl || null;
            let source = 'google_maps';

            if (isInstagram) {
                source = 'instagram';
                name = item.fullName || item.username;
                niche = item.businessCategoryName || 'Instagram Lead';

                const { phone: fastPhone, requiresSlowLane } = extractFastLaneData(item);

                if (fastPhone) {
                    phone = cleanPhone(fastPhone);
                } else if (requiresSlowLane) {
                    slowLaneQueue.push(item);
                    return null; // Ignora o upsert direto, será processado pelo Gemini/QStash
                } else {
                    return null; // Sem telefone e sem indícios na bio/link
                }
            } else {
                // Lógica original do Google Maps
                const rawPhone = item.phone || item.phoneNumber || item.phoneUnformatted;
                if (rawPhone) phone = cleanPhone(rawPhone);
                name = item.title || 'Lead Desconhecido';
                niche = item.categoryName || item.category || 'Negócio';
            }

            if (!phone || phone.length < 12) return null;

            return {
                phone,
                name,
                niche,
                city: item.city || '',
                website: item.website || raw_bio_link || null,
                score: item.totalScore || null,
                reviews_count: item.reviewsCount || item.followersCount || null,
                maps_url: item.url || (item.username ? `https://instagram.com/${item.username}` : null),
                status: 'pending',
                updated_at: new Date().toISOString()
            };
        }).filter(Boolean);

        // ... depois do seu map e filter(Boolean)

        // 🛡️ 1. REMOVER DUPLICADAS E FILTRAR NULLS
        const uniqueLeads = Array.from(
            new Map(
                leadsToUpsert
                    .filter((lead): lead is NonNullable<typeof lead> => lead !== null)
                    .map(lead => [lead.phone, lead])
            ).values()
        );

        if (uniqueLeads.length === 0 && slowLaneQueue.length === 0) {
            return NextResponse.json({ message: 'Nenhum lead válido encontrado.' });
        }

        // 🛡️ 2. ÚNICO UPSERT NO BANCO DE DADOS
        if (uniqueLeads.length > 0) {
            const { error: upsertError } = await supabaseAdmin
                .from('leads_lobo')
                .upsert(uniqueLeads, {
                    onConflict: 'phone',
                    ignoreDuplicates: false
                });

            if (upsertError) {
                console.error('❌ Erro no Bulk Upsert:', upsertError.message);
                return NextResponse.json({ error: upsertError.message }, { status: 500 });
            }
        }

        // 🛡️ 3. FILA SLOW-LANE (OPCIONAL)
        if (slowLaneQueue.length > 0) {
            console.log(`⏳ Enviando ${slowLaneQueue.length} leads para a fila Slow-Lane...`);
            // Implementação futura do QStash aqui
        }

        console.log(`🏁 🐺 CAÇADA FINALIZADA: ${uniqueLeads.length} leads salvos.`);
        return NextResponse.json({
            status: 'success',
            fastLaneCount: uniqueLeads.length,
            slowLaneCount: slowLaneQueue.length
        });

    } catch (err) {
        console.error('❌ Erro Crítico:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}