import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { normalizePhone } from '../../../lib/utils/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
    const cronId = Math.random().toString(36).substring(7);
    console.log(`\n--- 🐺 [${cronId}] HUNT UNTIL SUCCESS: INICIANDO CAÇADA ---`);

    let invalidCount = 0;
    let successLead: string | null = null;

    try {
        const token = process.env.ADMIN_SECRET_PASSWORD;
        if (!token) {
            console.error(`❌ [${cronId}] ERRO: ADMIN_SECRET_PASSWORD não configurado.`);
            return NextResponse.json({ error: 'Missing token' }, { status: 500 });
        }

        // --- SHIELD: HORÁRIO COMERCIAL E FIM DE SEMANA (America/Sao_Paulo) ---
        const now = new Date();
        const brasilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const dayOfWeek = brasilTime.getDay(); // 0 = Domingo, 6 = Sábado
        const hour = brasilTime.getHours();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            console.log(`💤 [${cronId}] Fim de semana. O Lobo está descansando.`);
            return NextResponse.json({ status: 'ignored', reason: 'weekend' }, { status: 200 });
        }

        if (hour < 8 || hour >= 18) {
            console.log(`🌙 [${cronId}] Fora do horário comercial (${hour}h). O Lobo está dormindo.`);
            return NextResponse.json({ status: 'ignored', reason: 'outside_business_hours' }, { status: 200 });
        }

        // --- STEALTH MODE: Check if it's time to hunt ---
        const { data: huntSetting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'next_hunt_at')
            .single();

        const nextHuntAt = huntSetting?.value?.timestamp;

        if (nextHuntAt) {
            const nextHuntTime = new Date(nextHuntAt).getTime();

            if (!isNaN(nextHuntTime) && Date.now() < nextHuntTime) {
                const remainingMs = nextHuntTime - Date.now();
                const remainingMin = Math.ceil(remainingMs / 60000);
                console.log(`😴 [${cronId}] STEALTH MODE: Dormindo. Próxima caçada em ~${remainingMin} min (${nextHuntAt})`);

                return NextResponse.json({
                    status: 'sleeping',
                    cronId,
                    next_hunt: nextHuntAt,
                    remaining_minutes: remainingMin
                }, { status: 200 });
            }
        }

        // Safety net: if next_hunt_at is missing or invalid, hunt NOW
        if (!nextHuntAt) {
            console.log(`⚡ [${cronId}] Nenhum next_hunt_at encontrado. Caçando AGORA (first run).`);
        }

        // --- STEP 1: Fetch up to 5 pending leads ---
        const HUNT_LIMIT = 5;
        console.log(`📥 [${cronId}] Buscando até ${HUNT_LIMIT} leads 'pending'...`);

        const { data: leads, error: dbError } = await supabaseAdmin
            .from('leads_lobo')
            .select('*')
            .eq('status', 'pending')
            .neq('name', 'Lead Teste')
            .neq('name', 'Sem Nome')
            .limit(HUNT_LIMIT);

        if (dbError) {
            console.error(`❌ [${cronId}] Erro ao buscar leads:`, dbError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!leads || leads.length === 0) {
            console.log(`💤 [${cronId}] Nenhum lead pendente encontrado.`);
            return NextResponse.json({ status: 'empty', message: 'No pending leads found' }, { status: 200 });
        }

        console.log(`🎯 [${cronId}] ${leads.length} leads carregados. Iniciando hunt loop...`);

        // --- STEP 2: The "Hunt" Loop ---
        for (const lead of leads) {
            if (!lead.phone || !lead.name) {
                console.log(`⚠️ [${cronId}] Lead ignorado (dados incompletos):`, lead);
                continue;
            }

            lead.phone = normalizePhone(lead.phone);

            // Anti-ban delay (2-4 seconds)
            const delay = Math.floor(Math.random() * 2000) + 2000;
            console.log(`⏳ [${cronId}] Aguardando ${delay / 1000}s antes de tentar ${lead.name} (${lead.phone})...`);
            await sleep(delay);

            // --- Build the message ---
            const currentHour = new Date().getUTCHours() - 3;
            const localHour = currentHour < 0 ? currentHour + 24 : currentHour;
            const saudacao = localHour < 12 ? 'bom dia' : 'boa tarde';

            const nameLower = lead.name ? lead.name.toLowerCase() : '';
            const rawNameLower = nameLower && !nameLower.includes('lead') && !nameLower.includes('desconhecido') && !nameLower.includes('sem nome')
                ? lead.name.split(' ')[0].toLowerCase()
                : '';
            const capitalizedName = rawNameLower ? rawNameLower.charAt(0).toUpperCase() + rawNameLower.slice(1) : '';
            const nomeFormatado = capitalizedName ? `, ${capitalizedName}` : '';
            const nichoFormatado = lead.niche ? lead.niche.toLowerCase() : 'negócio';

            // --- 🧠 SMART DECISION ENGINE: Does this lead have a REAL website? ---
            let hasSite = false;

            if (lead.website && typeof lead.website === 'string') {
                const url = lead.website.toLowerCase().trim();

                // Filter out nulls, empties, and social media profiles (they don't count!)
                if (
                    url !== "" &&
                    url !== "null" &&
                    !url.includes("instagram.com") &&
                    !url.includes("instagr.am") &&
                    !url.includes("facebook.com") &&
                    !url.includes("fb.com")
                ) {
                    hasSite = true;
                }
            }

            console.log(`🧠 [${cronId}] Lead ${lead.name} | website: "${lead.website || 'N/A'}" | hasSite: ${hasSite}`);

            // --- 🎯 BIFURCATED LETHAL STRIKE: Two ammunition arrays ---

            // 💀 Array 1: NO SITE — attack the absence of a website
            const variationsNoSite = [
                `opa, ${saudacao}! sou aqui da região também. tava procurando vocês no google mas não achei o site oficial, vocês tão atendendo só pelo insta?`,
                `fala pessoal, ${saudacao}! achei o ${nichoFormatado} de vocês aqui no Maps, o trampo parece muito bacana. vocês tão sem site no momento ou eu que não achei o link?`,
                `opa, tudo bem? Denis aqui. o trabalho de vocês é muito bom pra ficar só na rede social. vocês já chegaram a ter um site próprio pra criar mais autoridade alguma vez?`,
                `${saudacao}, pessoal! tava dando uma olhada no perfil de vocês. a galera que procura pelo Google consegue achar vocês fácil hoje, ou a captação de clientes tá sendo toda no boca a boca?`,
                `fala, ${saudacao}! passei pelo ${nichoFormatado} de vocês agora há pouco. me tira uma dúvida rápida: a operação de vocês tá rodando sem site oficial mesmo?`
            ];

            // 🎯 Array 2: HAS SITE — attack the quality/performance of the existing site
            const variationsWithSite = [
                `opa, ${saudacao}! dei uma olhada no site de vocês agora. visualmente tá ok, mas vocês já checaram como tá a performance dele no Google? tipo velocidade, SEO, essas coisas?`,
                `fala pessoal, ${saudacao}! achei o ${nichoFormatado} de vocês no Maps e passei no site. me diz uma coisa: vocês sentem que o site traz cliente novo, ou ele tá mais parado?`,
                `${saudacao}! Denis aqui. vi que vocês já têm site, o que é ótimo. mas uma dúvida sincera: quando alguém pesquisa "${nichoFormatado}" no Google aí na região, vocês aparecem nos primeiros resultados?`,
                `opa, tudo bem? passei pelo site de vocês rapidinho. ele tá carregando um pouco lento no celular — vocês sabiam? isso mata a conversão. já fizeram algum teste de velocidade nele?`,
                `fala, ${saudacao}! vi que vocês têm um site rodando. vocês têm noção de quantas visitas ele recebe por mês? pergunto porque tem muito ${nichoFormatado} que tem site mas ele não gera lead nenhum.`
            ];

            // Select the correct ammunition based on the decision
            const activeVariations = hasSite ? variationsWithSite : variationsNoSite;
            const message = activeVariations[Math.floor(Math.random() * activeVariations.length)];

            // --- STEP 3: Attempt to send ---
            try {
                console.log(`📤 [${cronId}] Tentando enviar para ${lead.name} (${lead.phone})...`);
                await sendWhatsAppMessage(lead.phone, message);

                // --- STEP 4: SUCCESSFUL KILL! ---
                console.log(`✅ [${cronId}] 🎯 KILL CONFIRMADO: ${lead.name} caçado com sucesso!`);
                successLead = lead.name;

                // Mark as contacted
                if (lead.id) {
                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ status: 'contacted' })
                        .eq('id', lead.id);
                }

                // Schedule next hunt (random 5-15 minutes from now)
                const nextHuntMinutes = Math.floor(Math.random() * 11) + 8; // 5 to 15
                const nextHuntAt = new Date(Date.now() + nextHuntMinutes * 60 * 1000).toISOString();

                await supabaseAdmin
                    .from('system_settings')
                    .upsert({
                        key: 'next_hunt_at',
                        value: { timestamp: nextHuntAt, scheduled_by: cronId },
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'key'
                    });

                console.log(`⏰ [${cronId}] Próxima caçada agendada para: ${nextHuntAt} (${nextHuntMinutes} min)`);

                // 🚨 CRITICAL: Break immediately! Only 1 successful message per cycle.
                break;

            } catch (err: any) {
                const errorBody = err.message || '';

                // Check if the number is invalid / doesn't have WhatsApp
                if (
                    errorBody.includes('"exists":false') ||
                    errorBody.includes('number does not exist') ||
                    errorBody.includes('not registered') ||
                    errorBody.includes('invalid')
                ) {
                    invalidCount++;
                    console.log(`🚫 [${cronId}] Lead ${lead.name} (${lead.phone}) sem WhatsApp. Marcando como 'invalid'. [Skip #${invalidCount}]`);

                    if (lead.id) {
                        await supabaseAdmin
                            .from('leads_lobo')
                            .update({ status: 'invalid' })
                            .eq('id', lead.id);
                    }

                    // continue to next lead in the hunt
                    continue;

                } else if (errorBody.includes('500') || errorBody.includes('Connection Closed')) {
                    console.error(`🚨 [${cronId}] ERRO CRÍTICO NA INSTÂNCIA (DESCONECTADA)! Abortando caçada para não queimar leads.`);
                    
                    // Adiciona 15 minutos de cooldown para dar tempo do admin arrumar a Evolution API
                    const retryAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                    await supabaseAdmin.from('system_settings').upsert({
                        key: 'next_hunt_at', value: { timestamp: retryAt }
                    }, { onConflict: 'key' });

                    break; // Sai do loop imediatamente, protegendo os outros leads pendentes
                } else {
                    // Unknown error — log it but don't mark as invalid
                    console.error(`❌ [${cronId}] Erro inesperado ao enviar para ${lead.name}:`, errorBody);
                    continue;
                }
            }
        }

        // --- STEP 5: Final Report ---
        const resultStatus = successLead ? 'kill_confirmed' : 'no_kill';
        const summary = successLead
            ? `🐺 Caçada concluída! Lead "${successLead}" abordado com sucesso. ${invalidCount} inválido(s) pulado(s).`
            : `💀 Caçada encerrada sem sucesso. ${invalidCount} lead(s) inválido(s) encontrado(s). Nenhum lead válido restante no lote.`;

        console.log(`\n--- 🏁 [${cronId}] ${summary} ---\n`);

        return NextResponse.json({
            status: resultStatus,
            cronId,
            successLead,
            invalidSkipped: invalidCount,
            message: summary
        });

    } catch (error: any) {
        console.error(`❌ [${cronId}] Erro Crítico na Caçada:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return POST(req);
}