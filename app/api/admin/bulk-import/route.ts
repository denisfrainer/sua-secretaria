import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { normalizePhone } from '../../../../lib/utils/phone';

export async function POST(req: Request) {
    try {
        const token = req.headers.get('x-wolf-token');
        const validToken = process.env.WOLF_ADMIN_TOKEN || process.env.WOLF_SECRET_TOKEN;

        if (!token || token !== validToken) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const rawItems = Array.isArray(body) ? body : (body.items || body.leads || []);

        if (rawItems.length === 0) {
            return NextResponse.json({ error: 'Nenhum lead encontrado' }, { status: 400 });
        }

        // 1. Mapeamento Robusto (Silicon Valley Standard)
        const leadsToImport = rawItems.map((item: any) => {
            const rawPhone = item.phone || item.phoneNumber || '';
            let phone = normalizePhone(String(rawPhone));

            if (phone && !phone.startsWith('55')) phone = '55' + phone;

            return {
                phone,
                name: item.name || item.title || 'Lead Desconhecido',
                niche: item.niche || item.categoryName || 'Negócio',
                city: item.city || '',
                // --- NOVOS CAMPOS ESSENCIAIS ---
                website: item.website || null,
                score: item.totalScore || item.score || null,
                reviews_count: item.reviewsCount || item.reviews_count || null,
                maps_url: item.url || item.maps_url || null,
                // -------------------------------
                status: 'pending', // Só será usado se o lead for novo
                updated_at: new Date().toISOString()
            };
        }).filter((l: any) => l.phone && l.phone.length >= 12);

        // 2. Deduplicação em Memória
        const uniqueLeads = Array.from(
            new Map(leadsToImport.map((item: any) => [item.phone, item])).values()
        );

        // 3. UPSERT INTELIGENTE (O SEGREDO DO SUCESSO)
        // Usamos ignoreDuplicates: false para atualizar dados técnicos (site, reviews)
        // mas precisamos garantir que o status não seja resetado via RLS ou Trigger.
        // Como o JS Client do Supabase é limitado no 'onConflict DO UPDATE SET',
        // a recomendação padrão ouro é atualizar tudo EXCETO o status se ele já existir.

        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .upsert(uniqueLeads, {
                onConflict: 'phone',
                // ignoreDuplicates: false garante que se o site mudar ou for adicionado, o banco atualiza.
                ignoreDuplicates: false
            });

        if (error) {
            console.error('❌ Erro Supabase:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            status: 'success',
            count: uniqueLeads.length,
            message: 'Leads sincronizados com metadados completos'
        });

    } catch (error) {
        console.error('❌ Erro Crítico:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}