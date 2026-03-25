import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
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
    console.log(`\n--- 🐺 [${cronId}] WOLF AGENT PROSPECTOR (SUPER API) ---`);

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
            const randomDailyLimit = Math.floor(Math.random() * (15 - 10 + 1)) + 10; // 10 to 15
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

        // 6. Lead Fetching
        const HUNT_LIMIT = 5;
        const { data: leads, error: leadsError } = await supabaseAdmin
            .from('leads_lobo')
            .select('*')
            .eq('status', 'pending')
            .neq('name', 'Lead Teste')
            .neq('name', 'Sem Nome')
            .limit(HUNT_LIMIT);

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
            const nichoFormatado = lead.niche ? lead.niche.toLowerCase() : 'negócio';
            const hasSite = lead.website && lead.website.trim() !== '' &&
                lead.website.toLowerCase() !== 'null' &&
                !lead.website.includes('instagram.com') &&
                !lead.website.includes('facebook.com') &&
                !lead.website.includes('fb.com');

            // --- 🎯 BIFURCATED LETHAL STRIKE: Two ammunition arrays ---
            const variationsNoSite = [
                {
                    part1: `${saudacao}, tudo bem? Sou desenvolvedor aqui de Floripa.`,
                    part2: `Tava procurando vocês no google mas não achei o site oficial, vocês tão atendendo só pelo insta?`
                },
                {
                    part1: `${saudacao} pessoal, tudo bem?`,
                    part2: `Achei o ${nichoFormatado} de vocês aqui no Maps, o trampo parece muito bacana. vocês tão sem site no momento ou eu que não achei o link?`
                },
                {
                    part1: `{opa|fala|oi|olá}, tudo bem? Me chamo Denis, sou desenvolvedor web e moro na Lagoa da Conceição.`,
                    part2: `Tava pesquisando sobre ${nichoFormatado} e o perfil de vocês chamou atenção. vocês chegaram a desativar o site oficial ou a operação roda 100% na rede social hoje?`
                },
                {
                    part1: `${saudacao}, pessoal!`,
                    part2: `Curti bastante o trampo de vocês! Fui dar uma procurada num site pra ver mais detalhes e só achei o Insta. vocês concentram o atendimento todo por aqui mesmo?`
                },
                {
                    part1: `{fala|opa|olá|oi}, ${saudacao}!`,
                    part2: `Tava dando uma olhada no perfil de vocês aqui e fui procurar o link do site na bio pra ver mais, mas não achei. a operação de vocês tá toda centralizada no WhatsApp mesmo?`
                }
            ];

            const variationsComSite = [
                {
                    part1: `${saudacao}, tudo bem? Me chamo Denis sou desenvolvedor aqui de Floripa.`,
                    part2: `Dei uma navegada no site de vocês e achei o projeto bem massa. por acaso vocês costumam acompanhar como tá a performance dele lá no Google pra atrair cliente novo hoje em dia?`
                },
                {
                    part1: `{opa|fala|oi|olá}, ${saudacao}! Sou desenvolvedor web aqui de Floripa.`,
                    part2: `Achei o ${nichoFormatado} de vocês no Maps e acessei o site. o trampo é muito bom! hoje o site funciona mais como uma vitrine institucional pra vocês ou ele traz bastante orçamento recorrente?`
                },
                {
                    part1: `${saudacao} pessoal, tudo bem?`,
                    part2: `Vi que a operação de vocês já tá com um site no ar, muito bacana. vocês tão conseguindo captar clientes e gerar resultado com ele atualmente?`
                },
                {
                    part1: `{opa|fala|oi|olá}, ${saudacao}! tudo certo?`,
                    part2: `Passei pelo site de vocês agora pelo celular. o serviço é top, mas notei um detalhezinho técnico na velocidade de carregamento da página. vocês têm alguém de tecnologia que cuida dessa parte de otimização hoje?`
                },
                {
                    part1: `{fala|opa|oi|olá}, ${saudacao}! tranquilo?`,
                    part2: `Esbarrei no site de vocês pesquisando aqui e curti demais o ${nichoFormatado}. a galera costuma chamar mais direto pelo botão do WhatsApp lá do site ou vocês rodam algum tráfego pago pra ele?`
                }
            ];

            const activeVariations = hasSite ? variationsComSite : variationsNoSite;
            const variation = activeVariations[Math.floor(Math.random() * activeVariations.length)];

            const msg1 = parseSpintax(variation.part1);
            const msg2 = parseSpintax(variation.part2);

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
                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ status: 'contacted' })
                        .eq('id', lead.id);
                }

                await supabaseAdmin.rpc('increment_lobo_sent_count', { today_date: getBrazilDateString(), increment_by: 1 });

                const nextHuntMinutes = Math.floor(Math.random() * (45 - 25 + 1)) + 25; // 25 to 45 mins
                const futureDate = new Date(Date.now() + nextHuntMinutes * 60 * 1000).toISOString();

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
