import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
    console.log('\n--- 📊 INICIANDO HUNT REPORT: DAILY RESULTS ---');
    try {
        const token = process.env.WOLF_SECRET_TOKEN;
        const resendKey = process.env.RESEND_API_KEY;
        const adminEmail = process.env.ADMIN_EMAIL;

        const { searchParams } = new URL(req.url);
        const passedToken = searchParams.get('token');

        if (!passedToken || passedToken !== token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- 🛡️ LÓGICA DE DATA BRASIL (UTC-3) ---
        const now = new Date();
        const brDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(now); // Retorna YYYY-MM-DD

        // Início do dia em BRT convertido para UTC: 03:00:00Z
        const startOfDayIso = `${brDate}T03:00:00.000Z`;
        // Fim do dia em BRT convertido para UTC: 02:59:59Z do dia seguinte
        const tomorrow = new Date(new Date(brDate).getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const endOfDayIso = `${tomorrowStr}T02:59:59.999Z`;

        console.log(`📈 Filtrando métricas entre ${startOfDayIso} e ${endOfDayIso}`);

        // 1. Count Pending (ALL-TIME)
        const { count: pendingCount } = await supabaseAdmin
            .from('leads_lobo')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // 2. Count Contacted (DAILY) - Tratamento de erro e fallback de Null
        const { count: contactedCount, error: contactedError } = await supabaseAdmin
            .from('leads_lobo')
            .select('*', { count: 'exact', head: true })
            .in('status', ['waiting_reply', 'lead_replied'])
            .gte('updated_at', startOfDayIso)
            .lte('updated_at', endOfDayIso);

        if (contactedError) console.error('❌ Erro na query Contacted:', contactedError.message);
        const safeContacted = contactedCount || 0;

        // 3. Count Invalid (DAILY)
        const { count: invalidCount } = await supabaseAdmin
            .from('leads_lobo')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'invalid')
            .gte('updated_at', startOfDayIso)
            .lte('updated_at', endOfDayIso);

        const safeInvalid = invalidCount || 0;

        // 4. Count Hunted (DAILY - Substituindo a Quarentena)
        // Representa todos os leads processados HOJE (deixaram de ser pending)
        const { count: huntedCount, error: huntedError } = await supabaseAdmin
            .from('leads_lobo')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'pending')
            .gte('updated_at', startOfDayIso)
            .lte('updated_at', endOfDayIso);

        if (huntedError) console.error('❌ Erro na query Hunted:', huntedError.message);
        const safeHunted = huntedCount || 0;

        // 5. Leads Recentes (Últimos 10 processados)
        const { data: recentLeads } = await supabaseAdmin
            .from('leads_lobo')
            .select('name, phone, status, updated_at')
            .neq('status', 'pending')
            .order('updated_at', { ascending: false })
            .limit(10);

        // --- GERAÇÃO DO HTML ---
        const dateHeader = new Date().toLocaleDateString('pt-BR');
        let leadsHtml = recentLeads?.length
            ? `<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background-color: #f4f4f4; text-align: left;">
                        <th style="padding: 10px; border-bottom: 2px solid #ddd; font-size: 14px;">Nome</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd; font-size: 14px;">Telefone</th>
                        <th style="padding: 10px; border-bottom: 2px solid #ddd; font-size: 14px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentLeads.map((lead: any) => `
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 14px;">${lead.name || 'Desconhecido'}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 14px;">${lead.phone || '-'}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <span style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #334155; text-transform: uppercase;">
                                    ${lead.status}
                                </span>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`
            : '<p style="color: #666; font-size: 14px; padding: 10px 0;">Nenhum lead processado hoje.</p>';

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #111; color: #fff; padding: 25px; text-align: center;">
                    <h2 style="margin: 0;">🐺 Hunt Report</h2>
                    <p style="margin: 5px 0 0 0; color: #aaa; font-size: 13px;">${dateHeader} - Daily Results</p>
                </div>
                <div style="padding: 30px;">
                    <div style="display: flex; justify-content: space-between; gap: 10px; text-align: center;">
                        <div style="background: #f0fdf4; padding: 15px 5px; border-radius: 8px; width: 23%; border: 1px solid #bbf7d0;">
                            <div style="font-size: 20px; font-weight: 800; color: #16a34a;">${safeContacted}</div>
                            <div style="font-size: 10px; color: #166534; text-transform: uppercase;">Contacted</div>
                        </div>
                        <div style="background: #f3e8ff; padding: 15px 5px; border-radius: 8px; width: 23%; border: 1px solid #d8b4fe;">
                            <div style="font-size: 20px; font-weight: 800; color: #7e22ce;">${safeHunted}</div>
                            <div style="font-size: 10px; color: #6b21a8; text-transform: uppercase;">Hunted</div>
                        </div>
                        <div style="background: #fff1f2; padding: 15px 5px; border-radius: 8px; width: 23%; border: 1px solid #fecdd3;">
                            <div style="font-size: 20px; font-weight: 800; color: #e11d48;">${safeInvalid}</div>
                            <div style="font-size: 10px; color: #9f1239; text-transform: uppercase;">Invalid</div>
                        </div>
                        <div style="background: #f8fafc; padding: 15px 5px; border-radius: 8px; width: 23%; border: 1px solid #e2e8f0;">
                            <div style="font-size: 20px; font-weight: 800; color: #64748b;">${pendingCount || 0}</div>
                            <div style="font-size: 10px; color: #475569; text-transform: uppercase;">Pending Queue</div>
                        </div>
                    </div>
                    <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; font-size: 18px; margin-top: 30px;">Atividade Recente</h3>
                    ${leadsHtml}
                </div>
            </div>`;

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'meatende.ai <onboarding@resend.dev>',
                to: [adminEmail],
                subject: `🐺 Hunt Report - ${dateHeader}`,
                html: htmlBody
            })
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('❌ Report Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) { return POST(req); }