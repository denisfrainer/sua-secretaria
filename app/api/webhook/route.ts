// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { generatePrompt } from '../../../lib/agent/prompt';
import { tools } from '../../../lib/agent/tools';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Filtro de Segurança
        if (body.isGroup === false && body.text && body.text.message && !body.fromMe) {
            const clientNumber = body.phone;
            const clientMessage = body.text.message;

            console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);

            // --- NOVO: GODSPEED UNIFICATION (Pre-Flight Check) ---
            const { data: lead, error: leadError } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('telefone', clientNumber)
                .maybeSingle();

            let leadContext = '';
            
            if (leadError) {
                console.error('❌ Erro ao buscar lead no Supabase:', leadError);
            } else if (lead) {
                console.log(`🐺 Lead encontrado: ${lead.nome} | Status: ${lead.status}`);
                leadContext = `\n\n[CONTEXTO DO LEAD]:
Você está falando com ${lead.nome || 'o cliente'}.
O status atual dele na base é: ${lead.status}.
Empresa: ${lead.empresa || 'Não informada'}.
Dor Principal: ${lead.dor_principal || 'Não informada'}.
${lead.status === 'prospeccao_ativa' ? 'Este lead veio de uma prospecção ativa via Lobo. Use isso a seu favor.' : ''}`;
            } else {
                console.log(`🌱 Lead novo. Criando registro como organico_inbound...`);
                await supabaseAdmin.from('leads_lobo').insert({
                    telefone: clientNumber,
                    status: 'organico_inbound',
                    nome: 'Lead inbound' // Placeholder, o bot vai capturar
                });
                leadContext = `\n\n[CONTEXTO DO LEAD]: Este é um lead orgânico inbound novo. Ele acabou de mandar mensagem. Colete o Nome, Empresa e Dor para salvar usando a tool.`;
            }
            // --------------------------------------------------------

            // 2. Busca o cérebro do Agente no Banco de Dados
            const { data: config, error: configError } = await supabaseAdmin
                .from('agent_configs')
                .select('*, organizations(name)')
                .limit(1)
                .single();

            if (configError || !config) {
                console.log('🚨 ERRO: Agente não encontrado no banco de dados.');
                return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
            }

            // 3. SALVAR A MENSAGEM DO CLIENTE NA MEMÓRIA
            await supabaseAdmin.from('chat_history').insert({
                whatsapp_number: clientNumber,
                role: 'user',
                content: clientMessage
            });

            // 4. RECUPERAR AS ÚLTIMAS 10 MENSAGENS (A Memória de Curto Prazo)
            const { data: history } = await supabaseAdmin
                .from('chat_history')
                .select('role, content')
                .eq('whatsapp_number', clientNumber)
                .order('created_at', { ascending: false }) // Pega as mais recentes
                .limit(10); // Limita a 10 para economizar tokens e não confundir a IA

            // Inverte a ordem para ficar cronológica para a IA (da mais antiga para a mais nova)
            const messages = (history || []).reverse().map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            }));

            // 5. Prepara a mente do robô (O Prompt)
            let systemPrompt = generatePrompt(config.organizations.name, config.system_prompt);
            
            // Injeta o contexto dinâmico do lead no prompt
            systemPrompt += leadContext;
            // Forçar o bot a passar o phone context para as ferramentas se acionadas
            systemPrompt += `\n\n[IMPORTANTE]: Sempre que usar a ferramenta 'save_lead_data', você OBRIGATORIAMENTE deve passar o número de telefone do usuário: '${clientNumber}' no parâmetro 'phone'.`;

            // 6. Aciona a IA (Agora com contexto completo da conversa)
            console.log('🧠 IA Pensando com base no histórico e contexto do lead...');
            const { text } = await generateText({
                model: google('gemini-2.5-flash'),
                system: systemPrompt,
                messages: messages, // 👈 Aqui está a mágica da memória! Substituímos o prompt simples
                tools: tools as any,
                // @ts-ignore
                maxSteps: 5,
            });

            console.log(`🗣️ IA RESPONDEU: "${text}"`);

            // 7. SALVAR A RESPOSTA DA IA NA MEMÓRIA
            await supabaseAdmin.from('chat_history').insert({
                whatsapp_number: clientNumber,
                role: 'assistant',
                content: text
            });

            // 🤖 ANTI-ROBOT: Simular tempo de digitação (2s a 4s)
            const typingDelay = Math.floor(Math.random() * 2000) + 2000;
            console.log(`⏳ Simulando digitação de ${typingDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, typingDelay));

            // 8. Envia a mensagem de volta para o cliente no WhatsApp
            await sendWhatsAppMessage(clientNumber, text);

            return NextResponse.json({ status: 'success' });
        }

        return NextResponse.json({ status: 'ignored_event' });
    } catch (error) {
        console.error('❌ Erro Crítico no Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}