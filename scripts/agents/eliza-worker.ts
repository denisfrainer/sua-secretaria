import { GoogleGenAI } from '@google/genai'; // Se estiver usando o SDK unificado
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import http from 'http';

/**
 * ELIZA WORKER - FINAL PRODUCTION VERSION (SDK @google/genai)
 * Target Model: gemini-2.5-flash
 */

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

process.env.TZ = 'America/Sao_Paulo';

// ==============================================================
// 📅 GOOGLE CALENDAR SETUP
// ==============================================================
let calendarAuth: any;
try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
    calendarAuth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/calendar']
    });
} catch (error) {
    console.error("⚠️ [CALENDAR] Aviso: GOOGLE_CREDENTIALS não configurado ou inválido no .env");
}
const calendar = google.calendar({ version: 'v3', auth: calendarAuth });

// ==============================================================
// 🔧 FUNCTION DECLARATIONS (Tools)
// ==============================================================
const functionDeclarations: any[] = [
    {
        name: 'save_lead_data',
        description: 'Saves lead info (name, company, pain point) to the database.',
        parameters: {
            type: 'OBJECT',
            properties: {
                phone: { type: 'STRING' },
                name: { type: 'STRING' },
                company: { type: 'STRING' },
                pain_point: { type: 'STRING' },
            },
            required: ['phone'],
        },
    },
    {
        name: 'notify_human_specialist',
        description: 'Alerts Denis when the lead is ready to buy or needs technical help.',
        parameters: {
            type: 'OBJECT',
            properties: {
                urgency_level: { type: 'STRING' },
                summary: { type: 'STRING' },
            },
            required: ['urgency_level', 'summary'],
        },
    },
    {
        name: 'check_calendar_availability',
        description: 'Verifica os horários ocupados na agenda para uma data específica.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date: { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
            },
            required: ['date'],
        },
    },
    {
        name: 'schedule_appointment',
        description: 'Agenda um compromisso na agenda do cliente.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date: { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
                time: { type: 'STRING', description: 'Hora no formato HH:MM' },
                client_name: { type: 'STRING', description: 'Nome do lead' },
                summary: { type: 'STRING', description: 'Assunto ou tipo de serviço' }
            },
            required: ['date', 'time', 'client_name'],
        },
    },

    {
        name: 'verifyPagarmeOrder',
        description: 'Verifica se o lead já pagou o PIX gerado.',
        parameters: {
            type: 'OBJECT',
            properties: {
                order_id: { type: 'STRING', description: 'O ID do pedido gerado (ex: or_1234)' }
            },
            required: ['order_id'],
        },
    },
    {
        name: 'schedule_and_charge_deposit',
        description: 'Agenda a reunião no Google Calendar e imediatamente gera um PIX de 50% de depósito do serviço (Tier 2 ou Tier 3) para confirmar a reserva.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date: { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
                time: { type: 'STRING', description: 'Hora no formato HH:MM' },
                client_name: { type: 'STRING', description: 'Nome do lead' },
                client_email: { type: 'STRING', description: 'E-mail do lead' },
                service_tier: { type: 'STRING', description: 'O tipo de serviço', enum: ['TIER_2', 'TIER_3'] }
            },
            required: ['date', 'time', 'client_name', 'client_email', 'service_tier'],
        },
    }
];

