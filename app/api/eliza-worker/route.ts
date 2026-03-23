// app/api/eliza-worker/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { GoogleGenAI, Type } from '@google/genai';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import path from 'path';
import fs from 'fs';
import { verifySignatureAppRouter } from '@upstash/qstash/dist/nextjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`
                },
                body: JSON.stringify(payload)
            });

            const pagarmeData = await res.json();
            if (!res.ok) {
                console.error("❌ Pagar.me Erro Order:", pagarmeData);
                return { status: 'error', message: 'Desculpe, o gateway de pagamento recusou a geração. Tente novamente mais tarde.' };
            }

            const orderId = pagarmeData.id;
            const qrCode = pagarmeData.charges?.[0]?.last_transaction?.qr_code;
            const pixKey = pagarmeData.charges?.[0]?.last_transaction?.qr_code_url;

            await supabaseAdmin.from('leads_lobo').update({ pagarme_order_id: orderId }).eq('phone', clientPhone);

            return {
                status: 'success',
                order_id: orderId,
                qr_code: qrCode,
                pix_key: pixKey,
                message: "Apresente a Chave Copia e Cola (qr_code) ao cliente para que ele efetue o pagamento. O pedido expira em 1 hora."
            };
        } catch (e: any) {
            console.error("❌ Pagar.me Exception:", e);
            return { status: 'error', message: 'Falha interna na comunicação com gateway financeiro.' };
        }
    }

    if (name === 'verifyPagarmeOrder') {
        console.log(`🔍 [PAGAR.ME] Verificando pedido: ${args.order_id}`);
        const secretKey = process.env.PAGARME_SECRET_KEY;
        if (!secretKey) return { status: 'error', message: 'Chave Pagar.me não configurada.' };
        const auth = Buffer.from(`${secretKey}:`).toString('base64');

        try {
            const res = await fetch(`https://api.pagar.me/core/v5/orders/${args.order_id}`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            const pagarmeData = await res.json();

            if (pagarmeData.status === 'paid') {
                await supabaseAdmin.from('leads_lobo').update({ status: 'paid' }).eq('phone', clientPhone);
                return {
                    status: 'PAID',
                    message: "BINGO! O pagamento foi confirmado! Agradeça o lead por fechar com a Wolf Agent e acione a tool 'notify_human_specialist' para transferir o projeto."
                };
            } else {
                return {
                    status: 'PENDING',
                    message: `O status na API consta como '${pagarmeData.status}'. Avise o lead que ainda não compensou na conta e peça pra confirmar ou esperar mais um minuto.`
                };
            }
        } catch (e: any) {
            return { status: 'error', message: 'Não consegui checar o status devido a uma instabilidade no Pagar.me.' };
        }
    }

    return { status: 'error', message: `Ferramenta desconhecida: ${name}` };
}

