import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
    console.log('\n--- 👻 REQUISIÇÃO RECEBIDA NO GHOST HUNTER ---');
    try {
        // 1. Security Check
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.WOLF_ADMIN_TOKEN) {
            console.log('⚠️ Token inválido ou ausente:', token);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. The 48-Hour Logic (Supabase)
        const deadline = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        
        console.log(`📥 Buscando leads fantasma na tabela leads_lobo com limite anterior a ${deadline}...`);
        const { data: leadsToFollowUp, error } = await supabaseAdmin
            .from('leads_lobo')
            .select('*')
            .eq('status', 'contacted')
            .lte('updated_at', deadline)
            .limit(3);

        if (error) {
            console.error('❌ Erro Db:', error);
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
        }

        if (!leadsToFollowUp || leadsToFollowUp.length === 0) {
            console.log('💤 Nenhum lead necessitando follow-up agora (0 encontrados).');
            return NextResponse.json({ status: 'success', message: 'No ghost leads found' }, { status: 200 });
        }

        console.log(`👻 GHOST HUNTER ATIVADO: ${leadsToFollowUp.length} leads na mira.`);

        // 4. Execution & Status Update Loop
        for (const lead of leadsToFollowUp) {
            if (!lead.phone) continue;

            const nameLower = (lead.name || '').toLowerCase();
            const rawName = nameLower && !nameLower.includes('lead') && !nameLower.includes('desconhecido') && !nameLower.includes('sem nome')
                ? lead.name.split(' ')[0]
                : '';
            
            const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase() : '';
            const displayName = firstName ? ` ${firstName}` : '';

            const variations = [
                `Olá${displayName}, tudo bem? Conseguiste ver a minha mensagem acima?`,
                `${firstName ? firstName + ', p' : 'P'}assando só para reavivar o contacto. Teria disponibilidade para uma breve troca de ideias esta semana?`,
                `Boas${displayName}! Sei que a rotina deve estar corrida. Apenas a confirmar se recebeste a minha mensagem anterior.`,
                `Olá${displayName}. Imagino que a caixa de mensagens esteja cheia, mas não queria deixar passar. Ainda faz sentido falarmos?`
            ];

            const message = variations[Math.floor(Math.random() * variations.length)];
            
            // Wait 2 to 5 seconds
            const delay = Math.floor(Math.random() * 3000) + 2000;
            console.log(`⏳ Aguardando ${delay/1000}s para reengajar ${lead.name || 'Desconhecido'}...`);
            await sleep(delay);

            try {
                // Call Evolution API
                await sendWhatsAppMessage(lead.phone, message);
                
                // CRITICAL: Update the lead's status in Supabase so they move on Kanban and escape the loop
                await supabaseAdmin
                    .from('leads_lobo')
                    .update({ status: 'follow_up' }) // Moved natively to 'follow_up'
                    .eq('id', lead.id);

                console.log(`👻 Ghost Hunter: Follow-up enviado para ${lead.name || 'Desconhecido'}`);
                
            } catch (err) {
                console.error(`❌ Ghost Hunter falhou com ${lead.name}:`, err);
            }
        }

        console.log(`🏁 GHOST HUNTER FINALIZOU O PROCESSO!`);
        return NextResponse.json({ status: 'follow-ups finished', processed: leadsToFollowUp.length });

    } catch (error) {
        console.error('❌ Erro Crítico roteando o Ghost Hunter:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
