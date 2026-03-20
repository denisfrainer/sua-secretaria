import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
    console.log('\n--- 🐺 REQUISIÇÃO RECEBIDA NO LOBO ---');
    try {
        // 1. Security Check
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.WOLF_SECRET_TOKEN) {
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
            console.log(`📥 Buscando leads 'pending' na tabela leads_lobo...`);
            const { data: leads, error } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('status', 'pending') // SÓ ATACA QUEM AINDA NÃO FOI ATACADO
                .neq('name', 'Lead Teste') // Limpando testes antigos do banco
                .limit(5); // 🚨 REDUZIDO PARA 5 para evitar Timeout do Netlify (10s-26s)

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
        let delay = Math.floor(Math.random() * 3000) + 2000; // 2 a 5 segundos
        if (!isFromDb) delay = 1000;

        console.log(`⏳ Aguardando ${delay / 1000}s antes de abordar ${lead.name}...`);
        await sleep(delay);

        // Humanized Spintax Logic
        const currentHour = new Date().getUTCHours() - 3;
        const localHour = currentHour < 0 ? currentHour + 24 : currentHour;
        const saudacao = localHour < 12 ? 'bom dia' : 'boa tarde';

        const validName = lead.name && !lead.name.toLowerCase().includes('lead') && !lead.name.toLowerCase().includes('desconhecido');
        const firstName = validName ? lead.name.split(' ')[0].toLowerCase() : '';
        const displayName = firstName ? `, ${firstName}` : '';
        const displayNameSpace = firstName ? ` ${firstName}` : '';

        const niche = lead.niche ? lead.niche.toLowerCase() : 'negócio';

        const variations = [
            `${saudacao}${displayName}! vi o ${niche} de vocês aqui. estão aceitando novos clientes?`,
            `${saudacao}, tudo bem? vi o trampo de vocês no ${niche}. posso te fazer uma pergunta rápida?`,
            `opa${displayNameSpace}, ${saudacao}. sou o denis. cara, vi seu ${niche} aqui no maps. estão conseguindo dar conta da demanda ou cabe mais?`,
            `${saudacao}! tudo certo? vi o ${niche} de vocês. quem cuida da parte de vendas aí?`,
            `fala${displayNameSpace}, ${saudacao}. vi o perfil de vocês aqui na pesquisa. como tá o volume de clientes nesse mês?`,
            `${saudacao}${displayName}, beleza? achei massa o trampo de vocês com ${niche}. consegue me tirar uma dúvida rápida?`,
            `opa, ${saudacao}. vi que vocês trabalham com ${niche}. a agenda de vocês tá lotada ou tem espaço pra mais projetos?`,
            `${saudacao}! tudo tranquilo? caí no perfil de vocês aqui no maps. quem é o responsável pelos atendimentos?`,
            `fala${displayNameSpace}! ${saudacao}. achei o perfil do seu ${niche}. vcs tao dando conta dos orçamentos hoje em dia?`,
            `${saudacao}, beleza? vi o trampo de vocês. me tira uma dúvida rápida sobre a captação de clientes de vocês?`
        ];

        const message = variations[Math.floor(Math.random() * variations.length)];

        try {
            await sendWhatsAppMessage(lead.phone, message);
            console.log(`✅ Mensagem enviada para: ${lead.name}`);

            // 4. A CORREÇÃO DA SANITY CHECK: Descomentado e ativo!
            if (isFromDb && lead.id) {
                await supabaseAdmin.from('leads_lobo').update({ status: 'contacted' }).eq('id', lead.id);
                console.log(`🔄 Status atualizado para 'contacted' no banco.`);
            }
        } catch (err) {
            console.error(`❌ Lobo falhou ao enviar mensagem para ${lead.name}:`, err);
        }
    }

    console.log(`🏁 LOBO FINALIZOU A CAÇADA!`);
}