async function executeToolCall(name: string, args: any, clientPhone: string): Promise<any> {
    console.log(`🔧 [TOOL EXECUTION]: ${name}`);
    if (name === 'save_lead_data') {
        await supabaseAdmin.from('leads_lobo').update({
            name: args.name,
            niche: args.company,
            main_pain: args.pain_point
        }).eq('phone', clientPhone);
        return { status: 'success' };
    }
    if (name === 'notify_human_specialist') {
        await supabaseAdmin.from('leads_lobo').update({ status: 'hot_lead' }).eq('phone', clientPhone);
        return { status: 'success', notification: 'Denis has been alerted.' };
    }
    if (name === 'schedule_and_charge_deposit') {
        console.log(`💸 [PIX/CALENDAR] Iniciando schedule_and_charge_deposit para ${args.client_name}`);
        try {
            // 1. Calcular o valor do depósito (50%)
            const amountCents = args.service_tier === 'TIER_3' ? 150000 : 50000;

            // 2. Gerar PIX no Pagar.me
            const pagarmePayload = {
                items: [{ amount: amountCents, description: `Depósito Inicial - ${args.service_tier}`, quantity: 1 }],
                customer: { name: args.client_name, email: args.client_email, type: 'individual', document: '00000000000' },
                payments: [{ payment_method: 'pix', pix: { expires_in: 86400 } }]
            };

            const pagarmeRes = await fetch('https://api.pagar.me/core/v5/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(process.env.PAGARME_SECRET_KEY + ':').toString('base64')}`
                },
                body: JSON.stringify(pagarmePayload)
            });
            const pagarmeData = await pagarmeRes.json();

            if (!pagarmeRes.ok) {
                console.error("❌ [PAGARME] Erro ao gerar PIX:", pagarmeData);
                return { status: "error", message: "Falha ao gerar o PIX. Avise que ocorreu um erro." };
            }

            const pixData = pagarmeData.charges?.[0]?.last_transaction?.qr_code;
            const orderId = pagarmeData.id;

            // 3. Agendar no Google Calendar
            const startTime = new Date(`${args.date}T${args.time}:00-03:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hora

            await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: `[PENDING PIX] Escopo ${args.client_name}`,
                    description: `Tier: ${args.service_tier}\nEmail: ${args.client_email}\nOrderID: ${orderId}\nTelefone: ${clientPhone}`,
                    start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                    end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                }
            });

            console.log(`✅ [PIX/CALENDAR] Sucesso! Evento criado e PIX ${orderId} gerado.`);
            return {
                status: 'success',
                message: 'Horário reservado com sucesso e PIX gerado.',
                pix_qr_code: pixData,
                order_id: orderId,
                instructions: 'Apresente a chave PIX Copia e Cola ao lead e reforce que a reunião E a reserva de agenda só estão 100% garantidas após o pagamento.'
            };
        } catch (err: any) {
            console.error("❌ [PIX/CALENDAR] Exceção:", err.message);
            return { status: "error", message: err.message };
        }
    }


    if (name === 'verifyPagarmeOrder') {
        console.log(`🔍 [PAGARME] Verificando pedido ${args.order_id}`);
        try {
            const pagarmeRes = await fetch(`https://api.pagar.me/core/v5/orders/${args.order_id}`, {
                method: 'GET',
                headers: { 'Authorization': `Basic ${Buffer.from(process.env.PAGARME_SECRET_KEY + ':').toString('base64')}` }
            });
            const pagarmeData = await pagarmeRes.json();

            if (pagarmeData.status === 'paid') {
                console.log(`✅ [PAGARME] Pedido ${args.order_id} PAGO! Removendo tag do calendário...`);
                try {
                    const eventsRes = await calendar.events.list({
                        calendarId: 'primary',
                        q: args.order_id,
                        timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                    });
                    if (eventsRes.data.items && eventsRes.data.items.length > 0) {
                        const event = eventsRes.data.items[0];
                        if (event.summary && event.summary.includes('[PENDING PIX]')) {
                            const newSummary = event.summary.replace('[PENDING PIX]', '[CONFIRMADO]');
                            await calendar.events.patch({
                                calendarId: 'primary',
                                eventId: event.id!,
                                requestBody: { summary: newSummary }
                            });
                            console.log(`✅ [CALENDAR] Tag [PENDING PIX] removida do evento ${event.id}`);
                        }
                    }
                } catch (calErr) {
                    console.error("❌ [CALENDAR] Erro ao atualizar remoção da tag:", calErr);
                }

                await supabaseAdmin.from('leads_lobo').update({ status: 'hot_lead' }).eq('phone', clientPhone);
                return { status: 'success', payment_status: 'paid', message: 'Pagamento confirmado! Reserva garantida na agenda.' };
            } else {
                console.log(`⏳ [PAGARME] Pedido pendente (${pagarmeData.status}).`);
                return { status: 'pending', payment_status: pagarmeData.status, message: 'O pagamento ainda não foi identificado. Peça para o cliente avisar quando pagar.' };
            }
        } catch (err: any) {
            console.error("❌ [PAGARME] Erro na verificação:", err.message);
            return { status: 'error', message: err.message };
        }
    }

    return { status: 'error', message: 'Tool execution skipped or not found. Please continue the conversation using standard text.' };
}

