// scripts/agents/eliza-worker.ts

import { GoogleGenAI, Type } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import fs from 'fs';
import path from 'path';

// Força o timezone para BRT nos logs
process.env.TZ = 'America/Sao_Paulo';

console.log('🐺 [ELIZA] Inicializando cérebro via @google/genai...');

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
    {
        name: 'qualifyLeadContext',
        description: 'Usa esta função IMEDIATAMENTE após o lead responder à pergunta de bifurcação para extrair o gargalo do cliente e salvar no banco de dados.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                main_bottleneck: { type: Type.STRING, description: "Se o cliente tem poucos contatos, retorne 'LACK_OF_TRAFFIC'. Se tem muitos mas demora a responder, retorne 'LACK_OF_TIME'. Se não estiver claro, retorne 'UNKNOWN'." },
                lead_temperature: { type: Type.STRING, description: "Retorne 'HOT' se pediu preço/urgência. 'WARM' se está tirando dúvidas. 'COLD' se foi rude ou sem interesse." },
                pain_summary: { type: Type.STRING, description: "Resumo em 1 frase (em português) sobre a dor relatada. Ex: 'Recebe contatos do Insta, mas demora 2h para responder.'" },
                lead_source: { type: Type.STRING, description: "A origem de como o lead conheceu a empresa. Retorne 'INSTAGRAM', 'GOOGLE', 'INDICACAO' ou 'DESCONHECIDO' baseado na resposta dele." }
            },
            required: ['main_bottleneck', 'lead_temperature', 'pain_summary', 'lead_source'],
        },
    },
    {
        name: "generatePagarmePix",
        description: "Usa esta função quando o lead decidir comprar. Gera um Pedido (Order) via Pagar.me e retorna a Chave PIX Copia e Cola.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                product_id: {
                    type: Type.STRING,
                    enum: ["LP_EXPRESS", "SITE_ALTA_PERFORMANCE", "AGENTE_IA"],
                    description: "O ID do produto."
                },
                lead_email: {
                    type: Type.STRING,
                    description: "O e-mail do lead (solicite se não tiver)."
                },
                lead_name: {
                    type: Type.STRING,
                    description: "O nome do lead (solicite se não tiver)."
                }
            },
            required: ["product_id", "lead_email", "lead_name"]
        }
    },
    {
        name: "verifyPagarmeOrder",
        description: "Verifica na API do Pagar.me se o pedido (Order) foi pago via PIX.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                order_id: {
                    type: Type.STRING,
                    description: "O ID do pedido gerado anteriormente (começa com 'or_')."
                }
            },
            required: ["order_id"]
        }
    }
];

