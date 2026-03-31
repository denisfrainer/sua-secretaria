import { GoogleGenAI } from '@google/genai';
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
            model: "gemini-2.5-flash",
            contents: [{
                role: 'user',
                parts: [
                    { text: "Analyze this PIX transfer receipt. You must extract the exact transfer amount. Ignore account balances. Return STRICTLY a valid JSON with no markdown formatting: { \"is_valid_pix\": boolean, \"amount\": number, \"receiver\": \"string\" }. If the amount is R$ 499,00, output 499.00." },
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
You are Eliza, an AI Virtual Receptionist for a beauty clinic/salon. Your ONLY purpose is to inform prices, check calendar availability, schedule appointments, and request the PIX deposit receipt.
CRITICAL INSTRUCTION: ALL YOUR RESPONSES TO THE USER MUST BE GENERATED EXCLUSIVELY IN NATURAL BRAZILIAN PORTUGUESE (PT-BR). 

# 2. STRICT RULES & GUARDRAILS (RAIL MODE)
- CONSTRAINT 1 (NO CHITCHAT): You are a checkout operator, not a friend. Never ask "Tudo bem?", "Como posso ajudar?", or make open-ended conversation. Go straight to the point.
- CONSTRAINT 2 (SHORT ANSWERS): Your responses must be extremely concise. Maximum of 2 text bubbles per interaction. Maximum of 20 words per bubble. Use the "||" separator to split distinct ideas.
- CONSTRAINT 3 (NO HALLUCINATIONS): Base prices, services, and rules STRICTLY on the "BUSINESS CONTEXT". If a user asks for a service or price not listed, DO NOT invent it.
- CONSTRAINT 4 (ESCAPE HATCH): If the user asks any question that is not about booking, prices, or hours, or if they request an unlisted service, YOU MUST IMMEDIATELY STOP the conversation. Output EXACTLY and ONLY: "Vou pedir para a especialista responsável te ajudar com isso, só um momento." followed immediately by "[HANDOFF_TRIGGERED]" and call the 'notify_human_specialist' tool.

# 3. THE LINEAR BOOKING FUNNEL
You must force the user down this exact path. Do not skip steps unless the user explicitly provides the information upfront.

STEP 1: SERVICE CONFIRMATION
Identify which service the user wants. If they don't specify, ask directly: "Qual serviço você deseja agendar? || Temos opções de unha, depilação e estética facial." (Adapt based on context). Once identified, state the price explicitly.

STEP 2: CALENDAR CHECK
Ask the user for their preferred date (e.g., "Para qual dia?").
Once you have the date, YOU MUST call the 'check_calendar_availability' tool. 
After receiving the available/busy slots, offer the user a maximum of TWO available time slots. (e.g., "Tenho horário livre às 14h ou às 16h. Qual fica melhor?").

STEP 3: SCHEDULING & PIX
Once the user confirms the exact time, YOU MUST call the 'schedule_appointment_and_request_pix' tool. 

STEP 4: RECEIPT ENFORCEMENT
After the tool returns the PIX key, you must output the key and instruct the user EXACTLY like this:
"Seu horário está pré-reservado. Para confirmar em definitivo, realize o PIX de 50% de sinal na chave abaixo. || Assim que pagar, mande a FOTO DO COMPROVANTE aqui no chat para a recepção liberar sua vaga."

# 4. BUSINESS CONTEXT
Use STRICTLY the following information to answer business-related questions:
${businessContext}

# 5. CURRENT LEAD STATE (CRITICAL)
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
            const functionResponseParts: any[] = [];

            for (const call of result.functionCalls) {
                const output = await executeToolCall(call.name || '', call.args, clientNumber);

                functionResponseParts.push({
                    functionResponse: {
                        name: call.name,
                        response: output
                    }
                });
            }

            console.log(`🔄 [TOOL] Returning tool response to Gemini...`);
            // CRITICAL FIX: Wrap the parts array in a strict Content object
            result = await chat.sendMessage({
                role: 'user',
                parts: functionResponseParts
            } as any);
        }

        const responseText = result.text || '';

        // 6. Split into bubbles with explicit typing
        const chunks = responseText.split('||')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);

        // --- 🚨 HUMAN HANDOFF TRIGGER 🚨 ---
        if (responseText.includes("[HANDOFF_TRIGGERED]")) {
            console.log(`🚨 [HANDOFF] Complex conversation detected. Pausing AI for lead: ${clientNumber}`);

            // Clean the trigger tag before pushing to chunks
            const cleanResponse = responseText.replace("[HANDOFF_TRIGGERED]", "").trim();
            chunks.length = 0; // Evita duplicidade se o split já tiver criado o chunk com a tag
            chunks.push(cleanResponse);

            // Update Supabase to pause the AI and request human intervention
            await supabaseAdmin.from('leads_lobo').update({
                needs_human: true,
                ai_paused: true
            }).eq('phone', clientNumber);
        }

        // --- GATILHO DE VENDA: COMBO ZERO FRICTION (IMAGEM + TEXTO) ---
        if (responseText.toLowerCase().includes("pix") || responseText.toLowerCase().includes("pagamento")) {
            console.log(`💸 [ZERO FRICTION] Disparando Combo (QR Code + Texto) para ${clientNumber}`);

            const urlSuaFotoQrCode = "https://eykfioezqcliwvbhckli.supabase.co/storage/v1/object/public/PIX/qrcode.jpeg";
            const pixCopiaECola = "00020101021126330014br.gov.bcb.pix0111029594740315204000053039865406499.005802BR5913DENIS F LOPES6012PORTO ALEGRE62070503***6304F302";

            // 1. Dispara a Imagem via Evolution API (Fire and Forget com Log de Diagnóstico)
            const evUrl = (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "https://api.revivafotos.com.br").replace(/\/$/, "");
            const evKey = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_GLOBAL_APIKEY || "";
            const evInstance = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE || "agente-lobo";

            fetch(`${evUrl}/message/sendMedia/${evInstance}`, {
                method: 'POST',
                headers: {
                    'apikey': evKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number: clientNumber,
                    mediatype: "image",
                    mimetype: "image/jpeg",
                    caption: pixCopiaECola,
                    media: urlSuaFotoQrCode
                })
            })
                .then(res => res.json())
                .then(data => {
                    console.log("📸 [MEDIA SUCCESS/DIAGNOSTIC]:", JSON.stringify(data));
                })
                .catch(err => {
                    console.error("❌ [MEDIA FETCH ERROR]:", err);
                });
        }

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
                        console.log("📸 [WEBHOOK] Imagem recebida. Executando Webhook Hacker (Base64 Nativo)...");

                        // Evolution API injects the base64 string directly into the message object when the 'base64' webhook flag is true.
                        // We check the most common locations in the payload structure.
                        const base64 = messageObj.base64 || dataObj.base64 || body.base64;

                        if (base64 && typeof base64 === 'string') {
                            console.log(`✅ [OCR START] Base64 nativo capturado com sucesso (Tamanho: ${base64.length}). Enviando para a visão do Gemini...`);
                            const analysis = await analyzeReceiptWithGemini(base64, clientNumber);

                            console.log(`🔍 [OCR DIAGNOSTIC] Raw Gemini Output for ${clientNumber}:`, JSON.stringify(analysis));

                            // Strict validation: Must be valid PIX, receiver must contain "Denis", and amount must be at least the minimum tier (299)
                            const isReceiverCorrect = analysis.receiver && analysis.receiver.toLowerCase().includes("denis");
                            const isAmountValid = typeof analysis.amount === 'number' && (analysis.amount === 299 || analysis.amount === 499 || analysis.amount >= 299);

                            if (analysis.is_valid_pix && isReceiverCorrect && isAmountValid) {
                                console.log(`✅ [OCR SUCCESS] Comprovante verificado. Valor aceito: R$${analysis.amount} para ${clientNumber}`);

                                await supabaseAdmin.from('leads_lobo').update({ status: 'paid' }).eq('phone', clientNumber);
                                await sendWhatsAppMessage(clientNumber, "✅ *Pagamento Confirmado!* || Já identifiquei seu PIX aqui. Vou avisar o Denis agora mesmo para darmos andamento ao seu projeto. 🚀");
                            } else {
                                console.warn(`⚠️ [OCR REJECTED] Validation failed for ${clientNumber}. Amount: ${analysis.amount}, Receiver: ${analysis.receiver}`);
                                await sendWhatsAppMessage(clientNumber, "Puxa, identifiquei o seu envio, mas houve uma divergência no valor do comprovante ou na leitura automática da imagem. 🧐 || O Denis vai analisar isso manualmente em instantes.");
                                await supabaseAdmin.from('leads_lobo').update({ needs_human: true, ai_paused: true }).eq('phone', clientNumber);
                            }
                        } else {
                            console.error("❌ [OCR ERROR] Base64 string not found in the webhook payload.");
                            console.log("🚨 [DIAGNOSTIC] Please verify that 'base64: true' is enabled in the Evolution API Webhook settings.");
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