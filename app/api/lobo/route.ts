import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
    console.log('\n--- 🐺 REQUISIÇÃO RECEBIDA NO LOBO ---');
    try {
        // 1. Security Check
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.WOLF_ADMIN_TOKEN) {
            console.log('⚠️ Token inválido ou ausente:', token);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Parse Payload (Graceful fallback for cron triggers)
        let body: any = {};
        try {
            body = await req.json();
            console.log('📦 Payload recebido:', body);
        } catch (err) {
            console.log('📦 Nenhum JSON no body (Disparo de Cron assumido).');
        }

        const batchSize = body.batch_size || 3;
        let leadsToProcess = [];
        const manualPhone = body.testPhone || body.test_number || body.number;

        if (manualPhone) {
            console.log(`🧪 TESTE MANUAL: Disparando para o número ${manualPhone}`);
            leadsToProcess = [{
                id: 'test-id',
                name: body.testName || body.name || 'Lead Teste',
                phone: manualPhone
            }];
        } else {
            // 📥 A CORREÇÃO DO SPAM: Buscando apenas 'pending'
            console.log(`📥 Buscando lote de ${batchSize} leads 'pending' na tabela leads_lobo...`);
            const { data: leads, error } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('status', 'pending') // SÓ ATACA QUEM AINDA NÃO FOI ATACADO
                .neq('name', 'Lead Teste') // Limpando testes antigos do banco
                .neq('name', 'Sem Nome')
                .limit(batchSize); // 🚨 Respeitando o Payload Limit

            if (error) {
                console.error('❌ Erro ao buscar leads no Supabase:', error);
                return NextResponse.json({ error: 'Database error' }, { status: 500 });
            }

            leadsToProcess = leads || [];
        }

        if (leadsToProcess.length === 0) {
            console.log('💤 Nenhum lead novo para caçar hoje.');
            return NextResponse.json({ status: 'success', message: 'No pending leads found' }, { status: 200 });
        }

        // 3. A CORREÇÃO DO TIMEOUT: Await na função para o Netlify não matar o processo
        const isManualTest = !!manualPhone;
        await processLeads(leadsToProcess, !isManualTest);

        return NextResponse.json({ status: 'processing finished', leadsCount: leadsToProcess.length });
    } catch (error) {
        console.error('❌ Erro Crítico na Rota do Lobo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function processLeads(leads: any[], isFromDb: boolean) {
    console.log(`🐺 LOBO INICIANDO CAÇADA: ${leads.length} leads na lista.`);

    for (const lead of leads) {
        if (!lead.phone || !lead.name) {
            console.log(`⚠️ Lead ignorado (dados incompletos):`, lead);
            continue;
        }

        // Delay anti-ban (reduzido para caber no limite de tempo do Serverless)
        let delay = Math.floor(Math.random() * 2000) + 2000; // 2 a 4 segundos
        if (!isFromDb) delay = 1000;

        console.log(`⏳ Aguardando ${delay / 1000}s antes de abordar ${lead.name}...`);
        await sleep(delay);

        // Humanized Spintax Logic
        const currentHour = new Date().getUTCHours() - 3;
        const localHour = currentHour < 0 ? currentHour + 24 : currentHour;
        const saudacao = localHour < 12 ? 'Bom dia' : 'Boa tarde';

        const nameLower = lead.name.toLowerCase();
        const rawName = nameLower && !nameLower.includes('lead') && !nameLower.includes('desconhecido') && !nameLower.includes('sem nome') 
            ? lead.name.split(' ')[0] 
            : '';
            
        const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase() : '';
        const displayName = firstName ? ` ${firstName}` : '';

        const niche = lead.niche ? lead.niche.toLowerCase() : 'negócio';
        const company = rawName === '' && lead.name && !nameLower.includes('sem nome') ? lead.name : '';
        const identifier = company ? company : niche; // fallback to niche if no valid company name

        const variations = [
            `Oi${displayName}, tudo bem? Vi que vocês são de ${identifier}. Estão pegando novos projetos agora?`,
            `${saudacao}${displayName}, beleza? Achei o trampo de vocês com ${identifier}. Posso fazer uma pergunta rápida?`,
            `Opa${displayName}, ${saudacao.toLowerCase()}. Sou o Denis, vi seu ${identifier} aqui no maps. A agenda tá lotada ou cabe mais?`,
            `Fala${displayName}, ${saudacao.toLowerCase()}! Vi o perfil de vocês aqui. Como tá o volume de clientes nesse mês pra ${identifier}?`,
            `Oi${displayName}! Tudo certo? Vi o ${identifier} de vocês. Quem cuida da parte de vendas aí?`,
            `${saudacao}${displayName}, tudo tranquilo? Achei massa o trabalho com ${identifier}. Consegue me tirar uma dúvida?`,
            `Opa, ${saudacao.toLowerCase()}. Vi seu perfil de ${identifier}. Vocês estão conseguindo dar conta da demanda?`,
            `Fala${displayName}! ${saudacao.toLowerCase()}. Achei a página do seu ${identifier}. Vocês estão aceitando novos orçamentos?`,
            `${saudacao}, beleza? Vi que vocês são da área de ${identifier}. Queria tirar uma duvida rápida sobre vendas?`,
            `Oi${displayName}, tudo bem? Cai aqui no perfil do ${identifier}. Quem é o responsável pelos novos clientes?`
        ];

        const message = variations[Math.floor(Math.random() * variations.length)];

        try {
            await sendWhatsAppMessage(lead.phone, message);

            // 4. A CORREÇÃO DA SANITY CHECK E CONFORMIDADE AO ESQUEMA
            if (isFromDb && lead.id) {
                await supabaseAdmin.from('leads_lobo').update({ status: 'contacted' }).eq('id', lead.id);
                console.log(`🐺 Lead ${lead.name} caçado com sucesso.`);
            }
        } catch (err) {
            console.error(`❌ Lobo falhou ao enviar mensagem para ${lead.name}:`, err);
        }
    }

    console.log(`🏁 LOBO FINALIZOU A CAÇADA!`);
}