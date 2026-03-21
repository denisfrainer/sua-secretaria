import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { normalizePhone } from '../../../lib/utils/phone';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
    console.log('\n--- 👻 REQUISIÇÃO RECEBIDA NO GHOST HUNTER ---');
    try {
        // 1. Security Check
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.ADMIN_SECRET_PASSWORD) {
            console.log('⚠️ Token inválido ou ausente:', token);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. The 48-Hour Logic (Supabase)
        const deadline = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        console.log(`📥 Buscando leads fantasma (sem resposta) com limite anterior a ${deadline}...`);
        const { data: leadsToFollowUp, error } = await supabaseAdmin
            .from('leads_lobo')
            .select('*')
            .eq('status', 'contacted')
            .eq('replied', false)
            .lte('updated_at', deadline)
            .limit(3); // Mantido em 3 para não estourar o limite de tempo do Serverless

        if (error) {
            console.error('❌ Erro Db:', error);
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
        }

        if (!leadsToFollowUp || leadsToFollowUp.length === 0) {
            console.log('💤 Nenhum lead fantasma encontrado (todos responderam ou fora do prazo).');
            return NextResponse.json({ status: 'success', message: 'No ghost leads found' }, { status: 200 });
        }

        console.log(`👻 GHOST HUNTER ATIVADO: ${leadsToFollowUp.length} leads na mira.`);

        // 3. Execution (Parallel Processing para evitar Serverless Timeout)
        const followUpPromises = leadsToFollowUp.map(async (lead, index) => {
            if (!lead.phone) return;

            const normalizedPhone = normalizePhone(lead.phone);

            const nameLower = (lead.name || '').toLowerCase();
            const rawName = nameLower && !nameLower.includes('lead') && !nameLower.includes('desconhecido') && !nameLower.includes('sem nome')
                ? lead.name.split(' ')[0]
                : '';

            const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase() : '';
            // Gramática Padrão Ouro: Se tem nome, põe espaço. Se não tem, vazio.
            const displayName = firstName ? ` ${firstName}` : '';

            // 🎯 Low-pressure "lost message" copywriting
            const variations = [
                `Opa${displayName}, imaginei que a mensagem pudesse ter ficado perdida por aí rs. Ainda faz sentido a gente trocar uma ideia?`,
                `${firstName ? firstName + ', ' : ''}só passando pra ver se recebeu minha msg anterior. Sem pressa nenhuma!`,
                `Fala${displayName}! Sei que a rotina é corrida. Só queria confirmar se chegou a ver minha mensagem.`,
                `Oi${displayName}, tudo bem? Minha mensagem pode ter ido parar no limbo do WhatsApp rs. Ainda tem interesse em conversar?`,
            ];

            const message = variations[Math.floor(Math.random() * variations.length)];

            // Staggering (Cascata) para não bater limite de API do WhatsApp
            // Lead 1 manda agora, Lead 2 manda em 2s, Lead 3 manda em 4s
            const delay = index * 2000;
            if (delay > 0) {
                console.log(`⏳ Aguardando ${delay / 1000}s para reengajar ${lead.name || 'Desconhecido'}...`);
                await sleep(delay);
            }

            try {
                // Primeiro atualiza o banco (Garante que se falhar o envio, ele não fica preso num loop infinito de tentativas amanhã)
                await supabaseAdmin
                    .from('leads_lobo')
                    .update({ status: 'follow_up' })
                    .eq('id', lead.id);

                await sendWhatsAppMessage(normalizedPhone, message);
                console.log(`👻 Ghost Hunter: Follow-up enviado com sucesso para ${lead.name || 'Desconhecido'}`);

            } catch (err: any) {
                const errorBody = err.message || '';
                if (errorBody.includes('"exists":false')) {
                    console.log(`🚫 Ghost Hunter: ${lead.name} sem WhatsApp. Marcando como inválido.`);
                    await supabaseAdmin.from('leads_lobo').update({ status: 'invalid' }).eq('id', lead.id);
                } else {
                    console.error(`❌ Ghost Hunter falhou com ${lead.name}:`, err);
                }
            }
        });

        // Espera todos os disparos paralelos terminarem
        await Promise.all(followUpPromises);

        console.log(`🏁 GHOST HUNTER FINALIZOU O PROCESSO!`);
        return NextResponse.json({ status: 'follow-ups finished', processed: leadsToFollowUp.length });

    } catch (error) {
        console.error('❌ Erro Crítico roteando o Ghost Hunter:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// 🧪 GET support for browser testing
export async function GET(req: Request) {
    return POST(req);
}