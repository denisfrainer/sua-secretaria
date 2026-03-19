// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { GoogleGenAI, Type } from '@google/genai';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { generatePrompt } from '../../../lib/agent/prompt';

// ==============================================================
// 🔧 FUNCTION DECLARATIONS (Google Gen AI format)
// ==============================================================
const functionDeclarations = [
    {
        name: 'save_lead_data',
        description: 'Salva as informações capturadas do lead (nome, empresa, faturamento, dor). Chame isso sempre que o usuário fornecer qualquer um desses dados.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                phone: { type: Type.STRING, description: 'O número de telefone do lead' },
                name: { type: Type.STRING, description: 'Nome do lead' },
                company: { type: Type.STRING, description: 'Nome da empresa' },
                revenue: { type: Type.STRING, description: 'Faturamento total ou tamanho da equipe' },
                pain_point: { type: Type.STRING, description: 'O principal desafio ou dor relatada pelo cliente' },
            },
            required: ['phone'],
        },
    },
    {
        name: 'notify_human',
        description: 'Aciona um humano caso o lead esteja irritado, use palavrões, peça expressamente por uma pessoa, ou apresente uma objeção insolúvel.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                reason: { type: Type.STRING, description: 'O motivo pelo qual o suporte humano está sendo requisitado' },
                chat_history: { type: Type.STRING, description: 'Resumo curto da conversa até o momento' },
            },
            required: ['reason'],
        },
    },
];

// ==============================================================
// 🛠️ TOOL EXECUTION (Supabase writes)
// ==============================================================
async function executeToolCall(name: string, args: Record<string, any>): Promise<Record<string, any>> {
    if (name === 'save_lead_data') {
        console.log(`💾 [LEAD DATA CAPTURED]:`, args);
        const updateData: Record<string, any> = {};
        if (args.name) updateData.nome = args.name;
        if (args.company) updateData.empresa = args.company;
        if (args.pain_point) updateData.dor_principal = args.pain_point;
        if (args.revenue) updateData.faturamento = args.revenue;
        updateData.status = 'em_conversacao';

        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .update(updateData)
            .eq('telefone', args.phone);

        if (error) {
            console.error('❌ Erro ao atualizar lead no Supabase:', error);
            return { status: 'error', message: 'Falha ao salvar dados no banco.' };
        }
        return { status: 'success', message: 'Dados do lead salvos com sucesso.' };
    }

    if (name === 'notify_human') {
        console.log(`🚨 [HUMAN ESCALATION]: ${args.reason}`);
        return { status: 'escalated', message: 'Um especialista foi alertado.' };
    }

    return { status: 'error', message: `Ferramenta desconhecida: ${name}` };
}

