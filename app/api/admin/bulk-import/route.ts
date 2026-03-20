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
        
        // Handle both raw JSON objects and arrays of leads
        const rawItems = Array.isArray(body) ? body : (body.items || body.leads || []);

        if (rawItems.length === 0) {
            return NextResponse.json({ error: 'Nenhum lead encontrado no payload' }, { status: 400 });
        }

        // 1. Process and Map to English Schema
        const leadsToImport = rawItems.map((item: any) => {
            // Flexible extraction for either Apify raw outputs or pre-mapped objects
            const rawPhone = item.phone || item.phoneNumber || item.phoneUnformatted || '';
            let phone = normalizePhone(String(rawPhone));
            
            // Standardize brazilian formatting if missing country code
            if (phone && !phone.startsWith('55')) {
                phone = '55' + phone;
            }

            const name = item.name || item.title || 'Lead Desconhecido';
            const niche = item.niche || item.categoryName || item.categories?.[0] || 'Desconhecido';
            const city = item.city || item.address?.split(',')?.pop()?.trim() || '';

            return {
                name,
                phone,
                niche,
                city,
                status: 'pending',
                main_pain: null,
                revenue: null,
                updated_at: new Date().toISOString()
            };
        }).filter((lead: any) => lead.phone && lead.phone.length >= 10); // Strip entirely invalid empty phones

        if (leadsToImport.length === 0) {
            return NextResponse.json({ error: 'Todos os leads ausentam números de telefone válidos' }, { status: 400 });
        }

        // 2. NEW: Deduplicate by phone before upserting
        const uniqueLeads = Array.from(
            new Map(leadsToImport.map((item: any) => [item.phone, item])).values()
        );

        console.log(`🧹 Deduplicação: De ${leadsToImport.length} para ${uniqueLeads.length} leads únicos.`);

        // 3. Safe Upsert to prevent duplicate spam (onConflict: 'phone')
        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .upsert(uniqueLeads, { onConflict: 'phone' });

        if (error) {
            console.error('❌ Erro Supabase no Bulk Import:', error.message);
            return NextResponse.json({ error: 'Database bulk insert failed' }, { status: 500 });
        }

        console.log(`✅ Bulk Import Concluído: ${uniqueLeads.length} leads processados para o Lobo.`);
        
        return NextResponse.json({ 
            status: 'success', 
            importedCount: uniqueLeads.length,
            message: 'Leads importados e mesclados com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro Crítico na rota de Bulk Import:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
