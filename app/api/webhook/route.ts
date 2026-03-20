// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { GoogleGenAI, Type } from '@google/genai';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { generatePrompt } from '../../../lib/agent/prompt';
import { normalizePhone } from '../../../lib/utils/phone';

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
    {
        name: 'notify_human_specialist',
        description: 'Use this tool ONLY when the lead explicitly agrees to a meeting, asks to speak with a human specialist, or demonstrates high buying intent. This alerts the human sales team to take over the WhatsApp chat or send the calendar link.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                urgency_level: { type: Type.STRING, description: 'Nível de urgência: "high" ou "medium"' },
                summary: { type: Type.STRING, description: 'Um breve resumo do que o lead deseja' },
            },
            required: ['urgency_level', 'summary'],
        },
    },
];

// ==============================================================
// 🛠️ TOOL EXECUTION (Supabase writes)
// ==============================================================
async function executeToolCall(name: string, args: Record<string, any>, clientPhone: string): Promise<Record<string, any>> {
    if (name === 'save_lead_data') {
        console.log(`💾 [LEAD DATA CAPTURED]:`, args);
        const updateData: Record<string, any> = {};
        if (args.name) updateData.name = args.name;
        if (args.company) updateData.niche = args.company; // 'empresa' maps to 'niche' on the English schema conventionally 
        if (args.pain_point) updateData.main_pain = args.pain_point;
        if (args.revenue) updateData.revenue = args.revenue;
        updateData.status = 'talking'; // mapped 'em_conversacao' to 'talking' based on English schemas!

        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .update(updateData)
            .eq('phone', args.phone);

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

    if (name === 'notify_human_specialist') {
        console.log(`🔥 [HOT LEAD ALERT - Urgency: ${args.urgency_level}]: ${args.summary} | Phone: ${clientPhone}`);

        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .update({ status: 'hot_lead' })
            .eq('phone', clientPhone);

        if (error) {
            console.error('❌ Erro ao atualizar status para hot_lead:', error);
            return { status: 'error', message: 'Falha ao notificar o especialista.' };
        }
        return { status: 'success', message: 'O especialista (Denis) foi notificado e assumirá o controle do chat em instantes.' };
    }

    return { status: 'error', message: `Ferramenta desconhecida: ${name}` };
}

// ==============================================================
// 📡 WEBHOOK HANDLER
// ==============================================================
export async function POST(req: Request) {
    let processingPhone = null; // Para cleanup no finally

    try {
        const body = await req.json();
        console.log("FULL EVOLUTION BODY:", JSON.stringify(body, null, 2));

        // 1. Filtro e Extração de Mensagem (Evolution API v2 e fallback antigo)
        let clientNumber = null;
        let clientMessage = null;
        let isValidMessage = false;

        const isEvolution = body.event === 'MESSAGES_UPSERT' || body.event === 'messages.upsert';

        if (isEvolution) {
            let dataObj = body.data;
            // Evolution API v2 sometimes sends data as an array.
            if (Array.isArray(body.data)) {
                dataObj = body.data[0];
            }

            if (dataObj?.key && !dataObj.key.remoteJid?.includes('@g.us')) {
                const isFromMe = dataObj.key.fromMe === true;

                // Ensure clientNumber is extracted from the correct field prioritizing the real phone number (remoteJidAlt vs LID)
                const rawJid = (dataObj.key.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net'))
                    ? String(dataObj.key.remoteJidAlt)
                    : String(dataObj.key.remoteJid);

                clientNumber = normalizePhone(rawJid);

                const messageObj = dataObj.message;
                if (messageObj) {
                    clientMessage = messageObj.conversation || messageObj.extendedTextMessage?.text || messageObj.imageMessage?.caption || messageObj.videoMessage?.caption || '';
                }

                if (clientMessage && clientMessage.trim().length > 0) {
                    if (isFromMe) {
                        const cmd = clientMessage.trim();
                        if (cmd === '/pausar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                            await sendWhatsAppMessage(clientNumber, "🛑 *[SISTEMA]* IA Pausada pelo Admin.");
                            return NextResponse.json({ status: 'admin_command', command: 'pausar' }, { status: 200 });
                        } else if (cmd === '/retomar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: false }).eq('phone', clientNumber);
                            await sendWhatsAppMessage(clientNumber, "▶️ *[SISTEMA]* IA Reativada.");
                            return NextResponse.json({ status: 'admin_command', command: 'retomar' }, { status: 200 });
                        }
                        
                        // Ignore other fromMe messages early
                        return NextResponse.json({ status: 'ignored', reason: 'fromMe_not_command' }, { status: 200 });
                    }

                    isValidMessage = true;
                }
            }
        } else if (body.isGroup === false && body.text && body.text.message) {
            const isFromMe = body.fromMe === true;
            clientNumber = normalizePhone(body.phone || '');
            clientMessage = body.text.message;
            if (clientMessage && clientMessage.trim().length > 0) {
                if (isFromMe) {
                    const cmd = clientMessage.trim();
                    if (cmd === '/pausar') {
                        await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                        await sendWhatsAppMessage(clientNumber, "🛑 *[SISTEMA]* IA Pausada pelo Admin.");
                        return NextResponse.json({ status: 'admin_command', command: 'pausar' }, { status: 200 });
                    } else if (cmd === '/retomar') {
                        await supabaseAdmin.from('leads_lobo').update({ ai_paused: false }).eq('phone', clientNumber);
                        await sendWhatsAppMessage(clientNumber, "▶️ *[SISTEMA]* IA Reativada.");
                        return NextResponse.json({ status: 'admin_command', command: 'retomar' }, { status: 200 });
                    }
                    
                    return NextResponse.json({ status: 'ignored', reason: 'fromMe_not_command' }, { status: 200 });
                }

                isValidMessage = true;
            }
        }

        if (isValidMessage && clientNumber && clientMessage) {
            console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);



            // --- DEBOUNCER / BATCHING LOGIC START ---

            // 2. Fetch Lead
            let { data: lead, error: leadError } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('phone', clientNumber)
                .maybeSingle();

            if (leadError) {
                console.error('❌ Erro ao buscar lead no Supabase:', leadError);
            }

            // Kill Switch: Human Takeover
            if (lead && (lead as any).ai_paused === true) {
                console.log(`🛑 [KILL SWITCH ATIVO] Humano no controle para o número: ${clientNumber}`);
                return NextResponse.json({ status: 'ignored', reason: 'human_takeover' }, { status: 200 });
            }

            // 3. Create lead if new
            if (!lead) {
                console.log(`🌱 Lead novo. Criando registro como organico_inbound...`);
                const { data: newLead } = await supabaseAdmin.from('leads_lobo').insert({
                    phone: clientNumber,
                    status: 'organico_inbound',
                    name: 'Lead inbound',
                    message_buffer: '',
                    is_processing: false,
                }).select().single();

                lead = newLead;
            }

            // 4. Append to Buffer
            const currentBuffer = lead?.message_buffer || '';
            const newBuffer = currentBuffer ? `${currentBuffer}\n${clientMessage}` : clientMessage;

            await supabaseAdmin
                .from('leads_lobo')
                .update({ message_buffer: newBuffer })
                .eq('phone', clientNumber);

            // 5. Lock Check
            if (lead?.is_processing === true) {
                console.log(`⏳ Lock Ativo para ${clientNumber}. Mensagem anexada ao buffer. Abortando execução isolada.`);
                return NextResponse.json({ status: 'Buffered', buffer: newBuffer }, { status: 200 });
            }

            // If not processing...
            console.log(`🔒 Iniciando Lock (is_processing = true) para ${clientNumber}...`);
            await supabaseAdmin
                .from('leads_lobo')
                .update({ is_processing: true })
                .eq('phone', clientNumber);

            // Mark for cleanup in finally block
            processingPhone = clientNumber;

            // 6. Wait for rapid-fire messages (4s window)
            console.log(`🕒 Aguardando 4 segundos por mais mensagens de ${clientNumber}...`);
            await new Promise(resolve => setTimeout(resolve, 4000));

            // 7. Fetch final buffer and lead state
            const { data: finalLead } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('phone', clientNumber)
                .single();

            const finalMessageBuffer = finalLead?.message_buffer || newBuffer;

            console.log(`📦 Buffer final processado: "${finalMessageBuffer}"`);

            // --- GODSPEED UNIFICATION (Pre-Flight Context) ---
            let leadContext = '';

            if (finalLead) {
                if (finalLead.status === 'contacted') {
                    leadContext = `\n\n[CONTEXTO DO LEAD]:
Atenção: Você está falando com ${finalLead.name || 'o cliente'}. Nosso sistema automatizado acabou de enviar uma isca perguntando se eles usam IA no atendimento. Continue a conversa a partir dessa premissa, qualificando a dor deles de forma natural.
Empresa/Nicho: ${finalLead.niche || 'Não informada'}.
Dor Principal: ${finalLead.main_pain || 'Não informada'}.`;

                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ status: 'talking' })
                        .eq('phone', clientNumber);
                    console.log(`🔄 Status do lead atualizado para 'talking'`);
                } else {
                    leadContext = `\n\n[CONTEXTO DO LEAD]:
Você está falando com ${finalLead.name || 'o cliente'}.
O status atual dele na base é: ${finalLead.status}.
Empresa/Nicho: ${finalLead.niche || 'Não informada'}.
Dor Principal: ${finalLead.main_pain || 'Não informada'}.
${finalLead.status === 'pending' ? 'Este lead veio de uma prospecção ativa via Lobo. Use isso a seu favor.' : ''}`;
                }
            }

            if (finalLead?.status === 'organico_inbound') {
                leadContext = `\n\n[CONTEXTO DO LEAD]: Este é um lead orgânico inbound novo. Ele acabou de mandar mensagem. Colete o Nome, Empresa e Dor para salvar usando a tool.`;
            }

            // 8. Busca o cérebro do Agente no Banco de Dados
            const { data: config, error: configError } = await supabaseAdmin
                .from('agent_configs')
                .select('*, organizations(name)')
                .limit(1)
                .single();

            if (configError || !config) {
                console.log('🚨 ERRO: Agente não encontrado no banco de dados.');
                return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
            }

            // 9. SALVAR A MENSAGEM DO CLIENTE NA MEMÓRIA (O BUFFER COMPLETO)
            await supabaseAdmin.from('chat_history').insert({
                whatsapp_number: clientNumber,
                role: 'user',
                content: finalMessageBuffer,
            });

            // 10. RECUPERAR AS ÚLTIMAS 10 MENSAGENS (Memória de Curto Prazo)
            const { data: history } = await supabaseAdmin
                .from('chat_history')
                .select('role, content')
                .eq('whatsapp_number', clientNumber)
                .order('created_at', { ascending: false })
                .limit(10);

            const chatHistory = (history || []).reverse();

            // 11. Prepara o System Prompt
            let systemPrompt = generatePrompt(config.organizations.name, config.system_prompt);
            systemPrompt += leadContext;
            systemPrompt += `\n\n[IMPORTANTE - CAPTURA DE DADOS]: Sempre que usar a ferramenta 'save_lead_data', você OBRIGATORIAMENTE deve passar o número de telefone do usuário: '${clientNumber}' no parâmetro 'phone'.`;
            systemPrompt += `\n\n[IMPORTANTE - REGRAS DE AGENDAMENTO/HANDOFF]:
1. É estritamente PROIBIDO sugerir ligações telefônicas tradicionais.
2. Prefira continuar o fechamento via WhatsApp de forma assíncrona ou sugerir uma rápida chamada de vídeo (Meet/Zoom).
3. Quando o lead concordar com uma reunião, pedir para falar com um humano, ou demonstrar alta intenção de compra, você DEVE acionar a ferramenta 'notify_human_specialist' imediatamente.`;

            // 12. BUILD CONTENTS ARRAY (Google Gen AI format)
            const contents: any[] = chatHistory.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }));

            // 13. CALL GEMINI VIA @google/genai
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

            // 14. FUNCTION CALLING LOOP (max 3 rounds)
            let finalText = response.text || '';
            let loopCount = 0;

            while (response.functionCalls && response.functionCalls.length > 0 && loopCount < 3) {
                loopCount++;
                const fc = response.functionCalls[0];
                console.log(`🔧 [TURN ${loopCount}] Tool chamada: ${fc.name}(${JSON.stringify(fc.args)})`);

                const toolResult = await executeToolCall(fc.name!, fc.args as Record<string, any>, clientNumber);
                console.log(`✅ [TURN ${loopCount}] Resultado da tool:`, toolResult);

                const functionResponsePart = {
                    name: fc.name!,
                    response: toolResult,
                    id: fc.id,
                };

                contents.push(response.candidates![0].content);
                contents.push({
                    role: 'user',
                    parts: [{ functionResponse: functionResponsePart }],
                });

                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents,
                    config: genConfig,
                });

                finalText = response.text || '';
                console.log(`🗣️ [TURN ${loopCount}] IA respondeu: "${finalText}"`);
            }

            // 15. FALLBACK
            if (!finalText || finalText.trim() === '') {
                console.log('⚠️ IA retornou string vazia. Usando fallback.');
                finalText = 'Entendi! E como funciona o processo hoje?';
            }

            console.log(`🗣️ RESPOSTA FINAL: "${finalText}"`);

            // 16. SALVAR A RESPOSTA DA IA NA MEMÓRIA
            await supabaseAdmin.from('chat_history').insert({
                whatsapp_number: clientNumber,
                role: 'assistant',
                content: finalText,
            });

            // 🤖 ANTI-ROBOT: Simular tempo de digitação
            const typingDelay = Math.floor(Math.random() * 2000) + 2000;
            console.log(`⏳ Simulando digitação de ${typingDelay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, typingDelay));

            // 17. Envia a mensagem de volta para o cliente no WhatsApp
            await sendWhatsAppMessage(clientNumber, finalText);

            return NextResponse.json({ status: 'success' });
        }

        return NextResponse.json({ status: 'ignored_event' });
    } catch (error) {
        console.error('❌ Erro Crítico no Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        // --- CLEANUP LOCK & BUFFER ---
        if (processingPhone) {
            console.log(`🧹 Removendo Lock e limpando buffer para ${processingPhone}...`);
            await supabaseAdmin
                .from('leads_lobo')
                .update({ is_processing: false, message_buffer: '' })
                .eq('phone', processingPhone);
        }
    }
}