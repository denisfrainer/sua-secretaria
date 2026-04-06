import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { checkWhatsAppNumber } from '../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { normalizePhone } from '../../../lib/utils/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseSpintax(text: string): string {
    const matches = text.match(/\{([^{}]+)\}/g);
    if (!matches) return text;
    let result = text;
    for (const match of matches) {
        const options = match.slice(1, -1).split('|');
        const choice = options[Math.floor(Math.random() * options.length)];
        result = result.replace(match, choice);
    }
    if (result.includes('{') && result.includes('}')) return parseSpintax(result);
    return result;
}

function getBrazilDateString(): string {
    const now = new Date();
    const brTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return brTime.toISOString().split('T')[0];
}

export async function POST(req: Request) {
    const cronId = Math.random().toString(36).substring(7);
    console.log(`\n--- 🐺 [${cronId}] WOLF AGENT PROSPECTOR ---`);

    try {
        // 1. Authentication
        const token = req.headers.get('x-wolf-token');
        const isCron = req.headers.get('x-netlify-cron'); // Optional Netlify Cron Header
        const validToken = process.env.ADMIN_SECRET_PASSWORD;

        if (!isCron && token !== validToken) {
            console.error(`❌ [${cronId}] Unauthorized access attempt.`);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 🐺 FEATURE FLAG: LOBO KILL SWITCH
        const { data: loboSwitch } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'lobo_active')
            .single();

        if (loboSwitch && loboSwitch.value?.enabled === false) {
            console.log(`🛑 [FEATURE FLAG] Lobo Prospector DESLIGADO no painel. Abortando prospecção.`);
            return NextResponse.json({ status: 'lobo_paused' }, { status: 200 });
        }

        // 3. Time/Day Shield (BR Time)
        const currentHourBR = new Date().getUTCHours() - 3;
        const localHour = currentHourBR < 0 ? currentHourBR + 24 : currentHourBR;
        const now = new Date();
        const brasilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const dayOfWeek = brasilTime.getDay(); // 0 = Domingo, 6 = Sábado

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            console.log(`💤 [${cronId}] Fim de semana. O Lobo está descansando.`);
            return NextResponse.json({ status: 'ignored', reason: 'weekend' }, { status: 200 });
        }

        if (localHour < 8 || localHour >= 18) {
            console.log(`🌙 [${cronId}] Fora do horário comercial (${localHour}h). O Lobo está dormindo.`);
            return NextResponse.json({ status: 'sleeping' }, { status: 200 });
        }

        // 4. Daily Quota Shield (Crucial)
        const todayStr = getBrazilDateString();
        const { data: statsData } = await supabaseAdmin
            .from('lobo_daily_stats')
            .select('*')
            .eq('date_id', todayStr)
            .single();

        let currentStats = statsData;

        if (!currentStats) {
            const randomDailyLimit = Math.floor(Math.random() * (50 - 45 + 1)) + 45; // 45 to 50
            const { data: newStats, error: insertError } = await supabaseAdmin
                .from('lobo_daily_stats')
                .insert([{ date_id: todayStr, sent_count: 0, daily_limit: randomDailyLimit }])
                .select()
                .single();

            if (!insertError) {
                currentStats = newStats;
            }
        }

        if (currentStats && currentStats.sent_count >= currentStats.daily_limit) {
            console.log(`🛑 [${cronId}] [LIMIT REACHED] Lobo rests for the day (Sent: ${currentStats.sent_count}/${currentStats.daily_limit})`);
            return NextResponse.json({ status: 'limit_reached', message: 'Daily limit completely reached.' }, { status: 200 });
        }

        // 5. Stealth Pacing Shield
        const { data: huntSetting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'next_hunt_at')
            .single();

        const nextHuntAt = huntSetting?.value?.timestamp;

        if (nextHuntAt) {
            const nextHuntTime = new Date(nextHuntAt).getTime();
            if (!isNaN(nextHuntTime) && Date.now() < nextHuntTime) {
                const remainingMin = Math.ceil((nextHuntTime - Date.now()) / 60000);
                console.log(`😴 [${cronId}] STEALTH MODE: Dormindo. Próxima caçada em ~${remainingMin} min (${nextHuntAt})`);
                return NextResponse.json({ status: 'waiting_for_cooldown', remaining_minutes: remainingMin }, { status: 200 });
            }
        }

        // 6. Lead Fetching (Fila Transacional)
        // O RPC 'get_next_outreach_lead' localiza o próximo 'cold_lead', altera o status para 
        // 'outreach_processing' (bloqueando a Eliza e outros crons) e retorna o dado.
        const { data: leads, error: leadsError } = await supabaseAdmin.rpc('get_next_outreach_lead');

        // Filtro local para pular nomes inválidos (opcional, já que o DB deve estar limpo)
        if (leads && leads.length > 0) {
            const invalidNames = ['Lead Teste', 'Sem Nome'];
            if (invalidNames.includes(leads[0].name)) {
                await supabaseAdmin.from('leads_lobo').update({ status: 'invalid' }).eq('id', leads[0].id);
                console.log(`🗑️ [${cronId}] Nome inválido descartado.`);
                return NextResponse.json({ status: 'invalid_name_skipped' }, { status: 200 });
            }
        }

        if (leadsError || !leads || leads.length === 0) {
            console.log(`💤 [${cronId}] Nenhum lead pendente encontrado.`);
            return NextResponse.json({ status: 'empty', message: 'No pending leads found' }, { status: 200 });
        }

        // 7. Processamento e Disparo (The Hunting Loop & 2-Bubble Strike)
        let successLead: string | null = null;
        let invalidCount = 0;
        const saudacao = localHour < 12 ? 'Bom dia' : 'Boa tarde';

        for (const lead of leads) {
            if (!lead.phone || !lead.name) continue;

            const safePhone = normalizePhone(lead.phone);

            // 2. Verificação Silenciosa (Number Check)
            // Você precisará criar esta função no seu arquivo sender.ts
            // 2. Verificação Silenciosa (Number Check)
            const hasWhatsApp = await checkWhatsAppNumber(safePhone);

            if (!hasWhatsApp) {
                console.log(`🚫 [${cronId}] O número ${safePhone} (${lead.name}) não possui WhatsApp ativo. Descartado.`);
                invalidCount++;

                if (lead.id) {
                    await supabaseAdmin.from('leads_lobo').update({ status: 'invalid' }).eq('id', lead.id);
                }

                // --- 🛡️ ANTI-BAN SHIELD (Jitter) ---
                // Pausa aleatória entre 3.5s e 7s para não alertar o firewall do Meta
                const microSleep = Math.floor(Math.random() * (7000 - 3500 + 1)) + 3500;
                console.log(`🛡️ [ANTI-BAN] Número inválido. Pausando ${microSleep / 1000}s para simular comportamento humano no Meta...`);
                await sleep(microSleep);

                // SILICON TWEAK: Pula para o próximo sem gastar cota diária ou hibernar por horas.
                continue;
            }

            // --- 🎯 LETHAL STRIKE: AI AGENT PITCH ---
            const variationsAI = [
                {
                    part1: `${saudacao}, tudo bem? Me chamo Denis, sou desenvolvedor aqui de Floripa.`,
                    part2: `Vocês trabalham com algum sistema de agendamento atualmente?`
                },
                {
                    part1: `${saudacao} pessoal, tudo certo? Me chamo Denis, sou desenvolvedor aqui da Lagoa da Conceição.`,
                    part2: `Vocês já utilizam algum sistema para agendar os clientes atualmente?`
                },
                {
                    part1: `{Fala|Opa|Oi|Olá}, ${saudacao}! Tudo bem? Me chamo Denis, sou desenvolvedor de software residente em Florianópolis.`,
                    part2: `Como vocês gerenciam os agendamentos hoje? É tudo manual ou tem alguma agenda específica pra isso?`
                },
                {
                    part1: `{Fala|Opa|Oi|Olá}, ${saudacao}! Tranquilo?`,
                    part2: `Vocês já cogitaram ter um sistema de agendamento automático aqui pelo WhatsApp?`
                },
                {
                    part1: `${saudacao}, tudo bem? Me chamo Denis, sou desenvolvedor aqui de Floripa.`,
                    part2: `Como funciona o sistema de agendamento de vocês atualmente?`
                }
            ];

            let activeVariations = variationsAI;

            const selectedIndex = Math.floor(Math.random() * activeVariations.length);
            const variation = activeVariations[selectedIndex];

            const msg1 = parseSpintax(variation.part1);
            const msg2 = parseSpintax(variation.part2);

            // --- OBSERVABILITY LOGGING ---
            console.log(`⚙️ [PAYLOAD_GENERATION] Hook selected: AI Agent Outreach`);
            console.log(`📊 [PAYLOAD_DATA] Variation Index: ${selectedIndex}`);
            console.log(`💬 [PAYLOAD_DISPATCH] Bubble 1: "${msg1}"`);
            console.log(`💬 [PAYLOAD_DISPATCH] Bubble 2: "${msg2}"`);

            try {
                console.log(`📤 [${cronId}] Tentando enviar (2 bubbles) para ${lead.name} (${safePhone})...`);

                await sendWhatsAppMessage(safePhone, msg1);
                console.log(`[${cronId}] Bolha 1 enviada para ${lead.phone}`);

                await sleep(2500); // Simulate human typing

                await sendWhatsAppMessage(safePhone, msg2);
                console.log(`[${cronId}] Bolha 2 enviada para ${lead.phone}`);

                // --- SUCCESSFUL KILL ---
                console.log(`✅ [${cronId}] 🎯 KILL CONFIRMADO: ${lead.name} caçado com sucesso!`);
                successLead = lead.name;

                // 8. Post-Kill Actions (Inside the Loop)
                if (lead.id) {
                    // Libera o lead. A Eliza não atuará até que o Webhook mude isso para 'lead_replied'.
                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ status: 'waiting_reply' })
                        .eq('id', lead.id);
                }

                await supabaseAdmin.rpc('increment_lobo_sent_count', { today_date: getBrazilDateString(), increment_by: 1 });

                // Novo Jitter: Pausa entre 8 e 15 minutos
                const nextHuntMinutes = Math.floor(Math.random() * (15 - 8 + 1)) + 8;
                const futureDate = new Date(Date.now() + nextHuntMinutes * 60 * 1000).toISOString();

                console.log(`⏱️ [PACING METRICS] Janela de 10h. Novo cooldown sorteado: ${nextHuntMinutes} min. Capacidade teórica máxima hoje: ${Math.floor(600 / nextHuntMinutes)} leads.`);

                await supabaseAdmin
                    .from('system_settings')
                    .upsert({
                        key: 'next_hunt_at',
                        value: { timestamp: futureDate, scheduled_by: cronId },
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'key' });

                console.log(`⏰ [${cronId}] Próxima caçada agendada para: ${futureDate}`);

                await supabaseAdmin
                    .from('system_settings')
                    .upsert({
                        key: 'next_hunt_at',
                        value: { timestamp: futureDate, scheduled_by: cronId },
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'key' });

                console.log(`⏰ [${cronId}] Próxima caçada agendada para: ${futureDate} (${nextHuntMinutes} min)`);

                // CRITICAL: Execute only one lead per trigger
                break;

            } catch (err: any) {
                const errorBody = err.message || '';
                if (
                    errorBody.includes('"exists":false') ||
                    errorBody.includes('number does not exist') ||
                    errorBody.includes('not registered') ||
                    errorBody.includes('invalid')
                ) {
                    invalidCount++;
                    console.log(`🚫 [${cronId}] Lead ${lead.name} (${lead.phone}) sem WhatsApp. Marcando 'invalid'.`);
                    if (lead.id) {
                        await supabaseAdmin
                            .from('leads_lobo')
                            .update({ status: 'invalid' })
                            .eq('id', lead.id);
                    }

                    // CORREÇÃO: Consumir a cota diária e agendar o próximo tiro, mesmo falhando
                    await supabaseAdmin.rpc('increment_lobo_sent_count', { today_date: getBrazilDateString(), increment_by: 1 });

                    const nextHuntMinutes = Math.floor(Math.random() * (45 - 25 + 1)) + 25;
                    const futureDate = new Date(Date.now() + nextHuntMinutes * 60 * 1000).toISOString();

                    await supabaseAdmin.from('system_settings').upsert({
                        key: 'next_hunt_at', value: { timestamp: futureDate, scheduled_by: cronId }, updated_at: new Date().toISOString()
                    }, { onConflict: 'key' });

                    break; // Aborta a rodada para respeitar o cooldown

                } else if (errorBody.includes('500') || errorBody.includes('Connection Closed')) {
                    console.error(`❌ [${cronId}] Erro inesperado ao enviar para ${lead.name}:`, errorBody);
                    continue;
                }
            }
        }

        const resultStatus = successLead ? 'kill_confirmed' : 'no_kill';
        return NextResponse.json({
            status: resultStatus,
            cronId,
            successLead,
            invalidSkipped: invalidCount
        });

    } catch (error: any) {
        console.error(`❌ [${cronId}] Erro Crítico:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return POST(req);
}