// ==============================================================
// 📡 QSTASH WORKER HANDLER
// ==============================================================
async function handler(req: Request) {
    const t0 = performance.now();
    let t1 = t0, t2 = t0, t3 = t0, t4 = t0;

    try {
        const body = await req.json();
        const { clientNumber, clientMessage, incomingMessageId, leadContext } = body;

        console.log(`🤖 [ELIZA WORKER] Processando mensagem de ${clientNumber}...`);

        // 0. Global Kill Switch Check (Eliza specific)
        const { data: killSwitchData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'eliza_active')
            .single();

        if (killSwitchData && killSwitchData.value?.enabled === false) {
            console.log(`[KILL SWITCH] Eliza disabled via 'eliza_active'. Execution blocked.`);
            return NextResponse.json({ status: 'system_paused' }, { status: 200 });
        }

        // 0. IDEMPOTENCY CHECK
        if (incomingMessageId) {
            const { data: duplicateCheck } = await supabaseAdmin
                .from('messages')
                .select('id')
                .eq('message_id', incomingMessageId)
                .eq('role', 'assistant')
                .single();

            if (duplicateCheck) {
                console.log(`🛡️ [IDEMPOTENCY] Duplicate payload detected for msg: ${incomingMessageId}. Ignoring.`);
                return NextResponse.json({ status: 'ignored', reason: 'idempotent_duplicate' }, { status: 200 });
            }
        }

        // 8. RECUPERAR AS ÚLTIMAS 10 MENSAGENS (Memória de Curto Prazo Strict)
        const { data: history } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: true })
            .limit(10);

        const chatHistory = history || [];
        t1 = performance.now(); // After DB Fetch

        // 11. Prepara o System Prompt
        const contextPath = path.join(process.cwd(), 'business_context.json');
        const businessContext = fs.readFileSync(contextPath, 'utf8');

        // 2. Definindo o System Prompt Híbrido (Lógica em Inglês, Casca em Português)
        const elizaSystemPrompt = `

# 1. PROTOCOLO DE SAUDAÇÃO (Obrigatório)
- Se a mensagem do usuário for uma saudação (Oi, Olá, Bom dia, etc.), você DEVE iniciar sua resposta retribuindo a saudação de forma espelhada e educada ANTES de qualquer outra coisa.
- Use sempre o separador "||" para separar o cumprimento da sua próxima fala.
- EXEMPLO: "Boa tarde, tudo bem? || Pra eu te ajudar melhor..."

# 2. IDENTITY & CORE MISSION
You are Eliza, Senior Strategy Consultant and Executive Assistant to Denis, founder of Wolf Agent (a company that builds automated sales machines, high-performance websites, and AI Agents).
Your PRIMARY OBJECTIVE is NOT to simply answer questions. Your goal is to QUALIFY the lead, diagnose their main bottleneck (lack of traffic vs. lack of time), and set the stage for Denis to close the deal.
NEVER provide full pricing before the 'Gold Bifurcation Question'. Your ULTIMATE GOAL is to guide the lead through qualification, close the sale via PIX, verify payment, and handle the transition to Denis.

# 3. STRICT RULES & GUARDRAILS
- CONSTRAINT 1: NEVER hallucinate or invent services, prices, or deadlines.
- CONSTRAINT 2: NEVER send a menu or list of services. You must diagnose the client's pain point first.
- CONSTRAINT 3: NEVER use gerunds in Portuguese (e.g., do not say "vou estar verificando", say "vou verificar").
- CONSTRAINT 4: Base your answers STRICTLY on the "BUSINESS CONTEXT".
- CONSTRAINT 5: If the user asks if you are an AI, proudly admit it.
- CONSTRAINT 6: NATURAL PACING (RULE #1 - GREETING AVOIDANCE). ONLY say "Oi", "Olá", "Bom dia", or "Boa tarde" if it is the VERY FIRST message of the entire conversation. NEVER use greetings if the conversation is already ongoing. If the user sends a short 1-word greeting at the start, mirror it and ask: "Como posso ajudar você e sua empresa hoje? 😉"
- CONSTRAINT 7: MESSAGE SPLITTING (RULE #2 - MANDATORY SPLITTING). Every single response must be short, and if you change topics or ask a question, you MUST use the "||" separator. 

# 4. TOM DE VOZ E PERSONALIDADE (Tone of Voice)
- Seu tom é de uma especialista do Vale do Silício, mas com a pegada direta e ágil do Brasil.
- Você é simpática, mas vai direto ao ponto. Não enrola o cliente.

# 5. THE TRIAGE MATRIX (SDR PLAYBOOK)
YOU MUST FOLLOW THIS STRICT SEQUENCE. DO NOT SKIP STEPS.

STEP 1: The Core Operation Question
Once you have greeted the user and established basic rapport, you MUST diagnose their operational need before pitching any product.
Use this specific split-bubble approach:
"Pra eu entender exatamente o tamanho do projeto e como te ajudar: || O foco de vocês hoje é captar mais contatos/orçamentos, automatizar um WhatsApp que já não dá conta, ou vocês precisam de um sistema de vendas direto (como um e-commerce, delivery ou sistema de reservas)? 😉"

STEP 2: The Routing Protocol
Listen to the user's answer and STRICTLY apply one of the following product pitches. Do not mix them.

* PATH A (The "Captação" Lead): If they need traffic, visibility, or are a service business needing quotes.
  - Product: LP Express / Site de Alta Performance.
  - Pitch: "Perfeito. Pra quem precisa de captação, o ideal é a nossa estrutura de Site de Alta Performance. Ele funciona como uma máquina de conversão no Google. O investimento é taxa única (R$500 a R$700), sem mensalidade."

* PATH B (The "Retenção" Lead): If they have too many messages, lack time, or are dropping leads in WhatsApp.
  - Product: Agente de Inteligência Artificial.
  - Pitch: "Entendi. Se o gargalo é o tempo de resposta, nós implementamos um Agente de IA treinado com as regras da sua empresa para atender, qualificar e até agendar clientes 24h por dia, sem você precisar colocar a mão."

* PATH C (The "Transação" Lead): If they mention selling physical products, booking rooms, food delivery, or complex user flows.
  - Product: Desenvolvimento Customizado (Web Apps/Next.js/Supabase).
  - Pitch: "Legal! Projetos com transações, lojas ou sistemas de pedidos exigem uma infraestrutura mais robusta de engenharia de software, com banco de dados e painel de controle. É exatamente o que construímos sob medida."

STEP 3: The Hand-off (Closing)
Immediately after pitching the specific PATH, append the closing question in a new bubble using the separator:
"|| Faz sentido pra sua operação? Se sim, me passa seu nome e o da empresa que eu peço pro Denis te chamar pra alinhar os detalhes técnicos."

RULE: NEVER drop a price for PATH B or PATH C. Complex coding and AI agents require scoping. Only PATH A has a fixed anchor price.

# 5. EXEMPLOS DE DIÁLOGO (FEW-SHOT PROMPTING - ALL MUST USE || SPLITTER)
User: "Qual o valor do site?"
Eliza: "Antes de falarmos de investimento, preciso entender seu cenário! || Hoje o maior desafio de vocês é que pouca gente chama, ou chama bastante mas falta tempo pra responder rápido?"

User: "Cara, a gente não tem tempo de responder ninguém, é uma loucura."
Eliza: "Imaginei! É uma dor clássica. || Nesse caso, um site novo não resolve, o que vocês precisam é de um Agente Autônomo de WhatsApp (uma IA inteligente) pra atender e filtrar essa galera 24h por dia, igual eu tô fazendo com você agora rs. || Posso pedir pro Denis assumir o chat pra te mostrar como ele instala isso pra vocês?"

User: "Achei meio caro"
Eliza: "Entendo perfeitamente que o fluxo de caixa é importante. || Mas me diz uma coisa: quanto custa pra sua empresa hoje continuar perdendo clientes que procuram vocês no Google e não acham nada? || É uma taxa única justamente pra tapar esse ralo financeiro de vez."

# 6. BUSINESS CONTEXT (Base de Conhecimento Oficial)
Use STRICTLY the following information to answer business-related questions:
${businessContext}
`;

        let systemPrompt = elizaSystemPrompt;
        systemPrompt += leadContext || '';
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

        // ❄️ [COLD START INJECTOR] If history is completely empty, satisfy the Gemini SDK requirements
        if (contents.length === 0) {
            console.log(`❄️ [COLD START] Contexto vazio detectado. Injetando clientMessage manualmente.`);
            contents.push({
                role: 'user',
                parts: [{ text: clientMessage || 'Olá' }]
            });
        }

        // 13. CALL GEMINI VIA @google/genai
        console.log('🧠 IA Pensando com base no histórico e contexto do lead...');
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

        const genConfig: any = {
            tools: [{ functionDeclarations }],
            systemInstruction: systemPrompt,
        };

        const callGeminiWithTimeout = async (payload: any) => {
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('LLM_TIMEOUT')), 12000)
            );
            return Promise.race([
                ai.models.generateContent(payload),
                timeoutPromise
            ]);
        };

        let response: any;
        let isTimeout = false;
        let finalText = '';
        let qualifyCalled = false;

        try {
            response = await callGeminiWithTimeout({
                model: 'gemini-2.5-flash',
                contents,
                config: genConfig,
            });
        } catch (e: any) {
            if (e.message === 'LLM_TIMEOUT') {
                console.log('⏳ [LLM TIMEOUT] Gemini API excedeu 12s. Disparando fallback imediato.');
                isTimeout = true;
            } else {
                console.error('🚨 [GEMINI ERROR] Falha na estruturação/comunicação da API do Google:', e.message || e);
                isTimeout = true; // Trigger the emergency fallback string automatically
            }
        }

        if (isTimeout) {
            finalText = 'Boa tarde! Tudo bem? || Como posso ajudar você e sua empresa hoje? 😉';
        } else {
            // 14. FUNCTION CALLING LOOP (max 3 rounds)
            finalText = response.text || '';
            let loopCount = 0;

            while (response && response.functionCalls && response.functionCalls.length > 0 && loopCount < 3) {
                loopCount++;
                const fc = response.functionCalls[0];
                console.log(`🔧 [TURN ${loopCount}] Tool chamada: ${fc.name}(${JSON.stringify(fc.args)})`);

                if (fc.name === 'qualifyLeadContext') {
                    qualifyCalled = true;
                }

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

                try {
                    response = await callGeminiWithTimeout({
                        model: 'gemini-2.5-flash',
                        contents,
                        config: genConfig,
                    });
                } catch (e: any) {
                    if (e.message === 'LLM_TIMEOUT') {
                        console.log(`⏳ [LLM TIMEOUT] Gemini API excedeu 12s no turno ${loopCount}. Abortando loop para fallback.`);
                        isTimeout = true;
                        finalText = 'Boa tarde! Tudo bem? || Como posso ajudar você e sua empresa hoje? 😉';
                        break;
                    } else {
                        throw e;
                    }
                }

                if (!isTimeout && response.text?.trim()) {
                    finalText += (finalText ? ' || ' : '') + response.text.trim();
                }
                console.log(`🗣️ [TURN ${loopCount}] IA respondeu: "${response.text || ''}"`);
            }
        }
        
        t2 = performance.now(); // After LLM

        // 14.5 DIRECT FALLBACK CHECK (Safety Net)
        const msgLower = (clientMessage || '').toLowerCase().trim();
        const aiResponseLower = finalText.toLowerCase();
        
        // Anti-Loop Failsafe: Prevent repeating the bifurcation question after qualification
        if (qualifyCalled && aiResponseLower.includes('gargalo')) {
            console.log('🚨 [SAFETY NET] LLM tentou repetir a bifurcação após qualificar! Forçando Step 2.');
            finalText = 'Perfeito, entendi. || E como vocês têm tentado resolver essa falta de tráfego até agora?';
        } else if (msgLower.length < 10 && (aiResponseLower.includes('gargalo') || aiResponseLower.includes('braço'))) {
            console.log('🚨 [SAFETY NET] Mensagem curta detectada, mas IA tentou mandar textwall/gargalo. Forçando fallback!');
            finalText = 'Boa tarde! Tudo bem? || Como posso ajudar você e sua empresa hoje? 😉';
        }

        // 15. FALLBACK OR GREETING BYPASS
        if (!finalText || finalText.trim() === '') {
            console.log('⚠️ IA retornou string vazia. Avaliando fallback...');
            
            // Checa se é apenas um oi/olá/bom dia/boa tarde
            if (msgLower === 'oi' || msgLower === 'olá' || msgLower === 'ola' || 
                msgLower === 'boa tarde' || msgLower === 'bom dia' || msgLower === 'boa noite' || 
                msgLower === 'opa') {
                finalText = 'Boa tarde! Tudo bem? || Como posso ajudar você e sua empresa hoje? 😉';
            } else {
                finalText = 'Entendi! E como funciona o processo hoje?';
            }
        }

        // PRE-STEALTH: Split the chunks
        let chunks = finalText.split('||').map(c => c.trim()).filter(c => c !== '');
        if (chunks.length === 0) {
            finalText = 'Boa tarde! Tudo bem? || Como posso ajudar você e sua empresa hoje? 😉';
            chunks = finalText.split('||').map(c => c.trim()).filter(c => c !== '');
        }

        // SAFETY NET: Hard-Cap Hallucinations
        // Never send more than 2 bubbles, no matter what the LLM hallucinates
        chunks = chunks.slice(0, 2);

        console.log(`🗣️ RESPOSTA FINAL: "${finalText}"`);

        // 17. Envia a mensagem de volta para o cliente no WhatsApp
        console.log(`🚀 [ELIZA WORKER] Iniciando envio IMEDIATO para ${clientNumber}`);
        
        // Zero-Sleep Dispatch Loop
        // Evolution API deals with the message queue and typing delays natively
        for (const textChunk of chunks) {
            try {
                // By omitting the 3rd argument, sendWhatsAppMessage uses its built-in formula
                // AND it already inherently wraps within 'withWhatsAppLock'.
                await sendWhatsAppMessage(clientNumber, textChunk); 
            } catch (err) {
                console.error(`❌ Erro ao enviar bolha:`, err);
            }
        }

        t3 = performance.now(); // After WA Send

        // 16. SALVAR A RESPOSTA DA IA NA MEMÓRIA
        try {
            await supabaseAdmin.from('messages').insert({
                lead_phone: clientNumber,
                role: 'assistant',
                content: finalText,
                message_id: incomingMessageId
            });
        } catch (insertErr: any) {
            console.error(`⚠️ [ELIZA WORKER] Save handled gracefully (possibly duplicate):`, insertErr.message);
        }

        // 📊 CIRCUIT BREAKER: Increment reply_count after Eliza responds
        try {
            await supabaseAdmin.rpc('increment_reply_count', { lead_phone: clientNumber });
            console.log(`📊 [CIRCUIT BREAKER] reply_count incrementado para ${clientNumber}`);
        } catch {
            // Fallback if RPC doesn't exist: manual increment
            const { data: currentLead } = await supabaseAdmin
                .from('leads_lobo')
                .select('reply_count')
                .eq('phone', clientNumber)
                .single();
            await supabaseAdmin
                .from('leads_lobo')
                .update({ reply_count: ((currentLead?.reply_count || 0) + 1) })
                .eq('phone', clientNumber);
            console.log(`📊 [CIRCUIT BREAKER] reply_count incrementado via fallback para ${clientNumber}`);
        }

        t4 = performance.now(); // After DB Save

        const dbFetchMs = Math.max(0, t1 - t0).toFixed(0);
        const llmMs = Math.max(0, t2 - t1).toFixed(0);
        const waApiMs = Math.max(0, t3 - t2).toFixed(0);
        const dbSaveMs = Math.max(0, t4 - t3).toFixed(0);
        const totalMs = Math.max(0, t4 - t0).toFixed(0);

        console.log(`📊 [PROFILER] Total: ${totalMs}ms | DB Fetch: ${dbFetchMs}ms | Gemini LLM: ${llmMs}ms | WA Send: ${waApiMs}ms | DB Save: ${dbSaveMs}ms`);

        // Free up QStash connection immediately!
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ Erro Crítico no Worker:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const POST = verifySignatureAppRouter(handler);