// ==============================================================
// 🛠️ TOOL EXECUTION (Supabase writes)
// ==============================================================
async function executeToolCall(name: string, args: Record<string, any>, clientPhone: string): Promise<Record<string, any>> {
    if (name === 'save_lead_data') {
        console.log(`💾 [LEAD DATA CAPTURED]:`, args);
        const updateData: Record<string, any> = {};
        if (args.name) updateData.name = args.name;
        if (args.company) updateData.niche = args.company;
        if (args.pain_point) updateData.main_pain = args.pain_point;
        if (args.revenue) updateData.revenue = args.revenue;

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
        await supabaseAdmin.from('leads_lobo').update({ status: 'needs_human', needs_human: true }).eq('phone', clientPhone);
        return { status: 'escalated', message: 'Um especialista foi alertado e assumirá o chat.' };
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
        return { status: 'success', message: 'O especialista foi notificado e assumirá o controle do chat em instantes.' };
    }

    if (name === 'qualifyLeadContext') {
        console.log(`🐺 [ELIZA] Extraindo inteligência:`, args);
        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .update({
                main_bottleneck: args.main_bottleneck,
                lead_temperature: args.lead_temperature,
                pain_summary: args.pain_summary,
                lead_source: args.lead_source
            })
            .eq('phone', clientPhone);

        if (error) {
            console.error('❌ Erro ao salvar inteligência no Supabase:', error);
            return { status: 'error', message: 'Falha ao salvar inteligência do lead.' };
        }
        return { status: 'success', message: 'Database updated. Now reply to the user naturally based on this new context.' };
    }

    if (name === 'generatePagarmePix') {
        console.log(`🤑 [PAGAR.ME] Gerando Pedido PIX para: ${args.lead_name} (${args.product_id})`);
        let amountCents = 100000;
        if (args.product_id === 'LP_EXPRESS') amountCents = 99700;
        else if (args.product_id === 'SITE_ALTA_PERFORMANCE') amountCents = 250000;
        else if (args.product_id === 'AGENTE_IA') amountCents = 150000;

        const secretKey = process.env.PAGARME_SECRET_KEY;
        if (!secretKey) return { status: 'error', message: 'Chave Pagar.me não configurada no servidor.' };

        const auth = Buffer.from(`${secretKey}:`).toString('base64');
        const payload = {
            customer: { name: args.lead_name, email: args.lead_email, type: "individual" },
            items: [{ amount: amountCents, description: args.product_id, quantity: 1 }],
            payments: [{ payment_method: "pix", pix: { expires_in: 3600 } }]
        };

        try {
            const res = await fetch('https://api.pagar.me/core/v5/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
                body: JSON.stringify(payload)
            });
            const pagarmeData = await res.json();
            if (!res.ok) {
                console.error("❌ Pagar.me Erro Order:", pagarmeData);
                return { status: 'error', message: 'O gateway de pagamento recusou a geração. Tente mais tarde.' };
            }
            await supabaseAdmin.from('leads_lobo').update({ pagarme_order_id: pagarmeData.id }).eq('phone', clientPhone);
            return {
                status: 'success',
                order_id: pagarmeData.id,
                qr_code: pagarmeData.charges?.[0]?.last_transaction?.qr_code,
                pix_key: pagarmeData.charges?.[0]?.last_transaction?.qr_code_url,
                message: "Apresente a Chave Copia e Cola (qr_code) ao cliente. Expira em 1 hora."
            };
        } catch (e: any) {
            console.error("❌ Pagar.me Exception:", e);
            return { status: 'error', message: 'Falha interna na comunicação com gateway.' };
        }
    }

    if (name === 'verifyPagarmeOrder') {
        console.log(`🔍 [PAGAR.ME] Verificando pedido: ${args.order_id}`);
        const secretKey = process.env.PAGARME_SECRET_KEY;
        if (!secretKey) return { status: 'error', message: 'Chave Pagar.me não configurada.' };
        const auth = Buffer.from(`${secretKey}:`).toString('base64');

        try {
            const res = await fetch(`https://api.pagar.me/core/v5/orders/${args.order_id}`, { headers: { 'Authorization': `Basic ${auth}` } });
            const pagarmeData = await res.json();
            if (pagarmeData.status === 'paid') {
                await supabaseAdmin.from('leads_lobo').update({ status: 'paid' }).eq('phone', clientPhone);
                return { status: 'PAID', message: "BINGO! O pagamento foi confirmado! Agradeça e acione notify_human_specialist." };
            } else {
                return { status: 'PENDING', message: `O status na API consta como '${pagarmeData.status}'. Avise o lead que ainda não compensou.` };
            }
        } catch (e: any) {
            return { status: 'error', message: 'Falha ao checar status.' };
        }
    }

    return { status: 'error', message: `Ferramenta desconhecida: ${name}` };
}

