import { NextResponse } from 'next/server';

// Optional: Netlify's Next.js adapter standard for scheduling
export const config = { schedule: "0 21 * * 1-5" };

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

        let leadsCount = responseData.leadsCount || 0;
        let jobStatus = responseData.status || (response.ok ? 'Operation Completed Successfully' : 'Operation Failed');

        // Email logic via Resend
        const adminEmail = process.env.ADMIN_EMAIL;
        const resendKey = process.env.RESEND_API_KEY;

        if (adminEmail && resendKey) {
            try {
                const dateHeader = new Date().toLocaleDateString('pt-BR');
                const htmlBody = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2>Wolf Agent Daily Summary</h2>
                        <p><strong>Execution Time:</strong> 18:00 BRT</p>
                        <p><strong>Leads Contacted Today:</strong> ${leadsCount}</p>
                        <p><strong>Status:</strong> ${jobStatus}</p>
                        <p><em>All messages were sent via Evolution API v2.</em></p>
                        <hr />
                        <p style="font-size: 12px; color: #666;">This is an automated report from your Wolf Agent.</p>
                    </div>
                `;

                // Fire fetch to Resend
                const resendRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Wolf Agent <onboarding@resend.dev>',
                        to: [adminEmail],
                        subject: `🐺 Wolf Report: Daily Results - ${dateHeader}`,
                        html: htmlBody
                    })
                });
                
                if (resendRes.ok) {
                    console.log('📧 Relatório por email enviado com sucesso.');
                } else {
                    console.error('❌ Resend API rejeitou o email:', await resendRes.text());
                }
            } catch (emailErr) {
                console.error('❌ Erro no envio do email de relatório (não fatal):', emailErr);
            }
        } else {
            console.log('⚠️ ADMIN_EMAIL ou RESEND_API_KEY ausente no .env. Relatório não enviado.');
        }

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
