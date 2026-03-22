import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { normalizePhone } from '../../../lib/utils/phone';

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
    try {
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.ADMIN_SECRET_PASSWORD) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 1. Verificação de Horário Comercial (Brasil UTC-3)
        const currentHourBR = new Date().getUTCHours() - 3;
        const localHour = currentHourBR < 0 ? currentHourBR + 24 : currentHourBR;

        if (localHour < 8 || localHour >= 18) {
            console.log(`🌙 Fora do horário comercial (${localHour}h). Lobo dormindo.`);
            return NextResponse.json({ status: 'sleeping', reason: 'out_of_business_hours' });
        }

        // 2. Controle de Cota Diária
        const todayStr = getBrazilDateString();
        const { data: statsData, error: statsError } = await supabaseAdmin
            .from('lobo_daily_stats')
            .select('*')
            .eq('date_id', todayStr)
            .single();

        let currentStats = statsData;

        if (!currentStats) {
            const randomDailyLimit = Math.floor(Math.random() * (13 - 7 + 1)) + 7;
            const { data: newStats, error: insertError } = await supabaseAdmin
                .from('lobo_daily_stats')
                .insert([{ date_id: todayStr, sent_count: 0, daily_limit: randomDailyLimit }])
                .select()
                .single();

            if (insertError) throw insertError;
            currentStats = newStats;
        }

        if (currentStats.sent_count >= currentStats.daily_limit) {
            return NextResponse.json({ status: 'limit_reached' });
        }

        // 3. Clusterização Probabilística
        const rand = Math.random();
        let leadsToFetch = 0;

        if (rand < 0.60) {
            return NextResponse.json({ status: 'skipped', reason: 'human_sleep_simulation' });
        } else if (rand < 0.90) {
            leadsToFetch = 1;
        } else {
            leadsToFetch = 2;
        }

        const remainingQuota = currentStats.daily_limit - currentStats.sent_count;
        leadsToFetch = Math.min(leadsToFetch, remainingQuota);

        if (leadsToFetch === 0) return NextResponse.json({ status: 'limit_reached_during_calc' });

        // 4. Busca de Leads
        const { data: leads, error: leadsError } = await supabaseAdmin
            .from('leads_lobo')
            .select('*')
            .eq('status', 'pending')
            .limit(leadsToFetch);

        if (leadsError || !leads || leads.length === 0) {
            return NextResponse.json({ status: 'no_leads_found' });
        }

        // 5. Processamento e Disparo
        let successfulSends = 0;
        const saudacao = localHour < 12 ? 'bom dia' : 'boa tarde';

        for (const lead of leads) {
            if (!lead.phone) continue;

            const safePhone = normalizePhone(lead.phone);
            const nichoFormatado = lead.niche ? lead.niche.toLowerCase() : 'negócio';

            // Verifica se a propriedade website existe e não está vazia
            const hasWebsite = lead.website && lead.website.trim() !== '';

            let variations = [];

            if (hasWebsite) {
                // BIFURCAÇÃO 1: LEAD TEM SITE
                variations = [
                    { 
                        part1: `{opa|fala pessoal}, ${saudacao}!`,
                        part2: `tava dando uma olhada no site de vocês. a operação tá rodando bem ou tem algo que vocês sentem que precisa melhorar no digital?`
                    },
                    {
                        part1: `{opa|fala}, ${saudacao}!`,
                        part2: `achei o ${nichoFormatado} de vocês no google e vi que já tem um site. vocês mesmos que cuidam da manutenção e atualização dele?`
                    },
                    {
                        part1: `${saudacao}, tudo bem? Denis aqui.`,
                        part2: `vi o site de vocês, o trabalho é muito bom. a maior captação de vocês hoje vem através do site ou do instagram?`
                    }
                ];
            } else {
                // BIFURCAÇÃO 2: LEAD NÃO TEM SITE (Suas variações originais com spintax leve)
                variations = [
                    {
                        part1: `{opa|fala}, ${saudacao}! sou aqui de Florianópolis também.`,
                        part2: `tava procurando vocês no google mas não achei o site oficial, vocês tão atendendo só pelo insta?`
                    },
                    {
                        part1: `fala pessoal, ${saudacao}!`,
                        part2: `achei o ${nichoFormatado} de vocês aqui no Maps, o trampo parece muito bacana. vocês tão sem site no momento ou eu que não achei o link?`
                    },
                    {
                        part1: `{opa|fala}, tudo bem? Denis aqui.`,
                        part2: `o trabalho de vocês é muito bom pra ficar só na rede social. vocês já chegaram a ter um site próprio pra criar mais autoridade alguma vez?`
                    },
                    {
                        part1: `${saudacao}, pessoal!`,
                        part2: `tava dando uma olhada no perfil de vocês. a galera que procura pelo Google consegue achar vocês fácil hoje, ou a captação de clientes tá sendo toda no boca a boca?`
                    },
                    {
                        part1: `{fala|opa}, ${saudacao}!`,
                        part2: `passei pelo ${nichoFormatado} de vocês agora há pouco. me tira uma dúvida rápida: a operação de vocês tá rodando sem site oficial mesmo?`
                    }
                ];
            }

            const variation = variations[Math.floor(Math.random() * variations.length)];
            const msg1 = parseSpintax(variation.part1);
            const msg2 = parseSpintax(variation.part2);

            try {
                if (successfulSends > 0) {
                    const interBurstDelay = Math.floor(Math.random() * 5000) + 3000;
                    await sleep(interBurstDelay);
                }

                await sendWhatsAppMessage(safePhone, msg1);
                await sleep(2500); // Simulate typing break for bubble 2
                await sendWhatsAppMessage(safePhone, msg2);
                
                await supabaseAdmin.from('leads_lobo').update({ status: 'contacted' }).eq('id', lead.id);
                successfulSends++;
            } catch (err: any) {
                if (err.message?.includes('"exists":false')) {
                    await supabaseAdmin.from('leads_lobo').update({ status: 'invalid' }).eq('id', lead.id);
                }
            }
        }

        // 6. Atualização do Contador Diário
        if (successfulSends > 0) {
            await supabaseAdmin.rpc('increment_lobo_sent_count', {
                today_date: todayStr,
                increment_by: successfulSends
            });
        }

        return NextResponse.json({ status: 'success', sent: successfulSends });

    } catch (error) {
        console.error('❌ Erro Crítico:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}