async function analyzeReceiptWithGemini(base64Data: string, clientPhone: string) {
    console.log(`📸 [VISION] Analisando comprovante de ${clientPhone}...`);

    try {
        // Certifique-se de que a variável 'ai' está definida globalmente no topo do arquivo
        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{
                role: 'user',
                parts: [
                    { text: "Analise este comprovante PIX. Retorne ESTRITAMENTE um JSON: { \"is_valid_pix\": boolean, \"amount\": number, \"receiver\": \"string\" }." },
                    { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                ]
            }]
        });

        // No SDK @google/genai, .text é uma propriedade
        const responseText = result.text || "";

        const cleanedJson = responseText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedJson);

    } catch (error) {
        console.error("❌ [VISION ERROR]:", error);
        return { is_valid_pix: false, error: "Falha no processamento da imagem" };
    }
} // <--- A função deve fechar APENAS aqui

// ==============================================================
// 🧠 LEAD PROCESSING LOGIC
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    console.log(`\n===========================================`);
    console.log(`🧠 [ELIZA] Processing Lead: ${clientNumber}`);

    try {
        // 1. Lock lead status
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // 2. Load context and history
        // 2. Load context and history
        const contextPath = path.join(process.cwd(), 'business_context.json');
        const businessContext = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf8') : '';

        const { data: rawHistory } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: true })
            .limit(20);

        let chatHistory = rawHistory || [];

        let currentMessage = "Olá";
        let historyForGemini: any[] = [];

        if (chatHistory.length > 0) {
            // Remove a última msg para ser o input do user, PURA e sem sujeira de prompt
            const lastMsg = chatHistory.pop();
            currentMessage = lastMsg?.content || "Olá";
            historyForGemini = chatHistory;
        }

        // ==============================================================
        // 🧠 INJEÇÃO DE ESTADO (SILICON TWEAK)
        // ==============================================================
        const hasPreviousAssistantMessage = historyForGemini.some((msg: any) => msg.role === 'assistant');
        let dynamicInstruction = "";

        if (hasPreviousAssistantMessage) {
            dynamicInstruction = "STATE: [ACTIVE CONVERSATION]\nDIRETRIZ: O Lobo (ou Denis) já iniciou o contato. NÃO use o STEP 0. Leia o histórico, veja o que foi perguntado e o que o cliente respondeu para dar continuidade direta.";
        } else {
            dynamicInstruction = "STATE: [NEW INBOUND]\nDIRETRIZ: Este é um contato novo (inbound). Inicie estritamente pelo STEP 0.";
        }

        const systemInstruction = `# 1. IDENTITY & CORE MISSION
You are Eliza, an AI Sales Development Representative (SDR) and Tech Assistant to Denis at meatende.ai (a company building AI Agents, automated sales machines and lightning speed websites.).

CRITICAL INSTRUCTION: ALL YOUR RESPONSES TO THE USER MUST BE GENERATED EXCLUSIVELY IN NATURAL BRAZILIAN PORTUGUESE (PT-BR). Translate the intent of all instructions below into PT-BR before outputting.

# 2. STRICT RULES & GUARDRAILS
- CONSTRAINT 1: NEVER hallucinate services, prices, or deadlines.
- CONSTRAINT 2: NEVER send a menu or list of services. Diagnose the client first.
- CONSTRAINT 3: NEVER use gerunds in Portuguese (e.g., output "vou verificar" instead of "vou estar verificando").
- CONSTRAINT 4: Base answers strictly on the "BUSINESS CONTEXT".
- CONSTRAINT 5: If the user asks if you are an AI, proudly admit it.
- CONSTRAINT 6: MESSAGE SPLITTING & DYNAMIC BUBBLES. Vary the interaction by sending between 1 and 3 bubbles depending on the complexity of the response. (Maximum 25 words per bubble). You MUST use the "||" separator to split distinct ideas into separate chat bubbles. NEVER send a single wall of text.
- FAST-TRACK BYPASS (CRITICAL): If the user explicitly asks to schedule a meeting ("agendar", "agenda do Denis") or make a payment ("fazer PIX", "comprar") at ANY point, IMMEDIATELY SKIP the qualification funnel. Acknowledge the request, ask for their email, and trigger the appropriate scheduling or payment tool. Do NOT ask triage questions.

# 3. THE INVISIBLE FUNNEL (SDR PLAYBOOK)
Follow this logical sequence organically. Do not sound like a robot reading a rigid script. Adapt your phrasing to match the user's conversational flow.

STEP 0: The Discovery (Greeting & Rapport)
- ONLY use this step if the conversation history is EMPTY of any previous assistant/Lobo messages.
- If the customer says "Bom dia" or "Oi" but there is a previous message from "Denis" or "Lobo" asking about the business, IGNORE Step 0 and proceed directly to Step 1 or Step 2 to address their answer.
- DO NOT restart the conversation if the client is already answering a question.

STEP 1: The Core Operation Question (Triage)
Once the user provides their name or explains what they are looking for, smoothly transition into identifying their operational bottleneck. 
Ask conversationally if their current priority is capturing more leads/traffic, automating a WhatsApp that is overflowing, or building a direct sales system (like e-commerce/delivery). Do not use a hardcoded template; phrase the question naturally based on their previous input.

STEP 2: The Routing Protocol & Pitch
Listen to the user's answer from Step 1 and STRICTLY select the appropriate PATH. Pitch it naturally in PT-BR.
- PATH A ("Captação" Lead - needs traffic/quotes): Pitch the "Site de Alta Performance" (LP Express). Explain it acts as a Google conversion machine. Mention the fixed one-time investment is R$500 to R$700, with no monthly fees.
- PATH B ("Retenção" Lead - lacks time/too many messages): Pitch the "Agente de Inteligência Artificial". Explain it qualifies and schedules clients 24/7 automatically. Do not mention pricing.
- PATH C ("Transação" Lead - physical products/complex booking): Pitch "Desenvolvimento Customizado". Explain that robust software engineering (database and dashboards) is required. Do not mention pricing.
Immediately after pitching the appropriate PATH, use the "||" separator and ask ONE closing question (e.g., "Faz sentido para a sua operação?").

STEP 3: THE CALENDAR HAND-OFF & DEPOSIT (TIER 2 & 3)
If the user agrees to the pitch for Tier 2 or 3, or explicitly asks for a meeting:
YOU MUST STOP ASKING QUESTIONS. DO NOT REPEAT THE PITCH.
1. State that Denis will evaluate their operation via a kickoff meeting.
2. Explicitly explain that a 50% upfront deposit via PIX is required right now to secure the calendar slot.
3. Ask for their email to generate the billing.
4. Once the email is provided, call the 'schedule_and_charge_deposit' tool to book the time and generate the PIX.

THE 'HOT LEAD' WARP PIPE (LP EXPRESS)
If the user specifically wants the "Site de Alta Performance" (LP Express) and demonstrates HIGH BUYING INTENT at ANY point (e.g., "quero comprar", "qual o pix", "bora fechar"):
- Answer any quick objection if necessary.
- State you will generate their PIX or Payment link right now.
- Ask for their administrative email to link to the billing.
- Once the user provides the email, IMMEDIATELY trigger the 'generatePagarmePix' tool.

# 4. PAYMENT & VALIDATION RULES (ARTISANAL MODE)
When you trigger a payment tool or the user agrees to pay, you MUST inform them of the following:
"Estou enviando o QR Code abaixo. Assim que fizer o pagamento, tire um print ou foto do comprovante e mande aqui no chat. Meu sistema de visão vai validar o pagamento na hora para liberarmos seu projeto."

# 5. BUSINESS CONTEXT
Use STRICTLY the following information to answer business-related questions:
${businessContext}

# 6. CURRENT LEAD STATE (CRITICAL)
${dynamicInstruction}
`;


        // 4. Create Chat Session (Apenas com o PASSADO)
        // Use a 'ai' global que criamos no topo
        const chat = ai.chats.create({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations }] as any,
            },
            history: chatHistory.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            })),
        });

        console.log(`⏳ Calling Gemini API com a mensagem: "${currentMessage}"`);
        let result = await chat.sendMessage({ message: currentMessage });

        // 5. Tool Loop (Function Calling)
        let loopCount = 0;
        while (result.functionCalls && result.functionCalls.length > 0 && loopCount < 3) {
            loopCount++;
            const parts: any[] = [];
            
            for (const call of result.functionCalls) {
                let output;
                try {
                    output = await executeToolCall(call.name || '', call.args, clientNumber);
                    
                    // SDK CONSTRAINT: output MUST be a valid JSON object. 
                    if (!output || typeof output !== 'object') {
                        output = { status: 'executed', result: String(output) };
                    }
                } catch (err: any) {
                    output = { status: 'error', error: err.message };
                }

                // Push strictly as a Part object expected by @google/genai
                parts.push({ 
                    functionResponse: { 
                        name: call.name, 
                        response: output
                    } 
                });
            }
            
            console.log(`🔄 [TOOL] Returning tool response array to Gemini...`);
            // Pass the array of Parts directly
            result = await chat.sendMessage(parts);
        }

        const responseText = result.text || '';

        // --- GATILHO DE ENVIO DE QR CODE (ARTESANAL) ---
        // Se a Eliza falou em PIX ou pagamento, a Evolution manda a foto
        if (responseText.toLowerCase().includes("pix") || responseText.toLowerCase().includes("pagamento")) {
            console.log(`🖼️ [MEDIA] Enviando QR Code para ${clientNumber}`);

            const urlSuaFotoQrCode = "https://i.imgur.com/ihpJUn7.jpeg";

            // Chamada direta para a Evolution API (não passa pelo fluxo de texto comum)
            const evUrl = (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "https://api.revivafotos.com.br").replace(/\/$/, "");
            const evInstance = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE || "agente-lobo";
            const evKey = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_GLOBAL_APIKEY || "";

            await fetch(`${evUrl}/message/sendMedia/${evInstance}`, {
                method: 'POST',
                headers: {
                    'apikey': evKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number: clientNumber,
                    mediaMessage: {
                        mediatype: "image",
                        caption: "Aqui está o QR Code para o pagamento. 🐺",
                        media: urlSuaFotoQrCode
                    }
                })
            });
        }

        // 6. Split into bubbles with explicit typing
        const chunks = responseText.split('||')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);

        console.log('📤 Sending chunks to WhatsApp:', chunks);

        await sendWhatsAppPresence(clientNumber, 'composing');

        console.log('📤 Sending chunks to WhatsApp:', chunks);
        await sendWhatsAppPresence(clientNumber, 'composing');

        const CHARS_PER_SECOND = 15;
        let accumulatedDelayMs = 0;

        for (const chunk of chunks) {
            // Calcula o tempo de "digitação" baseado no tamanho da bolha (mínimo 2s, máximo 12s)
            const bubbleTypingTimeMs = Math.max(2000, Math.min((chunk.length / CHARS_PER_SECOND) * 1000, 12000));
            accumulatedDelayMs += bubbleTypingTimeMs;

            console.log(`⌨️ [TYPING] Bolha enviada em ${Math.round(accumulatedDelayMs / 1000)}s: "${chunk.substring(0, 30)}..."`);
            await sendWhatsAppMessage(clientNumber, chunk, accumulatedDelayMs);

            // Adiciona uma pausa humana de respiração/leitura entre bolhas múltiplas
            if (chunks.length > 1) {
                const pauseBetweenBubbles = Math.floor(Math.random() * (2500 - 1000 + 1)) + 1000;
                accumulatedDelayMs += pauseBetweenBubbles;
            }
        }

        // 7. Save and Release
        const fakeMessageId = `eliza_${Date.now()}`; // Cria um ID único para a mensagem da IA

        const { error: insertError } = await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber,
            role: 'assistant',
            content: responseText,
            message_id: fakeMessageId // <--- O SEGREDO ESTÁ AQUI
        });

        if (insertError) {
            console.error("❌ [SUPABASE ERROR] Falha ao salvar memória da Eliza:", insertError);
        }

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
        console.log(`✅ [ELIZA] Success for ${clientNumber}`);

    } catch (error: any) {
        console.error("❌ [ELIZA ERROR]:", error.message);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

// ==============================================================
// 🔄 POLLING ENGINE
// ==============================================================
async function startPolling() {
    console.log('🔄 [WORKER] Listening for eliza_processing leads...');
    while (true) {
        try {
            const { data: leads } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('status', 'eliza_processing')
                .eq('ai_paused', false)
                .limit(1);

            if (leads && leads.length > 0) {
                await processLead(leads[0]);
            }
        } catch (e) {
            console.error("Polling error:", e);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
}

// ==============================================================
// 🌐 RAILWAY HEALTHCHECK & WEBHOOK SERVER (FULL LOGIC)
// ==============================================================
const PORT = process.env.PORT || 8080;

http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200);
        res.end('Eliza Worker Online');
        return;
    }

    if (req.method === 'POST' && req.url === '/webhook') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });

        req.on('end', async () => {
            try {
                // 1. Libera a Evolution API na hora (Fim do Timeout)
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'received' }));

                const body = JSON.parse(bodyStr);
                const isEvolution = body.event === 'MESSAGES_UPSERT' || body.event === 'messages.upsert';

                if (!isEvolution) return;

                let dataObj = Array.isArray(body.data) ? body.data[0] : body.data;
                if (!dataObj) return;

                const remoteJid = dataObj.key?.remoteJid || '';
                if (remoteJid.endsWith('@g.us')) {
                    console.log('🔇 [WEBHOOK] Grupo ignorado:', remoteJid);
                    return;
                }

                if (!dataObj.key) return;

                const isFromMe = dataObj.key.fromMe === true;
                const rawJid = (dataObj.key.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net'))
                    ? String(dataObj.key.remoteJidAlt)
                    : String(dataObj.key.remoteJid);

                const clientNumber = normalizePhone(rawJid);
                const incomingMessageId = dataObj.key.id;
                const messageObj = dataObj.message;

                let clientMessage = '';

                if (messageObj) {
                    // --- 📸 DETECÇÃO DE COMPROVANTE (IMAGEM) ---
                    if (messageObj.imageMessage) {
                        console.log("📸 [WEBHOOK] Imagem recebida. Iniciando fluxo de validação artesanal...");

                        // 1. Pega o Base64 da imagem via Evolution API
                        // Nota: Você vai precisar da URL da sua instância e da API Key da Evolution no .env
                        const instance = body.instance;
                        const msgId = dataObj.key.id;

                        const evoRes = await fetch(`${process.env.EVOLUTION_URL}/chat/getBase64/` + instance, {
                            method: 'POST',
                            headers: { 'apikey': process.env.EVOLUTION_API_KEY!, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ messageId: msgId })
                        });

                        const { base64 } = await evoRes.json();

                        if (base64) {
                            const analysis = await analyzeReceiptWithGemini(base64, clientNumber);

                            if (analysis.is_valid_pix && analysis.confidence_score > 0.8) {
                                console.log(`✅ [OCR SUCCESS] Comprovante de R$${analysis.amount} validado para ${clientNumber}`);

                                // Atualiza no banco e avisa o humano
                                await supabaseAdmin.from('leads_lobo').update({ status: 'paid' }).eq('phone', clientNumber);
                                await sendWhatsAppMessage(clientNumber, "✅ *Pagamento Confirmado!* || Já identifiquei seu PIX aqui. Vou avisar o Denis agora mesmo para darmos andamento ao seu projeto. || Em breve ele entrará em contato! 🚀");

                                // Opcional: Notifica você no seu WhatsApp pessoal
                                // await sendWhatsAppMessage('SEU_NUMERO', `🔥 LEAD PAGO! ${clientNumber} enviou um PIX de R$${analysis.amount}`);
                            } else {
                                await sendWhatsAppMessage(clientNumber, "Puxa, não consegui validar esse comprovante automaticamente. 🧐 || Poderia enviar uma foto mais clara ou o PDF do comprovante? Se preferir, aguarde um instante que o Denis já vai conferir manualmente.");
                            }
                        }
                        return; // Interrompe o fluxo para não tratar a imagem como texto
                    }

                    // --- 🎙️ ÁUDIO E 💬 TEXTO (Mantenha o seu código atual aqui abaixo) ---
                    if (messageObj.audioMessage) { /* ... seu código de áudio ... */ }
                    if (!messageObj.conversation && !messageObj.extendedTextMessage) return;
                    clientMessage = messageObj.conversation || messageObj.extendedTextMessage?.text || '';
                }

                if (clientMessage && clientMessage.trim().length > 0) {
                    // --- LÓGICA DE ADMIN / SILENT HANDOFF ---
                    if (isFromMe) {
                        const cmd = clientMessage.trim();
                        if (cmd === '/pausar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                            return;
                        } else if (cmd === '/retomar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: false, needs_human: false }).eq('phone', clientNumber);
                            return;
                        }

                        const isAPI = incomingMessageId && (incomingMessageId.startsWith('BAE5') || incomingMessageId.startsWith('B2B') || incomingMessageId.length > 32);
                        if (isAPI) {
                            return; // Ignora mensagens enviadas pela própria Eliza
                        } else {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                            console.log(`👤 [SILENT HANDOFF] Denis assumiu o chat. IA pausada para ${clientNumber}.`);
                            return;
                        }
                    }

                    console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);

                    // --- BLINDAGENS DE SEGURANÇA ---
                    const autoReplyKeywords = ['bem-vindo', 'digite 1', 'mensagem automática', 'em breve retornaremos'];
                    const msgLower = clientMessage.toLowerCase();
                    if (autoReplyKeywords.some(kw => msgLower.includes(kw))) {
                        console.log(`🛡️ [SHIELD] Auto-reply (Keywords). Ignorando.`);
                        return;
                    }

                    let { data: lead } = await supabaseAdmin.from('leads_lobo').select('*').eq('phone', clientNumber).maybeSingle();

                    if (lead) {
                        await supabaseAdmin.from('leads_lobo').update({ replied: true }).eq('phone', clientNumber);

                        if (lead.updated_at) {
                            const timeSinceContact = Date.now() - new Date(lead.updated_at).getTime();
                            if (timeSinceContact < 2000) {
                                console.log(`🛡️ [SHIELD] Auto-reply (Rápido demais). Ignorando.`);
                                return;
                            }
                        }

                        if ((lead.reply_count || 0) >= 10) {
                            console.log(`🚨 [CIRCUIT BREAKER] Bot Loop. Travando ${clientNumber}.`);
                            await supabaseAdmin.from('leads_lobo').update({ is_locked: true, status: 'needs_human', ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                            return;
                        }

                        if (lead.is_locked === true || lead.ai_paused === true || lead.needs_human === true) {
                            console.log(`🔒 Lead travado ou com humano. Ignorando.`);
                            return;
                        }
                    }

                    if (!lead) {
                        const { data: newLead } = await supabaseAdmin.from('leads_lobo').insert({
                            phone: clientNumber, status: 'organic_inbound', name: 'Lead inbound', message_buffer: '', is_processing: false
                        }).select().single();
                        lead = newLead;
                    }

                    // --- SALVAMENTO E GATILHO ---
                    await supabaseAdmin.from('messages').insert({
                        lead_phone: clientNumber, role: 'user', content: clientMessage, message_id: incomingMessageId
                    });

                    const { data: elizaSwitch } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'eliza_active').single();
                    if (elizaSwitch && elizaSwitch.value?.enabled === false) {
                        await supabaseAdmin.from('leads_lobo').update({ status: 'needs_human', needs_human: true }).eq('phone', clientNumber);
                        return;
                    }

                    await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_processing' }).eq('phone', clientNumber);
                    console.log(`🎯 [WEBHOOK] Status de ${clientNumber} -> 'eliza_processing'. Worker assumindo.`);
                }
            } catch (error) {
                console.error('❌ [WEBHOOK CRASH]:', error);
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
}).listen(PORT, () => console.log(`🌐 Server (Healthcheck & Webhook) running on port ${PORT}`));

startPolling();