// ==============================================================
// 🧠 PROCESSAMENTO DO LEAD
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    console.log(`\n===========================================`);
    console.log(`🧠 [ELIZA] Iniciando processamento para: ${clientNumber}`);

    try {
        // 1. Marca como "Em Análise" (Impede que outro worker pegue ao mesmo tempo)
        await supabaseAdmin
            .from('leads_lobo')
            .update({ status: 'eliza_analyzing' })
            .eq('id', lead.id);

        // 2. Traz histórico de mensagens
        const { data: history } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: true })
            .limit(30);

        const chatHistory = history || [];

        // 3. Monta o Prompt System
        const currentHour = new Date().getHours();
        let timeGreeting = "Bom dia";
        if (currentHour >= 12 && currentHour < 18) timeGreeting = "Boa tarde";
        else if (currentHour >= 18) timeGreeting = "Boa noite";

        const contextPath = path.join(process.cwd(), 'business_context.json');
        const businessContext = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf8') : '';

        const hasPreviousAssistantMessage = chatHistory.some((msg: any) => msg.role === 'assistant');
        const isOrganic = lead.status === 'organic_inbound' || !hasPreviousAssistantMessage;

        let dynamicInstruction = isOrganic
            ? "\n\n[STATE: NEW INBOUND] Este é um contato novo. Aja com naturalidade e qualifique a dor inicial."
            : "\n\n[STATE: ACTIVE CONVERSATION] O Lobo ou a equipe já iniciou contato. Leia o histórico e responda dando continuidade à última pergunta.";

        const systemPrompt = `
# 1. IDENTITY & CORE MISSION
You are Eliza, an AI Sales Development Representative (SDR) and Tech Assistant to Denis at meatende.ai.
CRITICAL INSTRUCTION: ALL YOUR RESPONSES MUST BE IN NATURAL BRAZILIAN PORTUGUESE (PT-BR).

# 2. STRICT RULES & GUARDRAILS
- NEVER hallucinate services or prices.
- NEVER send a list of services. Diagnose the client first.
- If the user asks if you are an AI, proudly admit it.
- MESSAGE SPLITTING: Split distinct ideas using "||" to create separate chat bubbles (max 3 bubbles).

# 3. SDR FUNNEL
Step 1: Identify if their pain is lack of traffic (needs Landing Page) or lack of time/attendance (needs AI Agent).
Step 2: Pitch the solution briefly and ask a closing question ("Faz sentido para você?").
Step 3: If they agree or ask for pricing, SILENTLY CALL 'notify_human_specialist' and tell them Denis will take over.

# 4. BUSINESS CONTEXT
${businessContext}
${dynamicInstruction}
\n[LEAD DATA] Telefone atual: ${clientNumber}
`;

        // 4. Prepara conteúdo para o Gemini
        const contents: any[] = chatHistory.map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        if (contents.length === 0) {
            console.log(`❄️ [COLD START] Contexto vazio. Abortando.`);
            await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
            return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
        const genConfig: any = { tools: [{ functionDeclarations }], systemInstruction: systemPrompt };

        // 5. Chamada LLM com Timeout
        console.log('⏳ Chamando Gemini...');
        let response: any;
        let isTimeout = false;

        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LLM_TIMEOUT')), 15000));
        try {
            response = await Promise.race([
                ai.models.generateContent({ model: 'gemini-2.5-flash', contents, config: genConfig }),
                timeoutPromise
            ]);
        } catch (e: any) {
            isTimeout = true;
            console.error('🚨 [GEMINI ERROR]:', e.message);
        }

        let finalText = isTimeout ? `${timeGreeting}! Como posso ajudar você hoje? 😉` : (response?.text || '');
        let qualifyCalled = false;
        let loopCount = 0;

        // 6. Tool Loop
        while (response && response.functionCalls && response.functionCalls.length > 0 && loopCount < 3) {
            loopCount++;
            const fc = response.functionCalls[0];
            console.log(`🔧 [TURN ${loopCount}] Executando Tool: ${fc.name}`);

            if (fc.name === 'qualifyLeadContext') qualifyCalled = true;

            const toolResult = await executeToolCall(fc.name!, fc.args as Record<string, any>, clientNumber);

            const functionResponsePart = { name: fc.name!, response: toolResult, id: fc.id };
            contents.push(response.candidates![0].content);
            contents.push({ role: 'user', parts: [{ functionResponse: functionResponsePart }] });

            try {
                response = await Promise.race([
                    ai.models.generateContent({ model: 'gemini-2.5-flash', contents, config: genConfig }),
                    timeoutPromise
                ]);
                if (response.text?.trim()) {
                    finalText += (finalText ? ' || ' : '') + response.text.trim();
                }
            } catch (e) {
                console.log(`⏳ Tool Timeout no turno ${loopCount}`);
                break;
            }
        }

        if (!finalText || finalText.trim() === '') {
            finalText = 'Entendi! E como funciona o seu processo hoje?';
        }

        // 7. Envio via WhatsApp
        let chunks = String(finalText).split('||').map((c: string) => c.trim()).filter((c: string) => c !== '').slice(0, 3);
        console.log(`📤 Resposta gerada:`, chunks);

        let accumulatedDelayMs = 0;
        await sendWhatsAppPresence(clientNumber, 'composing');

        for (const textChunk of chunks) {
            const bubbleTypingTimeMs = Math.max(2000, Math.min((textChunk.length / 15) * 1000, 10000));
            accumulatedDelayMs += bubbleTypingTimeMs;

            await sendWhatsAppMessage(clientNumber, textChunk, accumulatedDelayMs);

            if (chunks.length > 1) {
                accumulatedDelayMs += Math.floor(Math.random() * 1500) + 1500;
            }
        }

        // 8. Salvar no Banco
        await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber,
            role: 'assistant',
            content: finalText,
            message_id: `msg_ai_${Date.now()}`
        });

        // 9. Retornar Estado
        const { data: finalCheck } = await supabaseAdmin
            .from('leads_lobo')
            .select('status')
            .eq('id', lead.id)
            .single();

        if (finalCheck && finalCheck.status === 'eliza_analyzing') {
            await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
        }

        console.log(`✅ [ELIZA] Sucesso para ${clientNumber}`);

    } catch (error) {
        console.error(`❌ [ELIZA] Falha Crítica ao processar ${lead.phone}:`, error);
        // Destrava em caso de erro
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

// ==============================================================
// 🔄 POLLING ENGINE (The Loop)
// ==============================================================
async function startPolling() {
    console.log('🔄 [WORKER] Loop de escuta iniciado. Aguardando leads em eliza_processing...');

    while (true) {
        try {
            // Busca apenas 1 lead com o status eliza_processing que não esteja pausado
            const { data: leads, error } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('status', 'eliza_processing')
                .eq('ai_paused', false)
                .order('updated_at', { ascending: true })
                .limit(1);

            if (error) {
                console.error('❌ Erro no Polling DB:', error);
                await new Promise(res => setTimeout(res, 10000));
                continue;
            }

            if (leads && leads.length > 0) {
                const lead = leads[0];
                await processLead(lead);
            } else {
                // Se não achou nada, dorme por 5 segundos antes de checar de novo
                await new Promise(res => setTimeout(res, 5000));
            }
        } catch (fatalError) {
            console.error('🔥 Fatal Worker Crash:', fatalError);
            await new Promise(res => setTimeout(res, 10000));
        }
    }
}

// Inicia o motor
startPolling();