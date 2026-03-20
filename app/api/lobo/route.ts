import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
    console.log('\n--- 🐺 REQUISIÇÃO RECEBIDA NO LOBO ---');
    try {
        // 1. Security Check
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.ADMIN_SECRET_PASSWORD) {
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

        // --- 🎯 THE CASUAL HOOK STRATEGY ---
        const currentHour = new Date().getUTCHours() - 3; // Fuso horário Brasília
        const localHour = currentHour < 0 ? currentHour + 24 : currentHour;
        const saudacao = localHour < 12 ? 'bom dia' : 'boa tarde';

        // Extrai o primeiro nome e capitaliza apenas a primeira letra (e.g., "João")
        const nameLower = lead.name ? lead.name.toLowerCase() : '';
        const rawNameLower = nameLower && !nameLower.includes('lead') && !nameLower.includes('desconhecido') && !nameLower.includes('sem nome')
            ? lead.name.split(' ')[0].toLowerCase()
            : '';
            
        const capitalizedName = rawNameLower ? rawNameLower.charAt(0).toUpperCase() + rawNameLower.slice(1) : '';
        
        // If we have a name, add a comma before it for natural phrasing, otherwise empty
        const nomeFormatado = capitalizedName ? `, ${capitalizedName}` : '';
        const nichoFormatado = lead.niche ? lead.niche.toLowerCase() : 'negócio';

        const variations = [
            `opa${nomeFormatado}, ${saudacao}! sou aqui da região também. tava procurando vocês no google mas não achei o site, vocês tão atendendo só pelo insta?`,
            `fala${nomeFormatado}, tudo bem? vi o perfil do ${nichoFormatado} de vocês. me tira uma dúvida rápida, vocês não usam página de orçamentos online?`,
            `${saudacao}${nomeFormatado}! tudo certo? dei uma olhada no trampo de vocês. como a galera faz pra ver os serviços fora daqui, tem algum link?`,
            `opa, ${saudacao}! achei o ${nichoFormatado} de vocês aqui no maps. notei que o link do site de vocês tá vazio, tá em manutenção?`,
            `fala${nomeFormatado}, beleza? vi que o ${nichoFormatado} de vocês tá bombando, mas reparei que não tem um site direto. é proposital?`
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