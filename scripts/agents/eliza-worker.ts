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
                service_type: { type: 'STRING', description: 'Assunto ou tipo de serviço' }
            },
            required: ['date', 'time', 'client_name', 'service_type'],
        },
    },
    {
        name: 'update_business_context',
        description: 'Atualiza o arquivo de regras, preços e serviços do negócio (business_context.json).',
        parameters: {
            type: 'OBJECT',
            properties: {
                new_comprehensive_context: {
                    type: 'STRING',
                    description: 'O texto COMPLETO do novo catálogo, contendo todas as regras anteriores mais as alterações solicitadas pelo dono.'
                }
            },
            required: ['new_comprehensive_context'],
        },
    }
];

async function executeToolCall(name: string, args: any, clientPhone: string): Promise<any> {
    console.log(`🔧 [TOOL EXECUTION]: ${name}`);
    console.log(`➡️  [TOOL ARGS]:`, JSON.stringify(args));

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

    if (name === 'update_business_context') {
        console.log(`\n================= 👑 CONSOLE.GOD (ADMIN MODE) 👑 =================`);
        console.log(`📝 [ADMIN] Atualizando arquivo business_context.json...`);

        try {
            const contextPath = path.join(process.cwd(), 'business_context.json');
            fs.writeFileSync(contextPath, args.new_comprehensive_context, 'utf8');

            console.log(`✅ [ADMIN] Contexto do negócio reescrito com sucesso!`);
            console.log(`=======================================================================\n`);

            return {
                status: 'success',
                message: 'O catálogo foi atualizado. Informe ao dono que a alteração foi salva com sucesso e você já está operando com as novas regras.'
            };
        } catch (err: any) {
            console.error(`❌ [ADMIN ERROR] Falha ao salvar arquivo:`, err.message);
            return { status: 'error', message: 'Falha ao salvar as alterações no servidor.' };
        }
    }

    if (name === 'check_calendar_availability') {
        console.log(`\n================= 👁️ CONSOLE.GOD (CALENDAR CHECK) 👁️ =================`);
        console.log(`📅 Leitura de agenda acionada para a data: ${args.date}`);

        try {
            // Ajuste: Permite definir o ID da agenda via variável de ambiente. 
            // Se usar 'primary', certifique-se de que o evento de teste foi criado na agenda da conta autenticada.
            const targetCalendarId = process.env.GOOGLE_CALENDAR_ID || 'denisfrainer93@gmail.com';

            const startOfDay = new Date(`${args.date}T00:00:00-03:00`);
            const endOfDay = new Date(`${args.date}T23:59:59-03:00`);

            const requestParams = {
                calendarId: targetCalendarId,
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                singleEvents: true, // CRÍTICO: Garante o retorno de todos os eventos expandidos
                orderBy: 'startTime'
            };

            console.log(`➡️ Payload da requisição enviada ao Google:`, JSON.stringify(requestParams, null, 2));

            const response = await calendar.events.list(requestParams);

            const events = response.data.items || [];

            console.log(`⬅️ Payload recebido do Google (Total itens encontrados: ${events.length})`);

            if (events.length > 0) {
                events.forEach((ev: any) => console.log(`   - Evento: ${ev.summary} | Início: ${ev.start?.dateTime}`));
            } else {
                console.log(`   - Nenhum evento retornado pelo Google. A lista está vazia.`);
                console.log(`   - ATENÇÃO: Se existe evento nesta data, o erro é de permissão/compartilhamento do Calendar ID.`);
            }
            console.log(`=======================================================================\n`);

            const busySlots = events.map((ev: any) => {
                if (ev.start?.dateTime) {
                    return new Date(ev.start.dateTime).toLocaleTimeString('pt-BR', {
                        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
                    });
                }
                return 'Hora indefinida';
            });

            return {
                status: 'success',
                date: args.date,
                busy_slots: busySlots.length > 0 ? busySlots : 'Nenhum horário ocupado.',
                message: busySlots.length > 0
                    ? `Estes horários já estão OCUPADOS: ${busySlots.join(', ')}. Não agende neles.`
                    : `Agenda 100% livre. Ofereça o horário solicitado.`
            };

        } catch (err: any) {
            console.error("❌ [CALENDAR ERROR]:", err.message);
            return { status: 'error', message: 'Falha ao consultar a API do Google Calendar.' };
        }
    }

    if (name === 'schedule_appointment') {
        console.log(`📅 [CALENDAR] Iniciando agendamento para ${args.client_name}`);
        try {
            const startTime = new Date(`${args.date}T${args.time}:00-03:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hora

            console.log(`➡️  [API REQUEST] Inserindo evento no Calendar: ${startTime.toISOString()} - ${endTime.toISOString()}`);
            await calendar.events.insert({
                calendarId: 'denisfrainer93@gmail.com',
                requestBody: {
                    summary: `[AGENDADO] ${args.client_name} - ${args.service_type}`,
                    description: `Serviço: ${args.service_type}\nTelefone: ${clientPhone}`,
                    start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                    end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                }
            });

            console.log(`✅ [CALENDAR] Sucesso! Evento criado.`);
            return {
                status: 'success',
                message: 'Horário reservado com sucesso no calendário.',
                instructions: 'Confirme para o cliente que o agendamento está finalizado e pronto.'
            };
        } catch (err: any) {
            console.error("❌ [CALENDAR] Exceção:", err.message);
            return { status: "error", message: err.message };
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
}

async function transcribeAudioWithGemini(base64Audio: string, mimeType: string): Promise<string> {
    console.log(`🎙️ [VOICE] Transcrevendo payload dinâmico (Formato: ${mimeType})...`);
    try {
        const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { data: cleanBase64, mimeType: mimeType } },
                    { text: "Transcreva este áudio em Português do Brasil. Retorne apenas o que foi falado. Se houver apenas estática, retorne [SILÊNCIO]." }
                ]
            }],
            config: {
                temperature: 0.0
            }
        });

        const cleanText = (result.text || "").trim();

        if (cleanText === '[SILÊNCIO]' || cleanText.includes('modelo de linguagem')) {
            return "";
        }

        return cleanText;
    } catch (error) {
        console.error("❌ [VOICE ERROR] Falha na transcrição:", error);
        return "";
    }
}

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
        // 🧠 INJEÇÃO DE ESTADO E CONTEXTO TEMPORAL (SILICON TWEAK)
        // ==============================================================
        const hasPreviousAssistantMessage = historyForGemini.some((msg: any) => msg.role === 'assistant');
        let dynamicInstruction = "";

        if (hasPreviousAssistantMessage) {
            dynamicInstruction = "STATE: [ACTIVE CONVERSATION]\nDIRETRIZ: O Lobo (ou Denis) já iniciou o contato. NÃO use o STEP 0. Leia o histórico, veja o que foi perguntado e o que o cliente respondeu para dar continuidade direta.\n";
        } else {
            dynamicInstruction = "STATE: [NEW INBOUND]\nDIRETRIZ: Este é um contato novo (inbound). Inicie estritamente pelo passo de reconhecimento.\n";
        }

        const greetingRegex = /^(oi|oii|olá|ola|ei|bom dia|boa tarde|boa noite|tudo bem|opa|hello)[\s\W]*$/i;
        const isGreetingOnly = chatHistory.length === 0 && greetingRegex.test(currentMessage.trim());

        if (isGreetingOnly) {
            console.log(`👋 [ELIZA_FLOW] Saudação detectada. Iniciando funil de vendas.`);
            console.log(`🚫 [ELIZA_FLOW] Handoff bloqueado para mensagem inicial.`);
            dynamicInstruction += "\n⚠️ CRITICAL OVERRIDE: O usuário apenas enviou uma saudação inicial. VOCÊ NÃO PODE ACIONAR O HANDOFF (notify_human_specialist). Responda com fluidez natural: identifique-se como Eliza, assistente virtual da [NOME DA EMPRESA], informe seu propósito (agendamentos) e conduza-o suavemente para o STEP 1.";
        }

        // Injeção da data atual para blindagem de calendário
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        dynamicInstruction += `\nDATA_ATUAL_DO_SISTEMA: Hoje é ${formattedDate}. Use este ano e mês como base absoluta para interpretar datas solicitadas pelo cliente.`;

        const systemInstruction = `# 1. IDENTITY & CORE MISSION
You are Eliza, an AI Virtual Receptionist for a beauty clinic/salon. Your ONLY purpose is to inform prices, check calendar availability, and schedule appointments.
CRITICAL INSTRUCTION: ALL YOUR RESPONSES TO THE USER MUST BE GENERATED EXCLUSIVELY IN NATURAL BRAZILIAN PORTUGUESE (PT-BR). 

# 2. STRICT RULES & GUARDRAILS (RAIL MODE)
- ENTRY POINT: Greetings ("Olá", "Bom dia") are engagement triggers. Respond cordially, introduce yourself as Eliza, the virtual assistant of [NOME DA EMPRESA], and ask how you can help, immediately guiding them to STEP 1.
- CONSTRAINT 1 (NO CHITCHAT): You are a receptionist, not a friend. Beyond the initial greeting, do not make open-ended conversation. Keep the flow moving to the calendar.
- CONSTRAINT 2 (SHORT ANSWERS): Your responses must be extremely concise. Maximum of 2 text bubbles per interaction. Maximum of 20 words per bubble. Use the "||" separator to split distinct ideas.
- CONSTRAINT 3 (NO HALLUCINATIONS): Base prices, services, and rules STRICTLY on the "BUSINESS CONTEXT". If a user asks for a service or price not listed, DO NOT invent it.
- CONSTRAINT 4 (ESCAPE HATCH - HANDOFF RESTRICTED): The 'notify_human_specialist' tool must be your LAST option. ONLY execute it if: (1) The client insists on off-topic subjects after 2 attempts to return to the booking funnel. (2) The client explicitly asks to speak with a human. (3) A critical technical error occurs. NEVER classify a greeting as urgency "medium" or "high". If triggered, say EXACTLY: "Vou pedir para a especialista responsável te ajudar com isso, só um momento." followed by "[HANDOFF_TRIGGERED]".

# 3. THE LINEAR BOOKING FUNNEL
You must force the user down this exact path. Do not skip steps unless the user explicitly provides the information upfront.

## STEP 1: SERVICE CONFIRMATION
Identify which service the user wants. If they don't specify, ask directly: "Qual serviço você deseja agendar? || Temos opções de unha, depilação e estética facial." (Adapt based on context). Once identified, state the price explicitly.

## STEP 2: CALENDAR CHECK
Ask the user for their preferred date (e.g., "Para qual dia?").
Once you have the date, YOU MUST call the 'check_calendar_availability' tool. 
After receiving the available/busy slots, offer the user a maximum of TWO available time slots. (e.g., "Tenho horário livre às 14h ou às 16h. Qual fica melhor?").

## STEP 3: DATA COLLECTION AND EXECUTION
- GOLDEN RULE: You MUST NEVER confirm an appointment textually before successfully executing the 'schedule_appointment' tool.
- When the client chooses an available time slot, ask ONLY for their full name.
- Do not state that the time is confirmed at this stage. Simply say: "Alright. To book this on the calendar, what is your full name?".
- ONLY AFTER the client provides their name, execute the 'schedule_appointment' tool, filling in all required parameters: date, time, service_type, and client_name.
- After the tool executes successfully and returns a positive response, inform the client that their appointment has been confirmed.

# 4. BUSINESS CONTEXT
Use STRICTLY the following information to answer business-related questions:
${businessContext}

# 5. CURRENT LEAD STATE (CRITICAL)
${dynamicInstruction}
`;

        // 👑 ADICIONE ESTE BLOCO LOGO ABAIXO DA STRING ACIMA 👑
        const ownerPhone = process.env.OWNER_PHONE || '554899999999'; // Substitua pelo seu número como fallback de segurança

        if (clientNumber === ownerPhone) {
            console.log(`👑 [ROUTING] Número do chefe detectado (${clientNumber}). Desativando modo Eliza. Ativando Admin Mode.`);

            let systemInstruction = `# 1. IDENTIDADE
                            Você é a Assistente de Operações de IA do sistema. Você NÃO está falando com um cliente, você está falando DIRETAMENTE COM O DONO do negócio.

                            # 2. SEU OBJETIVO
                            Sua única função é ouvir as instruções do dono para alterar preços, serviços ou regras, e aplicar essas mudanças no catálogo atual usando a ferramenta 'update_business_context'.

                            # 3. CONTEXTO ATUAL DO NEGÓCIO:
                            ${businessContext}

                            # 4. REGRAS DE EXECUÇÃO:
                            - Leia o que o dono pedir.
                            - Pegue o "CONTEXTO ATUAL DO NEGÓCIO" acima, aplique as modificações exatas que ele pediu, e envie o texto COMPLETO (regras antigas mantidas + novas regras) para a tool 'update_business_context'.
                            - Após executar a tool, responda de forma extremamente curta (ex: "Feito, chefe. Preço atualizado.").`;
        }
        // =========================================================


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
                console.log(`\n================= 👁️ CONSOLE.GOD 👁️ =================`);
                console.log(`🤖 [GEMINI RAW RESPONSE]:`, JSON.stringify({
                    text: result.text || 'NENHUM TEXTO',
                    functionCalls: result.functionCalls || 'NENHUMA FUNCTION CALL'
                }, null, 2));
                console.log(`========================================================\n`);
            }

            console.log(`🔄 [TOOL] Returning tool response to Gemini...`);
            // CRITICAL FIX: Wrap the parts array in a strict Content object
            result = await chat.sendMessage({
                message: functionResponseParts
            });
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

                // 🛡️ [TRAVA DE FOGO AMIGO] Aborta a execução se a mensagem foi enviada pelo próprio aparelho
                if (isFromMe) {
                    console.log(`🛡️ [WEBHOOK] Mensagem ignorada (Fogo Amigo). Origem: Outbound (Você enviou).`);
                    return; // Mata o processo aqui
                }

                const rawJid = (dataObj.key.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net'))
                    ? String(dataObj.key.remoteJidAlt)
                    : String(dataObj.key.remoteJid);

                const clientNumber = normalizePhone(rawJid);
                const incomingMessageId = dataObj.key.id;
                const messageObj = dataObj.message;

                let clientMessage = '';

                // --- 🎙️ ÁUDIO E 💬 TEXTO ---
                if (messageObj.audioMessage) {
                    console.log(`🎙️ [WEBHOOK] Áudio recebido de ${clientNumber}.`);

                    let audioBase64 = "";
                    let audioUrl = messageObj.audioMessage.url || dataObj.base64;

                    // 1. Extrai o mimetype real direto do objeto da mensagem (ex: audio/ogg; codecs=opus)
                    const rawMimeType = messageObj.audioMessage.mimetype || "audio/ogg";
                    const cleanMimeType = rawMimeType.split(';')[0];

                    if (audioUrl) {
                        if (audioUrl.startsWith('http')) {
                            const response = await fetch(audioUrl);
                            const buffer = await response.arrayBuffer();
                            audioBase64 = Buffer.from(buffer).toString('base64');
                        } else {
                            audioBase64 = audioUrl.includes('base64,') ? audioUrl.split('base64,')[1] : audioUrl;
                        }
                    } else if (messageObj?.base64) {
                        audioBase64 = messageObj.base64;
                        if (audioBase64.includes('base64,')) audioBase64 = audioBase64.split('base64,')[1];
                    }

                    if (audioBase64) {
                        console.log(`🔍 [DEBUG AUDIO] Base64: ${audioBase64.length} chars | Tipo Real: ${cleanMimeType}`);

                        if (audioBase64.length < 500) {
                            console.log(`⚠️ [DEBUG AUDIO] ALERTA: Base64 muito curto. Áudio vazio ou corrompido. Transcrição abortada.`);
                        } else {
                            // 2. Chama a função passando OS DOIS PARÂMETROS
                            const transcript = await transcribeAudioWithGemini(audioBase64, cleanMimeType);

                            if (transcript && transcript !== "[SILÊNCIO]") {
                                clientMessage = transcript;
                                console.log(`📝 [VOICE] Áudio transcrito: "${clientMessage}"`);
                            } else {
                                console.log(`⚠️ [VOICE] Transcrição falhou ou o áudio estava inaudível.`);
                            }
                        }
                    }
                }

                if (!clientMessage) {
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