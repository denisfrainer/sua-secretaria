import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
    console.log('\n--- 📊 INICIANDO REPORT CRON (EXECUTIVE DIGEST) ---');
    try {
        const token = process.env.WOLF_SECRET_TOKEN;
        const resendKey = process.env.RESEND_API_KEY;
        const adminEmail = process.env.ADMIN_EMAIL;

        // --- STEP 0: Security & URL Param validation for cron-job.org ---
        const { searchParams } = new URL(req.url);
        const passedToken = searchParams.get('token');

        if (!passedToken || passedToken !== token) {
            console.log('⚠️ Security check failed: Invalid or missing URL token.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!resendKey || !adminEmail) {
            console.error('❌ ERRO: RESEND_API_KEY ou ADMIN_EMAIL ausentes.');
            return NextResponse.json({ error: 'Missing email config' }, { status: 500 });
        }

        console.log('📈 Buscando métricas no Supabase...');

        // 1. Count Pending
        const { count: pendingCount } = await supabaseAdmin
            .from('leads_lobo')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // 2. Count Contacted / Processed
        const { count: contactedCount } = await supabaseAdmin
            .from('leads_lobo')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'contacted');

        // 3. Count Invalid
        const { count: invalidCount } = await supabaseAdmin
            .from('leads_lobo')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'invalid');

        // 4. Count Quarantine (Needs Human or Is Locked)
        const { count: quarantineCount } = await supabaseAdmin
            .from('leads_lobo')
            .select('*', { count: 'exact', head: true })
            .or('status.eq.needs_human,is_locked.eq.true');

        // 4. Fetch the last 10 leads contacted
        const { data: recentLeads, error: leadsError } = await supabaseAdmin
            .from('leads_lobo')
            .select('nome, name, telefone, phone, status, created_at')
            .neq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10);

        if (leadsError) {
            console.error('⚠️ Erro ao buscar leads recentes:', leadsError);
        }

        console.log(`✅ Métricas extraídas: Pending=${pendingCount}, Contacted=${contactedCount}, Invalid=${invalidCount}`);

        // Build HTML for recent leads
        const dateHeader = new Date().toLocaleDateString('pt-BR');
        
        let leadsHtml = '';
        if (recentLeads && recentLeads.length > 0) {
            leadsHtml = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <thead>
                        <tr style="background-color: #f4f4f4; text-align: left;">
                            <th style="padding: 10px; border-bottom: 2px solid #ddd; font-size: 14px;">Nome</th>
                            <th style="padding: 10px; border-bottom: 2px solid #ddd; font-size: 14px;">Telefone</th>
                            <th style="padding: 10px; border-bottom: 2px solid #ddd; font-size: 14px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recentLeads.map(lead => {
                            const displayName = lead.nome || lead.name || 'Desconhecido';
                            const displayPhone = lead.telefone || lead.phone || '-';
                            return `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 14px;">${displayName}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 14px;">${displayPhone}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                    <span style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #334155; text-transform: uppercase;">
                                        ${lead.status}
                                    </span>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } else {
            leadsHtml = '<p style="color: #666; font-size: 14px; padding: 10px 0;">Nenhum lead processado recentemente.</p>';
        }

        // Build Executive Dashboard HTML
        const htmlBody = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background-color: #111; color: #fff; padding: 25px; text-align: center;">
                    <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">🐺 Wolf Executive Digest</h2>
                    <p style="margin: 5px 0 0 0; color: #aaa; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">${dateHeader} - Daily Report</p>
                </div>
                
                <div style="padding: 30px;">
                    <h3 style="margin-top: 0; color: #111; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; font-size: 18px;">Daily Funnel Metrics</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 35px; text-align: center; gap: 10px;">
                        <div style="background: #f8fafc; padding: 20px 10px; border-radius: 8px; width: 23%; border: 1px solid #e2e8f0;">
                            <div style="font-size: 28px; font-weight: 800; color: #0284c7;">${pendingCount || 0}</div>
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 5px; font-weight: 600;">Pending</div>
                        </div>
                        <div style="background: #f8fafc; padding: 20px 10px; border-radius: 8px; width: 23%; border: 1px solid #e2e8f0;">
                            <div style="font-size: 28px; font-weight: 800; color: #16a34a;">${contactedCount || 0}</div>
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 5px; font-weight: 600;">Contacted</div>
                        </div>
                        <!-- New Quarantine metric addition -->
                        <div style="background: #fff1f2; padding: 20px 10px; border-radius: 8px; width: 23%; border: 1px solid #fecdd3;">
                            <div style="font-size: 28px; font-weight: 800; color: #e11d48;">${quarantineCount || 0}</div>
                            <div style="font-size: 11px; color: #9f1239; text-transform: uppercase; margin-top: 5px; font-weight: 600;">Quarantine</div>
                        </div>
                        <div style="background: #f8fafc; padding: 20px 10px; border-radius: 8px; width: 23%; border: 1px solid #e2e8f0;">
                            <div style="font-size: 28px; font-weight: 800; color: #dc2626;">${invalidCount || 0}</div>
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 5px; font-weight: 600;">Invalid</div>
                        </div>
                    </div>
                    
                    <h3 style="color: #111; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; font-size: 18px; margin-bottom: 5px;">Recent Activity (Top 10)</h3>
                    ${leadsHtml}
                </div>
                
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea; color: #94a3b8; font-size: 12px;">
                    Automated executive report generated by your Wolf Agent setup.
                </div>
            </div>
        `;

        // Dispatch via Resend
        console.log(`📧 Enviando Executive Digest para: ${adminEmail}`);
        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Wolf Agent <onboarding@resend.dev>',
                to: [adminEmail],
                subject: `🐺 Executive Digest - ${dateHeader}`,
                html: htmlBody
            })
        });
        
        if (resendRes.ok) {
            console.log('✅ Daily Report enviado com sucesso.');
            return NextResponse.json({ success: true, message: 'Report sent successfully' });
        } else {
            const errText = await resendRes.text();
            console.error('❌ Resend API falhou:', errText);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ Erro Crítico durante execução do Report Cron:', error);
        return NextResponse.json({ error: 'Report Cron execution failed' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return POST(req);
}
