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
            const hasWhatsApp = await checkWhatsAppNumber(safePhone);

            if (!hasWhatsApp) {
                console.log(`🚫 [${cronId}] O número ${safePhone} não possui WhatsApp ativo. Descartado preventivamente.`);

                if (lead.id) {
                    await supabaseAdmin.from('leads_lobo').update({ status: 'invalid' }).eq('id', lead.id);
                }

                // Consome a cota diária e agenda o próximo tiro para manter o comportamento orgânico
                await supabaseAdmin.rpc('increment_lobo_sent_count', { today_date: getBrazilDateString(), increment_by: 1 });
                const nextHuntMinutes = Math.floor(Math.random() * (45 - 25 + 1)) + 25;
                const futureDate = new Date(Date.now() + nextHuntMinutes * 60 * 1000).toISOString();

                await supabaseAdmin.from('system_settings').upsert({
                    key: 'next_hunt_at', value: { timestamp: futureDate, scheduled_by: cronId }, updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

                break; // Encerra o turno do Cron
            }

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
                    part2: `Dei uma navegada no site de vocês e achei o projeto bem massa. Vocês estão satisfeitos com os resultados do site?`
                },
                {
                    part1: `{Opa|Fala|Oi|Olá}, ${saudacao}! Sou desenvolvedor web aqui da Lagoa da Conceição.`,
                    part2: `Achei o ${nichoFormatado} de vocês no Maps e acessei o site. O trampo é muito bom! Hoje o site funciona mais como uma vitrine institucional pra vocês ou ele traz bastante clientes?`
                },
                {
                    part1: `${saudacao} pessoal, tudo bem?`,
                    part2: `Vi que a operação de vocês já tá com um site no ar, muito bacana. Vocês tão conseguindo captar clientes e gerar resultado com ele atualmente?`
                },
                {
                    part1: `{Opa|Fala|Oi|Olá}, ${saudacao}! tudo certo?`,
                    part2: `Tava olhando o site de vocês pelo celular e achei a estrutura bem bacana. Hoje vocês usam o site mais pra fechar serviço direto ou o objetivo principal é direcionar o pessoal pro WhatsApp?`
                },
                {
                    part1: `{Fala|Opa|Oi|Olá}, ${saudacao}! tranquilo?`,
                    part2: `Pesquisando sobre ${nichoFormatado} acabei caindo no site de vocês. Muito legal o trabalho. O site atende bem a demanda de vocês hoje ou vocês sentem que precisariam de algo mais focado em conversão?`
                }
            ];

            // --- 🎯 LETHAL STRIKE 3: PAGESPEED HOOK ---
            const scoreNum = Number(lead.pagespeed_score);
            const isSlowSite = !isNaN(scoreNum) && scoreNum < 50 && scoreNum > 0 && lead.pagespeed_time;

            const timeStr = lead.pagespeed_time ? lead.pagespeed_time.replace('.', ',') : '';

            const variationsPageSpeed = [
                {
                    part1: `${saudacao}, tudo bem? Sou desenvolvedor aqui de Floripa.`,
                    part2: `Tava pesquisando serviços de ${nichoFormatado} e tentei entrar no site de vocês pelo celular, mas a tela ficou carregando por uns ${timeStr} segundos. A maioria do pessoal desiste de esperar e acaba indo pro concorrente. Vocês tão sentindo que o site tá trazendo bons resultados atualmente?`
                },
                {
                    part1: `${saudacao}, tudo certo? Achei o negócio de vocês muito bacana.`,
                    part2: `Como eu crio sites, tenho mania de testar os links que eu clico. Fui abrir o de vocês agora e demorou quase ${timeStr} segundos pra aparecer alguma coisa. Cliente hoje não tem paciência e fecha a aba na hora. Vocês estão satisfeitos com a conversão atual do site?`
                },
                {
                    part1: `{Opa|Oi|Fala|Olá}, pessoal! Tudo bem? Me chamo Denis.`,
                    part2: `Achei a empresa de vocês aqui no Google, mas quando cliquei no site ele demorou ${timeStr} segundos pra abrir no meu celular. Quase achei que tava fora do ar. Vocês tão usando ele pra captar cliente ativamente ou deixam só como cartão de visitas mesmo?`
                },
                {
                    part1: `{Oi|Opa|Fala|Olá}, ${saudacao}! Sou desenvolvedor web aqui da Lagoa da Conceição.`,
                    part2: `Curti muito o trabalho de vocês de ${nichoFormatado}. Fui dar uma olhada no site pelo 4G e vi que ele tá levando ${timeStr} segundos pra abrir. Essa demora costuma fazer o cliente desistir e ir procurar outra opção. Vocês tão conseguindo captar clientes e vender por lá?`
                }
            ];

            // --- 🎯 LETHAL STRIKE 4: DEAD SITE HOOK ---
            const isDeadSite = scoreNum === -1 && hasSite; // Tem link, mas a API do Google não conseguiu abrir

            const variationsDeadSite = [
                {
                    part1: `${saudacao}, tudo bem? Sou desenvolvedor web aqui de Florianópolis.`,
                    part2: `Tava pesquisando sobre ${nichoFormatado} e tentei acessar o site de vocês, mas ele tá dando erro de conexão e não abre de jeito nenhum. Vocês estão cientes que ele caiu?`
                },
                {
                    part1: `${saudacao}, tudo certo? Achei o negócio de vocês muito massa no Maps.`,
                    part2: `Fui clicar no link do site de vocês pra dar uma olhada no serviço, mas a página tá fora do ar. Vocês desativaram ele de propósito ou o servidor caiu mesmo?`
                },
                {
                    part1: `{Opa|Oi|Fala|Olá}, pessoal! Tudo bem? Me chamo Denis, sou desenvolvedor aqui da Lagoa da Conceição.`,
                    part2: `Tava tentando entrar no site oficial de vocês agora pelo celular, mas parece que o link tá quebrado ou o servidor caiu. Vocês estão cientes disso?`
                }
            ];

            // 🎯 ESCOLHENDO A MUNIÇÃO BASEADO NO DIAGNÓSTICO DO ALVO
            let activeVariations;

            if (isSlowSite) {
                console.log(`⏱️ [${cronId}] Site Lento Detectado. Usando Hook de PageSpeed (${scoreNum}/100 | ${timeStr}s).`);
                activeVariations = variationsPageSpeed;
            } else if (isDeadSite) {
                console.log(`💀 [${cronId}] Site Morto Detectado (Nota -1). Usando Hook de Site Fora do Ar.`);
                activeVariations = variationsDeadSite;
            } else if (hasSite) {
                console.log(`🌐 [${cronId}] Alvo tem site válido e rápido. Usando Hook Institucional.`);
                activeVariations = variationsComSite;
            } else {
                console.log(`📱 [${cronId}] Alvo não possui site. Usando Hook de Rede Social.`);
                activeVariations = variationsNoSite;
            }

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
                    // Libera o lead. A Eliza não atuará até que o Webhook mude isso para 'lead_replied'.
                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ status: 'waiting_reply' })
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
