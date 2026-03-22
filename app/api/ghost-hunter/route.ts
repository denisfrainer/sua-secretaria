import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { normalizePhone } from '../../../lib/utils/phone';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
    console.log('\n--- 👻 REQUISIÇÃO RECEBIDA NO GHOST HUNTER ---');

    // 🔴 GLOBAL KILL SWITCH CHECK
    const { data: killSwitchData } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'global_kill_switch')
        .single();

    if (killSwitchData && killSwitchData.value?.enabled === false) {
        console.log(`[KILL SWITCH] System disabled. Execution blocked.`);
        return NextResponse.json({ status: 'system_paused' }, { status: 200 });
    }

    try {
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.ADMIN_SECRET_PASSWORD) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const deadline = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        // 1. O LOCK: Puxa os IDs e já marca como 'processing' para evitar duplicidade de CRON
        const { data: leadsToLock, error: lockError } = await supabaseAdmin
            .from('leads_lobo')
            .select('id, phone, name')
            .eq('status', 'contacted')
            .eq('replied', false)
            .lte('updated_at', deadline)
            .limit(3);

        if (lockError) throw lockError;

        if (!leadsToLock || leadsToLock.length === 0) {
            console.log('💤 Nenhum lead fantasma encontrado.');
            return NextResponse.json({ status: 'success', message: 'No ghost leads found' }, { status: 200 });
        }

        // Trava os leads no banco imediatamente
        const leadIds = leadsToLock.map(l => l.id);
        await supabaseAdmin
            .from('leads_lobo')
            .update({ status: 'processing_ghost' })
            .in('id', leadIds);

        console.log(`👻 GHOST HUNTER ATIVADO: ${leadsToLock.length} leads travados para disparo.`);

        // 2. O LOOP SÍNCRONO: Evita estourar memória e respeita o rate limit do WhatsApp
        for (let i = 0; i < leadsToLock.length; i++) {
            const lead = leadsToLock[i];
            if (!lead.phone) continue;

            const normalizedPhone = normalizePhone(lead.phone);
            const nameLower = (lead.name || '').toLowerCase();
            const rawName = nameLower && !nameLower.includes('lead') && !nameLower.includes('desconhecido')
                ? lead.name.split(' ')[0]
                : '';
            const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase() : '';
            const displayName = firstName ? ` ${firstName}` : '';

            const variations = [
                `Opa${displayName}, imaginei que a mensagem pudesse ter ficado perdida por aí rs. Ainda faz sentido a gente trocar uma ideia?`,
                `${firstName ? firstName + ', ' : ''}só passando pra ver se recebeu minha msg anterior. Sem pressa nenhuma!`,
                `Fala${displayName}! Sei que a rotina é corrida. Só queria confirmar se chegou a ver minha mensagem.`,
                `Oi${displayName}, tudo bem? Minha mensagem pode ter ido parar no limbo do WhatsApp rs. Ainda tem interesse em conversar?`,
            ];

            const message = variations[Math.floor(Math.random() * variations.length)];

            if (i > 0) {
                console.log(`⏳ Aguardando 2s (Proteção Anti-Ban Meta)...`);
                await sleep(2000);
            }

            try {
                // TENTA ENVIAR PRIMEIRO
                await sendWhatsAppMessage(normalizedPhone, message);
                console.log(`✅ Follow-up enviado para ${lead.name || 'Desconhecido'}`);

                // SE DEU CERTO, ATUALIZA PARA FOLLOW_UP
                await supabaseAdmin
                    .from('leads_lobo')
                    .update({ status: 'follow_up', updated_at: new Date().toISOString() })
                    .eq('id', lead.id);

            } catch (err: any) {
                const errorBody = err.message || '';
                if (errorBody.includes('"exists":false')) {
                    console.log(`🚫 ${lead.name} sem WhatsApp. Marcando como inválido.`);
                    await supabaseAdmin.from('leads_lobo').update({ status: 'invalid' }).eq('id', lead.id);
                } else {
                    console.error(`❌ Falha ao enviar para ${lead.name}. Revertendo status para tentar de novo no próximo Cron.`);
                    // SE DEU ERRO DE REDE, DEVOLVE PARA CONTACTED (O cara não fica no limbo)
                    await supabaseAdmin.from('leads_lobo').update({ status: 'contacted' }).eq('id', lead.id);
                }
            }
        }

        console.log(`🏁 GHOST HUNTER FINALIZOU O PROCESSO!`);
        return NextResponse.json({ status: 'follow-ups finished', processed: leadsToLock.length });

    } catch (error) {
        console.error('❌ Erro Crítico:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return POST(req);
}