// ==============================================================
// 📡 WEBHOOK HANDLER
// ==============================================================
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Filtro de Segurança
        if (body.isGroup === false && body.text && body.text.message && !body.fromMe) {
            const clientNumber = body.phone.replace(/\D/g, '');
            const clientMessage = body.text.message;

            console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);

            // --- GODSPEED UNIFICATION (Pre-Flight Check) ---
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

                if (lead.status === 'isca_enviada') {
                    leadContext = `\n\n[CONTEXTO DO LEAD]:
Atenção: Você está falando com ${lead.nome || 'o cliente'}. Nosso sistema automatizado acabou de enviar uma isca perguntando se eles usam IA no atendimento. Continue a conversa a partir dessa premissa, qualificando a dor deles de forma natural.
Empresa: ${lead.empresa || 'Não informada'}.
Dor Principal: ${lead.dor_principal || 'Não informada'}.`;

                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ status: 'em_conversacao' })
                        .eq('id', lead.id);
                    console.log(`🔄 Status do lead ${lead.id} atualizado para 'em_conversacao'`);
                } else {
                    leadContext = `\n\n[CONTEXTO DO LEAD]:
Você está falando com ${lead.nome || 'o cliente'}.
O status atual dele na base é: ${lead.status}.
Empresa: ${lead.empresa || 'Não informada'}.
Dor Principal: ${lead.dor_principal || 'Não informada'}.
${lead.status === 'prospeccao_ativa' ? 'Este lead veio de uma prospecção ativa via Lobo. Use isso a seu favor.' : ''}`;
                }
            } else {
                console.log(`🌱 Lead novo. Criando registro como organico_inbound...`);
                await supabaseAdmin.from('leads_lobo').insert({
                    telefone: clientNumber,
                    status: 'organico_inbound',
                    nome: 'Lead inbound',
                });
                leadContext = `\n\n[CONTEXTO DO LEAD]: Este é um lead orgânico inbound novo. Ele acabou de mandar mensagem. Colete o Nome, Empresa e Dor para salvar usando a tool.`;
            }

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
                content: clientMessage,
            });

            // 4. RECUPERAR AS ÚLTIMAS 10 MENSAGENS (Memória de Curto Prazo)
            const { data: history } = await supabaseAdmin
                .from('chat_history')
                .select('role, content')
                .eq('whatsapp_number', clientNumber)
                .order('created_at', { ascending: false })
                .limit(10);

            const chatHistory = (history || []).reverse();

            // 5. Prepara o System Prompt
            let systemPrompt = generatePrompt(config.organizations.name, config.system_prompt);
            systemPrompt += leadContext;
            systemPrompt += `\n\n[IMPORTANTE]: Sempre que usar a ferramenta 'save_lead_data', você OBRIGATORIAMENTE deve passar o número de telefone do usuário: '${clientNumber}' no parâmetro 'phone'.`;

            // 6. BUILD CONTENTS ARRAY (Google Gen AI format)
            const contents: any[] = chatHistory.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }));

            // 7. CALL GEMINI VIA @google/genai
            console.log('🧠 IA Pensando com base no histórico e contexto do lead...');
            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

            const genConfig: any = {
                tools: [{ functionDeclarations }],
                systemInstruction: systemPrompt,
            };

            let response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config: genConfig,
            });

            // 8. FUNCTION CALLING LOOP (max 3 rounds)
            let finalText = response.text || '';
            let loopCount = 0;

            while (response.functionCalls && response.functionCalls.length > 0 && loopCount < 3) {
                loopCount++;
                const fc = response.functionCalls[0];
                console.log(`🔧 [TURN ${loopCount}] Tool chamada: ${fc.name}(${JSON.stringify(fc.args)})`);

                // Execute the tool
                const toolResult = await executeToolCall(fc.name!, fc.args as Record<string, any>);
                console.log(`✅ [TURN ${loopCount}] Resultado da tool:`, toolResult);

                // Build the function response part
                const functionResponsePart = {
                    name: fc.name!,
                    response: toolResult,
                    id: fc.id,
                };

                // Append model's function call + our function response to contents
                contents.push(response.candidates![0].content);
                contents.push({
                    role: 'user',
                    parts: [{ functionResponse: functionResponsePart }],
                });

                // Second turn — model generates natural language from function result
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents,
                    config: genConfig,
                });

                finalText = response.text || '';
                console.log(`🗣️ [TURN ${loopCount}] IA respondeu: "${finalText}"`);
            }

            // 9. FALLBACK — garantir que Z-API NUNCA receba string vazia
            if (!finalText || finalText.trim() === '') {
                console.log('⚠️ IA retornou string vazia. Usando fallback.');
                finalText = 'Entendi! E como funciona o processo hoje?';
            }

            console.log(`🗣️ RESPOSTA FINAL: "${finalText}"`);

            // 10. SALVAR A RESPOSTA DA IA NA MEMÓRIA
            await supabaseAdmin.from('chat_history').insert({
                whatsapp_number: clientNumber,
                role: 'assistant',
                content: finalText,
            });

            // 🤖 ANTI-ROBOT: Simular tempo de digitação
            const typingDelay = Math.floor(Math.random() * 2000) + 2000;
            console.log(`⏳ Simulando digitação de ${typingDelay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, typingDelay));

            // 11. Envia a mensagem de volta para o cliente no WhatsApp
            await sendWhatsAppMessage(clientNumber, finalText);

            return NextResponse.json({ status: 'success' });
        }

        return NextResponse.json({ status: 'ignored_event' });
    } catch (error) {
        console.error('❌ Erro Crítico no Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}