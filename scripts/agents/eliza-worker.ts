import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import { google } from 'googleapis';
import http from 'http';
import { hasAccess } from '../../lib/auth/access-control';
import { PlanTier } from '../../lib/supabase/types';

/**
 * ELIZA WORKER - FINAL PRODUCTION VERSION (SDK @google/genai)
 * Target Model: gemini-2.5-flash
 */

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

process.env.TZ = 'America/Sao_Paulo';

// ==============================================================
// 📅 MULTI-TENANT GOOGLE CALENDAR SETUP (OAuth 2.0)
// ==============================================================
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_SITE_URL + '/api/auth/google/callback'
);

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
                service_type: { type: 'STRING', description: 'Assunto ou tipo de serviço' },
                duration_minutes: { type: 'NUMBER', description: 'Duração exata do serviço em minutos (ex: 30, 60, 120)' }
            },
            required: ['date', 'time', 'client_name', 'service_type', 'duration_minutes'],
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

async function executeToolCall(name: string, args: any, clientPhone: string, googleTokens?: any): Promise<any> {
    console.log(`🔧 [TOOL EXECUTION]: ${name} ${googleTokens ? '(Dynamic Auth)' : '(No Auth)'}`);
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
        console.log(`📝 [ADMIN] Tentativa de atualização do business_context detectada.`);
        console.log(`🔍 [ADMIN PAYLOAD] Conteúdo gerado pela IA para substituição:\n${args.new_comprehensive_context.substring(0, 300)}... [TRUNCADO]`);

        try {
            // Converte a string enviada pela IA em um objeto estruturado
            const parsedContext = JSON.parse(args.new_comprehensive_context);

            // Atualiza a linha 1 do banco de dados onde o JSON mestre está armazenado
            const { error } = await supabaseAdmin
                .from('business_config')
                .update({
                    context_json: parsedContext,
                    updated_at: new Date().toISOString()
                })
                .eq('id', 1);

            if (error) throw error;

            console.log(`✅ [ADMIN] Contexto do negócio atualizado com sucesso no Supabase!`);
            console.log(`=======================================================================\n`);

            return {
                status: 'success',
                message: 'O catálogo foi atualizado no banco de dados. Informe ao dono que a alteração foi salva com sucesso e você já está operando com as novas regras.'
            };
        } catch (err: any) {
            console.error(`❌ [ADMIN ERROR] Falha ao salvar no Supabase:`, err.message);
            return { status: 'error', message: 'Falha ao salvar as alterações no banco de dados.' };
        }
    }

    if (name === 'check_calendar_availability') {
        console.log(`\n================= 👁️ CONSOLE.GOD (CALENDAR CHECK) 👁️ =================`);
        console.log(`📅 Leitura de agenda acionada para a data: ${args.date}`);

        if (!googleTokens || !googleTokens.refresh_token) {
            console.error("❌ [CALENDAR ERROR]: Google Calendar not integrated for this tenant.");
            return { status: 'error', message: 'Este negócio ainda não conectou a agenda do Google.' };
        }

        try {
            oauth2Client.setCredentials({ refresh_token: googleTokens.refresh_token });
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            const startOfDay = new Date(`${args.date}T00:00:00-03:00`);
            const endOfDay = new Date(`${args.date}T23:59:59-03:00`);

            const requestParams = {
                calendarId: 'primary',
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            };

            const response = await calendar.events.list(requestParams);
            const events = response.data.items || [];

            console.log(`⬅️ Payload recebido do Google (Total itens encontrados: ${events.length})`);

            const busySlots = events.map((ev: any) => {
                const start = ev.start?.dateTime || ev.start?.date;
                return start ? new Date(start).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
                }) : 'Hora indefinida';
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

        if (!googleTokens || !googleTokens.refresh_token) {
            console.error("❌ [CALENDAR ERROR]: Google Calendar not integrated.");
            return { status: 'error', message: 'Integração com Google Calendar pendente para este negócio.' };
        }

        try {
            oauth2Client.setCredentials({ refresh_token: googleTokens.refresh_token });
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            const startTime = new Date(`${args.date}T${args.time}:00-03:00`);
            const durationInMinutes = args.duration_minutes ? Number(args.duration_minutes) : 60;
            const endTime = new Date(startTime.getTime() + (durationInMinutes * 60 * 1000));

            console.log(`➡️ [API REQUEST] Event: ${startTime.toISOString()} to ${endTime.toISOString()} (Duration: ${durationInMinutes}m)`);

            await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: `[AGENDADO] ${args.client_name} - ${args.service_type}`,
                    description: `Serviço: ${args.service_type}\nTelefone: ${clientPhone}\nDuração: ${durationInMinutes}m\n(Agendado via Eliza)`,
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
            console.error("❌ [CALENDAR EXCEPTION]:", err.message);
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
    console.log(`🎙️ [VOICE] Transcrevendo com Gemini 2.5 Flash...`);
    try {
        const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash", // O motor correto e ultrarrápido
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { data: cleanBase64, mimeType: mimeType } },
                    { text: "System prompt: Transcribe the attached audio exactly in Brazilian Portuguese. Return ONLY the text. No conversational filler." }
                ]
            }],
            config: {
                temperature: 0.0
            }
        });

        const cleanText = (result.text || "").trim();
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
    const instanceToUse = lead.instance_name || process.env.EVOLUTION_INSTANCE_NAME || 'agente-lobo';

    console.log(`\n===========================================`);
    console.log(`🧠 [ELIZA] Processing Lead: ${clientNumber} (Instance: ${instanceToUse})`);
    console.log(`🔍 [ELIZA] Lead metadata:`, {
        id: lead.id,
        owner_id: lead.owner_id,
        instance_name: lead.instance_name,
        status: lead.status,
        ai_paused: lead.ai_paused,
        needs_human: lead.needs_human,
        is_locked: lead.is_locked,
    });

    try {
        // 1. Lock lead status
        console.log(`🔒 [ELIZA] Locking lead ${lead.id} → eliza_analyzing`);
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // 2. Load context and history (DYNAMIC MULTI-TENANT)
        console.log(`📡 [DB] Buscando business_config para instância: ${instanceToUse}`);

        const { data: configData, error: configError } = await supabaseAdmin
            .from('business_config')
            .select('id, context_json, plan_tier, trial_ends_at')
            .eq('instance_name', instanceToUse)
            .eq('owner_id', lead.owner_id)
            .single();

        let businessContext = "";
        let googleTokens = null;
        const currentTier = (configData?.plan_tier as PlanTier) || 'FREE';
        const trialEndsAt = configData?.trial_ends_at;

        // --- 🛡️ TIER ACCESS CONTROL (L2 GATE) ---
        if (!hasAccess(currentTier, 'AI_CONFIGURATION', trialEndsAt)) {
            console.warn(`[ELIZA_ABORT] ❌ Access denied for ${instanceToUse}. Plan ${currentTier} expired or inactive.`);

            // Revert status to avoid constant polling of an unauthorized lead
            await supabaseAdmin.from('leads_lobo').update({
                status: 'waiting_reply',
                needs_human: true
            }).eq('id', lead.id);

            return;
        }

        if (configError || !configData) {
            console.error(`❌ [DB ERROR] Falha ao carregar configuração para ${instanceToUse}:`, configError?.message);
            businessContext = JSON.stringify({ servicos: [], aviso: "Sistema em manutenção" });
        } else {
            const fullConfig = configData.context_json as any;

            // --- 🚦 TENANT-LEVEL KILL SWITCH ---
            const isAiEnabled = fullConfig?.is_ai_enabled ?? true;
            console.log(`🚦 [ELIZA] Kill switch check: is_ai_enabled=${isAiEnabled}`);
            if (!isAiEnabled) {
                console.warn(`[ELIZA_PAUSED] ❌ IA desativada pelo usuário para instância: ${instanceToUse}. Abortando.`);
                await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
                return;
            }

            const allServices = fullConfig?.services || [];

            // Filter out inactive services for the bot
            const activeServices = allServices.filter((s: any) => s.status !== 'inactive');

            const filteredConfig = {
                ...fullConfig,
                services: activeServices
            };

            businessContext = JSON.stringify(filteredConfig);
            googleTokens = fullConfig?.google_calendar || null;
            console.log(`✅ [DB] Config carga: ${businessContext.length} bytes (Active Services: ${activeServices.length}). Google Auth: ${googleTokens ? 'Sim' : 'Não'}`);
        }

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

        // Dynamic Branding
        const businessName = configData?.business_name || 'nossa clínica';

        const greetingRegex = /^(oi|oii|olá|ola|ei|bom dia|boa tarde|boa noite|tudo bem|opa|hello)[\s\W]*$/i;
        const isGreetingOnly = chatHistory.length === 0 && greetingRegex.test(currentMessage.trim());

        if (isGreetingOnly) {
            console.log(`👋 [ELIZA_FLOW] Saudação detectada. Iniciando funil de vendas.`);
            console.log(`🚫 [ELIZA_FLOW] Handoff bloqueado para mensagem inicial.`);
            dynamicInstruction += `\n⚠️ CRITICAL OVERRIDE: O usuário apenas enviou uma saudação inicial. VOCÊ NÃO PODE ACIONAR O HANDOFF (notify_human_specialist). Responda com fluidez natural: identifique-se como Eliza, assistente virtual da ${businessName}, informe seu propósito (agendamentos) e conduza-o suavemente para o STEP 1.`;
        }
        
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        dynamicInstruction += `\nDATA_ATUAL_DO_SISTEMA: Hoje é ${formattedDate}. Use este ano e mês como base absoluta para interpretar datas solicitadas pelo cliente.`;

        // Extração segura do tom de voz
        const toneStyle = configData?.context_json?.tone_of_voice?.base_style || 'Amigável e profissional';
        const toneRules = configData?.context_json?.tone_of_voice?.custom_instructions || 'Responda de forma natural.';

        let systemInstruction = `# 1. IDENTITY & CORE MISSION
You are Eliza, an AI Virtual Receptionist for a beauty clinic/salon. Your ONLY purpose is to inform prices, check calendar availability, and schedule appointments.
CRITICAL INSTRUCTION: ALL YOUR RESPONSES TO THE USER MUST BE GENERATED EXCLUSIVELY IN NATURAL BRAZILIAN PORTUGUESE (PT-BR). 

# 1.1 TONE OF VOICE & PERSONALITY
- ESTILO BASE: Você deve assumir rigorosamente o arquétipo "${toneStyle}".
- REGRAS COMPORTAMENTAIS: ${toneRules}

# 2. STRICT RULES & GUARDRAILS (RAIL MODE)
- ENTRY POINT: Greetings ("Olá", "Bom dia") are engagement triggers. Respond cordially, introduce yourself as Eliza, the virtual assistant of ${businessName}, and ask how you can help, immediately guiding them to STEP 1.
- CONSTRAINT 1 (NO CHITCHAT): You are a receptionist, not a friend. Beyond the initial greeting, do not make open-ended conversation. Keep the flow moving to the calendar.
- CONSTRAINT 2 (SHORT ANSWERS): Your responses must be extremely concise. Maximum of 2 text bubbles per interaction. Maximum of 20 words per bubble. Use the "||" separator to split distinct ideas.
- CONSTRAINT 3 (NO HALLUCINATIONS): Base prices, services, and rules STRICTLY on the "BUSINESS CONTEXT". If a user asks for a service or price not listed, DO NOT invent it.
- CONSTRAINT 4 (ESCAPE HATCH - HANDOFF RESTRICTED): The 'notify_human_specialist' tool must be your LAST option. ONLY execute it if: (1) The client insists on off-topic subjects after 2 attempts to return to the booking funnel. (2) The client explicitly asks to speak with a human. (3) A critical technical error occurs. NEVER classify a greeting as urgency "medium" or "high". If triggered, say EXACTLY: "Vou pedir para a especialista responsável te ajudar com isso, só um momento." followed by "[HANDOFF_TRIGGERED]".

# 3. THE LINEAR BOOKING FUNNEL
You must force the user down this exact path. Do not skip steps unless the user explicitly provides the information upfront.

## STEP 1: SERVICE CONFIRMATION
Identify which service the user wants. If they don't specify, ask directly based ONLY on the services listed in the BUSINESS CONTEXT. Do not invent examples. Once identified, state the price explicitly.

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

        const ownerPhone = normalizePhone(process.env.OWNER_PHONE || '554899999999');

        if (clientNumber === ownerPhone) {
            console.log(`👑 [ROUTING] Número do chefe detectado (${clientNumber}). Desativando modo Eliza. Ativando Admin Mode.`);

            systemInstruction = `# 1. IDENTITY & PURPOSE
You are the AI Operations Assistant. You are speaking DIRECTLY TO THE BUSINESS OWNER, not a client.
Your ONLY job is to help the owner update the business rules, prices, and services.

# 2. CURRENT BUSINESS CONTEXT
${businessContext}

# 3. EXECUTION RULES (STRICT 2-STEP PROTOCOL)
- STEP 1 (DRAFT & ASK): When the owner requests a change (via text or audio), DO NOT call the 'update_business_context' tool immediately. First, reply with a bulleted list of the exact changes you understood and explicitly ask for confirmation.
  Example: "Confirming changes: 
  - Added Axilla Hair Removal (R$ 50)
  - Changed Nail price to R$ 45. 
  Do you confirm?"
- STEP 2 (EXECUTE): ONLY AFTER the owner explicitly replies confirming the changes (e.g., "yes", "confirm", "ok", "pode mandar"), generate the FULL comprehensive updated context and execute the 'update_business_context' tool.
- STEP 3 (FINISH): After executing the tool, reply briefly to the owner. Example: "Done. Context updated."`;
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
            history: chatHistory
                .filter((msg: any) => {
                    // 🧽 [HISTORY CLEANSING] Filter out handoff triggers and escape phrases 
                    // to prevent Gemini from thinking it's stuck or shouldn't respond.
                    const isHandoff = msg.content.includes("[HANDOFF_TRIGGERED]");
                    const isEscape = msg.content.includes("Vou pedir para a especialista");
                    return !isHandoff && !isEscape;
                })
                .map((msg: any) => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                })),
        });

        console.log(`⏳ [LLM] Calling Gemini API with message: "${currentMessage.substring(0, 80)}..."`);
        console.log(`⏳ [LLM] System instruction length: ${systemInstruction.length} chars`);
        const llmStartTime = Date.now();
        let result = await chat.sendMessage({ message: currentMessage });
        console.log(`✅ [LLM] Gemini responded in ${Date.now() - llmStartTime}ms. Has text: ${!!result.text}, Has tools: ${!!result.functionCalls}`);

        // 5. Tool Loop (Function Calling)
        let loopCount = 0;
        let wasHandoffToolCalled = false;
        while (result.functionCalls && result.functionCalls.length > 0 && loopCount < 3) {
            loopCount++;
            const functionResponseParts: any[] = [];

            for (const call of result.functionCalls) {
                if (call.name === 'notify_human_specialist') wasHandoffToolCalled = true;

                const output = await executeToolCall(call.name || '', call.args, clientNumber, googleTokens);

                functionResponseParts.push({
                    functionResponse: {
                        name: call.name,
                        response: output
                    }
                });
                console.log(`\n ================= 👁️ CONSOLE.GOD 👁️ ================= `);
                console.log(`🤖[GEMINI RAW RESPONSE]: `, JSON.stringify({
                    text: result.text || 'NENHUM TEXTO',
                    functionCalls: result.functionCalls || 'NENHUMA FUNCTION CALL'
                }, null, 2));
                console.log(`========================================================\n`);
            }

            console.log(`🔄[TOOL] Returning tool response to Gemini...`);
            // CRITICAL FIX: Wrap the parts array in a strict Content object
            result = await chat.sendMessage({
                message: functionResponseParts
            });
        }

        let responseText = result.text || '';

        // 🛡️ [EMPTY STRING SHIELD] Fallback proativa para Tool Calls sem texto
        if (wasHandoffToolCalled && responseText.trim() === '') {
            console.log(`[EMPTY_SHIELD] Handoff tool called but Gemini returned empty text. Injecting fallback.`);
            responseText = "Com certeza. Vou pedir para a especialista responsável te ajudar com isso agora mesmo, só um momento. [HANDOFF_TRIGGERED]";
        }

        console.log(`🔍 [CIRCUIT BREAKER] Analisando similaridade de repetição para ${clientNumber}...`);

        // Encontra a última mensagem que a IA enviou neste histórico
        const lastAssistantMsg = [...chatHistory].reverse().find((msg: any) => msg.role === 'assistant');

        if (lastAssistantMsg) {
            // Verificação de Loop Exato ou Alta Similaridade
            const isExactMatch = responseText.trim() === lastAssistantMsg.content.trim();

            // Verificação parcial (se a IA enviou o mesmo bloco de menu gigante novamente)
            const isPartialLoop = responseText.includes("Qual serviço você deseja agendar?") &&
                lastAssistantMsg.content.includes("Qual serviço você deseja agendar?");

            if (isExactMatch || isPartialLoop) {
                console.log(`🚨 [ANTI-LOOP TRIGGERED] A Eliza tentou repetir a mesma mensagem. Travando fluxo.`);
                console.log(`➡️ [LOG] Mensagem abortada: ${responseText.substring(0, 50)}...`);

                // Trava a IA no banco de dados e aciona o Handoff Silencioso
                await supabaseAdmin.from('leads_lobo').update({
                    needs_human: true,
                    ai_paused: true,
                    status: 'human_handling'
                }).eq('id', lead.id);

                // Mensagem de escape amigável para o cliente
                const escapeMessage = "Desculpe, meu sistema está passando por uma instabilidade com os agendamentos. Já chamei a especialista humana e ela vai assumir o seu atendimento em um minuto, tudo bem?";

                await sendWhatsAppMessage(clientNumber, escapeMessage, 1000, instanceToUse);

                // Salva o log do escape na tabela de mensagens
                await supabaseAdmin.from('messages').insert({
                    lead_phone: clientNumber,
                    role: 'assistant',
                    content: escapeMessage,
                    message_id: `eliza_escape_${Date.now()}`
                });
            }
        }

        // 6. Split into bubbles with explicit typing
        const chunks = responseText.split('||')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);

        // --- 🚨 HUMAN HANDOFF TRIGGER 🚨 ---
        if (responseText.includes("[HANDOFF_TRIGGERED]")) {
            console.log(`🚨[HANDOFF] Complex conversation detected.Pausing AI for lead: ${clientNumber} `);

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

        await sendWhatsAppPresence(clientNumber, 'composing', instanceToUse);

        const CHARS_PER_SECOND = 15;
        let accumulatedDelayMs = 0;

        for (const chunk of chunks) {
            // 🛡️ [EMPTY STRING SHIELD] Nunca permita envio de strings vazias para o WhatsApp
            if (!chunk || chunk.trim() === '') {
                console.log(`⚠️ [EMPTY_SHIELD] Dropping empty chunk to prevent WhatsApp API 400 crash.`);
                continue;
            }

            // Calcula o tempo de "digitação" baseado no tamanho da bolha (mínimo 2s, máximo 12s)
            const bubbleTypingTimeMs = Math.max(2000, Math.min((chunk.length / CHARS_PER_SECOND) * 1000, 12000));
            accumulatedDelayMs += bubbleTypingTimeMs;

            console.log(`⌨️[TYPING] Bolha enviada em ${Math.round(accumulatedDelayMs / 1000)} s: "${chunk.substring(0, 30)}..."`);
            await sendWhatsAppMessage(clientNumber, chunk, accumulatedDelayMs, instanceToUse);

            // Adiciona uma pausa humana de respiração/leitura entre bolhas múltiplas
            if (chunks.length > 1) {
                const pauseBetweenBubbles = Math.floor(Math.random() * (2500 - 1000 + 1)) + 1000;
                accumulatedDelayMs += pauseBetweenBubbles;
            }
        }

        // 7. Save and Release
        const fakeMessageId = `eliza_${Date.now()} `; // Cria um ID único para a mensagem da IA

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
        console.log(`✅[ELIZA] Success for ${clientNumber}`);

    } catch (error: any) {
        console.error(`❌ [ELIZA FATAL] Lead ${lead.id} (${clientNumber}) crashed:`, error.message);
        console.error(`❌ [ELIZA FATAL] Stack trace:`, error.stack);
        // Mark as error — NOT waiting_reply — to prevent silent infinite retry loops
        await supabaseAdmin.from('leads_lobo').update({
            status: 'eliza_error',
            needs_human: true
        }).eq('id', lead.id);
        console.error(`❌ [ELIZA FATAL] Lead ${lead.id} marked as eliza_error. Requires manual intervention.`);
    }
}

// ==============================================================
// 🔄 POLLING ENGINE
// ==============================================================
let pollCycleCount = 0;
let isPolling = false;

async function startPolling() {
    console.log('🚀 [BOOT] Igniting Eliza Polling Engine Heartbeat...');

    setInterval(async () => {
        if (isPolling) return; // Prevent overlapping runs
        isPolling = true;
        pollCycleCount++;

        try {
            if (pollCycleCount % 12 === 0) { // Log heartbeat every ~1 minute (12 * 5s)
                console.log(`💓 [HEARTBEAT] Cycle #${pollCycleCount} — Scanning for eliza_processing leads...`);
            }

            const { data: leads, error: pollError } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('status', 'eliza_processing')
                .eq('ai_paused', false)
                .limit(1);

            if (pollError) {
                console.error(`❌ [WORKER ERROR] Database poll failed (Cycle #${pollCycleCount}):`, pollError.message);
                isPolling = false;
                return;
            }

            if (leads && leads.length > 0) {
                const lead = leads[0];
                console.log(`🔄 [WORKER] Cycle #${pollCycleCount} — Found lead to process: ${lead.phone}`);
                await processLead(lead);
            }
        } catch (e: any) {
            console.error(`❌ [CRASH PREVENTED] Unknown error in polling loop (Cycle #${pollCycleCount}):`, e.message, e.stack);
        } finally {
            isPolling = false;
        }
    }, 5000); // Bulletproof 5s interval
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

    // 🌐 WEBHOOK ROUTER (Evolution API v1/v2 & Z-API)
    const isPost = req.method === 'POST';
    const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const isWebhookPath = parsedUrl.pathname === '/webhook' || parsedUrl.pathname === '/api/webhook/evolution';

    if (isPost && isWebhookPath) {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });

        req.on('end', async () => {
            try {
                // 1. Immediate 200 — never let Evolution API timeout
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'received' }));

                const body = JSON.parse(bodyStr);

                // 2. BULLETPROOF EVENT NORMALIZATION
                //    Evolution v1: "MESSAGES_UPSERT", "CONNECTION_UPDATE"
                //    Evolution v2: "messages.upsert", "connection.update"
                const rawEvent = String(body.event || '');
                const eventName = rawEvent.toUpperCase().replace(/\./g, '_');

                const isMessageEvent = eventName === 'MESSAGES_UPSERT';
                const isConnectionEvent = eventName === 'CONNECTION_UPDATE';

                if (!isMessageEvent && !isConnectionEvent) {
                    console.log(`🔇 [ROUTER] Dropped irrelevant event: "${rawEvent}"`);
                    return;
                }

                const instanceName = body.instance || body.instanceName || body.data?.instance || 'unknown';
                
                // 🛠️ UUID Sanitization: Handle string "null" or missing tenantId to prevent Supabase crashes
                let tenantId = parsedUrl.searchParams.get('tenantId');
                if (!tenantId || tenantId === 'null' || tenantId === 'undefined') {
                    tenantId = null;
                }

                console.log(`🚦 [ROUTER] Event: ${rawEvent} (→${eventName}) | Instance: ${instanceName} | Tenant: ${tenantId || 'GLOBAL/NULL'}`);

                // ================================================================
                // 🔌 CONNECTION UPDATE HANDLER — fail-fast, then hard return
                // ================================================================
                if (isConnectionEvent) {
                    // DEEP STATE EXTRACTION — cover every known Evolution API shape
                    const candidates = [
                        body.data?.state,            // v2 standard
                        body.data?.connection,        // v1 variant
                        body.data?.status,            // alternative
                        body.status,                  // top-level variant
                        body.data?.instance?.state,   // nested instance object
                    ];

                    const rawState = candidates.find(c => typeof c === 'string' && c.length > 0) || 'unknown';
                    const normalizedState = rawState.toLowerCase().trim();

                    console.log(`🔌 [CONNECTION] Raw data dump:`, JSON.stringify(body.data || body));
                    console.log(`🔌 [CONNECTION] Extracted state: "${rawState}" → normalized: "${normalizedState}"`);

                    // STATE CLASSIFICATION — STRICT: only 'open' = CONNECTED
                    // 'connecting' is deliberately EXCLUDED — it fires when Evolution
                    // is booting up to generate QR, NOT when user has actually scanned.
                    const CONNECTED_STATES = ['open', 'connected'];
                    const DISCONNECTED_STATES = ['close', 'disconnected', 'refused', 'logout'];

                    const isOpen = CONNECTED_STATES.includes(normalizedState);
                    const isClosed = DISCONNECTED_STATES.includes(normalizedState);

                    if (!isOpen && !isClosed) {
                        console.log(`🔇 [CONNECTION] Unclassified state: "${rawState}" — no DB action taken.`);
                        return; // HARD RETURN — don't bleed into message processing
                    }

                    const newStatus = isOpen ? 'CONNECTED' : 'DISCONNECTED';
                    console.log(`🔌 [CONNECTION] Resolved: "${rawState}" → ${newStatus}`);

                    try {
                        // DUAL-PATH DB LOOKUP: instance_name first, tenantId fallback
                        let config: any = null;
                        let dbError: any = null;

                        // Path A: Match by instance_name
                        const { data: byInstance, error: errA } = await supabaseAdmin
                            .from('business_config')
                            .select('id, context_json, owner_id, plan_tier, trial_ends_at')
                            .eq('instance_name', instanceName)
                            .maybeSingle();

                        config = byInstance;
                        dbError = errA;

                        // Path B: Fallback to tenantId if Path A missed
                        if (!config && tenantId) {
                            console.log(`🔄 [CONNECTION] instance_name "${instanceName}" not found. Falling back to tenantId: ${tenantId}`);
                            const { data: byTenant, error: errB } = await supabaseAdmin
                                .from('business_config')
                                .select('id, context_json, owner_id, plan_tier, trial_ends_at')
                                .eq('owner_id', tenantId)
                                .maybeSingle();
                            config = byTenant;
                            dbError = errB;
                        }

                        if (dbError) {
                            console.error(`❌ [CONNECTION] DB lookup failed:`, dbError.message);
                            return;
                        }

                        if (!config) {
                            console.warn(`⚠️ [CONNECTION] No business_config for instance="${instanceName}" tenant="${tenantId}". Event dropped.`);
                            return;
                        }

                        // ATOMIC UPDATE — merge connection_status into context_json
                        const currentContext = (config.context_json && typeof config.context_json === 'object')
                            ? config.context_json
                            : {};

                        const updatedContext = {
                            ...currentContext,
                            connection_status: newStatus,
                        };

                        // 🛠️ Hybrid Trial Ignition logic
                        let updatePayload: any = {
                            status: newStatus,
                            context_json: updatedContext,
                            updated_at: new Date().toISOString()
                        };

                        if (newStatus === 'CONNECTED' && (config.plan_tier === 'FREE' || !config.plan_tier) && !config.trial_ends_at) {
                            console.log(`🔥 [TRIAL_IGNITION] Account ${config.owner_id} ignited for 30-day trial!`);
                            const thirtyDaysFromNow = new Date();
                            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                            
                            updatePayload.plan_tier = 'TRIAL';
                            updatePayload.trial_ends_at = thirtyDaysFromNow.toISOString();
                        }

                        const { error: updateError } = await supabaseAdmin
                            .from('business_config')
                            .update(updatePayload)
                            .eq('id', config.id); 

                        if (updateError) {
                            console.error(`❌ [CONNECTION] Update failed for config.id=${config.id}:`, updateError.message);
                        } else {
                            console.log(`✅ [CONNECTION] ${instanceName} (owner: ${config.owner_id}) → ${newStatus} ${updatePayload.plan_tier ? '(TRIAL INITIATED)' : ''}`);
                            
                            // 🔄 [SYNC] Propagate trial status to user profile for Header/UI usage
                            if (updatePayload.plan_tier === 'TRIAL') {
                                console.log(`🔄 [SYNC] Syncing TRIAL status to profile for owner: ${config.owner_id}`);
                                await supabaseAdmin
                                    .from('profiles')
                                    .update({
                                        plan_tier: 'TRIAL',
                                        trial_ends_at: updatePayload.trial_ends_at
                                    })
                                    .eq('id', config.owner_id);
                            }
                        }
                    } catch (err: any) {
                        console.error(`💥 [CONNECTION] Unhandled exception:`, err.message, err.stack);
                    }

                    return; // HARD RETURN — connection events NEVER touch message logic
                }

                // --- 💬 MESSAGE PROCESSING ---

                let dataObj = Array.isArray(body.data) ? body.data[0] : body.data;
                if (!dataObj) return;

                const remoteJid = dataObj.key?.remoteJid || '';
                if (remoteJid.endsWith('@g.us')) {
                    console.log('🔇 [WEBHOOK] Grupo ignorado:', remoteJid);
                    return;
                }

                if (!dataObj.key) return;

                const isFromMe = dataObj.key.fromMe === true;

                // 🛡️ [TRAVA DE FOGO AMIGO] Optimized Self-Messaging Detection
                // Drops any message originated from the bot itself (both from key.fromMe and API patterns)
                if (isFromMe) {
                    console.log(`🛡️ [WEBHOOK] Dropping self-originated message (Fogo Amigo).`);
                    return;
                }

                const rawJid = (dataObj.key.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net'))
                    ? String(dataObj.key.remoteJidAlt)
                    : String(dataObj.key.remoteJid);

                const clientNumber = normalizePhone(rawJid);
                
                // 🛡️ [THE GHOST FILTER] Ignore messages from the bot's own number
                const BOT_NUMBER = '554898097754';
                if (clientNumber === BOT_NUMBER) {
                    return; // Silent return
                }

                const incomingMessageId = dataObj.key.id;
                const messageObj = dataObj.message;

                let clientMessage = '';

                // --- 🎙️ ÁUDIO E 💬 TEXTO ---
                if (messageObj.audioMessage) {
                    console.log(`🎙️[WEBHOOK] Áudio recebido de ${clientNumber}.`);

                    try {
                        // Configurações da sua Evolution API
                        const evoUrl = process.env.EVOLUTION_API_URL || 'https://api.revivafotos.com.br';
                        // instanceName now inherited from outer router scope
                        const evoKey = process.env.EVOLUTION_API_KEY || process.env.WOLF_SECRET_TOKEN || '';

                        console.log(`📡[DEBUG AUDIO] Pedindo para Evolution descriptografar o áudio...`);

                        // O ESCUDO: Pedimos para a Evolution pegar a mensagem, descriptografar a mídia e devolver o Base64 limpo
                        const mediaRes = await fetch(`${evoUrl} /chat/getBase64FromMediaMessage / ${instanceName} `, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': evoKey
                            },
                            body: JSON.stringify({ message: dataObj })
                        });

                        if (!mediaRes.ok) {
                            console.error(`❌[DEBUG AUDIO] Erro na descriptografia da Evolution: ${mediaRes.status} `);
                        } else {
                            const mediaData = await mediaRes.json();

                            if (mediaData && mediaData.base64) {
                                const audioBase64 = mediaData.base64;
                                const cleanMimeType = (mediaData.mimetype || "audio/ogg").split(';')[0];

                                console.log(`🔍[DEBUG AUDIO] Áudio descriptografado: ${audioBase64.length} chars | Formato: ${cleanMimeType} `);

                                if (audioBase64.length < 500) {
                                    console.log(`⚠️[DEBUG AUDIO] Base64 muito curto.Áudio vazio.Abortando.`);
                                } else {
                                    const transcript = await transcribeAudioWithGemini(audioBase64, cleanMimeType);

                                    if (transcript && transcript !== "[SILÊNCIO]") {
                                        clientMessage = transcript;
                                        console.log(`📝[VOICE] Áudio transcrito com sucesso: "${clientMessage}"`);
                                    } else {
                                        console.log(`⚠️[VOICE] Transcrição falhou ou áudio mudo.`);
                                    }
                                }
                            } else {
                                console.error(`❌[DEBUG AUDIO] Evolution não retornou o Base64 no payload.`);
                            }
                        }
                    } catch (error: any) {
                        console.error(`❌[DEBUG AUDIO] Erro fatal ao extrair áudio: ${error.message} `);
                    }
                }

                if (!clientMessage) {
                    clientMessage = messageObj.conversation || messageObj.extendedTextMessage?.text || '';
                }

                const ownerPhone = normalizePhone(process.env.OWNER_PHONE || '554899999999');
                const isOwner = clientNumber === ownerPhone;

                if (clientMessage && clientMessage.trim().length > 0) {
                    // --- LÓGICA DE ADMIN / SILENT HANDOFF ---
                    // ==============================================================
                    // 🛡️ A TRAVA GOD TIER (SILENT HANDOFF & FOGO AMIGO)
                    // ==============================================================
                    if (isFromMe || isOwner) {
                        // Verifica se a mensagem foi enviada pelo próprio sistema (Eliza) via API
                        const isAPI = incomingMessageId && (incomingMessageId.startsWith('BAE5') || incomingMessageId.startsWith('B2B') || incomingMessageId.length > 32);

                        if (isAPI) {
                            // É a Eliza respondendo. Ignoramos para não criar loop.
                            return;
                        } else {
                            // É VOCÊ (Denis/Humano) digitando diretamente no WhatsApp ou pelo OWNER_PHONE.
                            const cmd = clientMessage.trim();

                            if (cmd === '/pausar') {
                                await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                                console.log(`⏸️[COMANDO] IA pausada manualmente para ${clientNumber}.`);
                                return;
                            } else if (cmd === '/retomar') {
                                await supabaseAdmin.from('leads_lobo').update({ ai_paused: false, needs_human: false, status: 'organic_inbound' }).eq('phone', clientNumber);
                                console.log(`▶️[COMANDO] IA retomada manualmente para ${clientNumber}.`);
                                return;
                            }

                            // SILENT HANDOFF: Se você digitou qualquer outra coisa, trava a IA para este lead permanentemente.
                            console.log(`🛡️[FOGO AMIGO] Denis assumiu o controle via ${isOwner ? 'OWNER_PHONE' : 'DIRECT'}. Travando a IA para o lead ${clientNumber}.`);
                            await supabaseAdmin.from('leads_lobo').update({
                                needs_human: true,
                                ai_paused: true,
                                status: 'human_handling'
                            }).eq('phone', clientNumber);

                            return; // Mata a execução do webhook aqui. A IA não vai nem ler o resto.
                        }
                    }

                    if (clientMessage) {

                        console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);

                        // --- BLINDAGENS DE SEGURANÇA ---
                        const autoReplyKeywords = ['bem-vindo', 'digite 1', 'mensagem automática', 'em breve retornaremos'];
                        const msgLower = clientMessage.toLowerCase();
                        if (autoReplyKeywords.some(kw => msgLower.includes(kw))) {
                            console.log(`🛡️[SHIELD] Auto - reply(Keywords).Ignorando.`);
                            return;
                        }

                        let query = supabaseAdmin
                            .from('leads_lobo')
                            .select('*')
                            .eq('phone', clientNumber)
                            .eq('instance_name', instanceName);

                        if (tenantId) {
                            query = query.eq('owner_id', tenantId);
                        }

                        let { data: lead, error: fetchError } = await query.maybeSingle();

                        if (fetchError) {
                            console.error(`❌ [SUPABASE ERROR] Failed to fetch lead ${clientNumber}:`, fetchError.message);
                            return;
                        }

                        if (lead) {
                            const { error: updError } = await supabaseAdmin.from('leads_lobo').update({ replied: true }).eq('phone', clientNumber);
                            if (updError) console.error(`⚠️ [SUPABASE WARN] Failed to update lead replied status:`, updError.message);

                            if (lead.updated_at) {
                                const timeSinceContact = Date.now() - new Date(lead.updated_at).getTime();
                                if (timeSinceContact < 2000) {
                                    console.log(`🛡️[SHIELD] Auto - reply(Rápido demais).Ignorando.`);
                                    return;
                                }
                            }

                            if ((lead.reply_count || 0) >= 10) {
                                console.log(`🚨[CIRCUIT BREAKER] Bot Loop.Travando ${clientNumber}.`);
                                const { error: lockError } = await supabaseAdmin.from('leads_lobo').update({
                                    is_locked: true,
                                    status: 'needs_human',
                                    ai_paused: true,
                                    needs_human: true
                                }).eq('phone', clientNumber);
                                if (lockError) console.error(`❌ [SUPABASE ERROR] Failed to lock lead:`, lockError.message);
                                return;
                            }

                            if (lead.is_locked === true) {
                                console.log(`🔒 [GUARD] Lead is_locked=true. Ignoring message from ${clientNumber}.`);
                                return;
                            }

                            // If lead was previously paused/handed-off, a new inbound message
                            // means the human interaction is over — unpause and let AI resume.
                            if (lead.ai_paused === true || lead.needs_human === true) {
                                console.log(`🔓 [GUARD] Lead was paused (ai_paused=${lead.ai_paused}, needs_human=${lead.needs_human}). New message received — unpausing for AI.`);
                                const { error: unpauseError } = await supabaseAdmin.from('leads_lobo').update({
                                    ai_paused: false,
                                    needs_human: false
                                }).eq('id', lead.id);
                                if (unpauseError) console.error(`❌ [SUPABASE ERROR] Failed to unpause lead:`, unpauseError.message);
                            }
                        }

                        if (!lead) {
                            console.log(`🆕 [LEAD] Creating new lead for ${clientNumber} (instance: ${instanceName})`);
                            const payload = {
                                phone: clientNumber,
                                status: 'eliza_processing',
                                name: 'Lead inbound',
                                message_buffer: '',
                                is_processing: false,
                                ai_paused: false,
                                needs_human: false,
                                is_locked: false,
                                instance_name: instanceName,
                                owner_id: tenantId
                            };
                            
                            let { data: newLead, error: insertError } = await supabaseAdmin
                                .from('leads_lobo')
                                .upsert(payload, { onConflict: 'phone' })
                                .select()
                                .single();

                            // Graceful Error Handling for extreme race conditions (duplicate key despite upsert)
                            if (insertError) {
                                if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                                    console.warn(`⚠️ [WEBHOOK RACE] Duplicate key violation caught for ${clientNumber}. Attempting fallback fetch.`);
                                    const { data: fallbackLead, error: fallbackError } = await supabaseAdmin
                                        .from('leads_lobo')
                                        .select('*')
                                        .eq('phone', clientNumber)
                                        .single();
                                        
                                    if (fallbackError || !fallbackLead) {
                                        console.error(`❌ [SUPABASE ERROR] Fallback fetch failed for:`, clientNumber);
                                        return;
                                    }
                                    newLead = fallbackLead;
                                    insertError = null;
                                } else {
                                    console.error(`❌ [SUPABASE ERROR] Failed to CREATE lead:`, insertError.message, insertError.details);
                                    return; // Stop if we can't create the lead
                                }
                            }
                            lead = newLead;
                        }

                        // --- SALVAMENTO E GATILHO ---
                        const { error: msgInsertError } = await supabaseAdmin.from('messages').insert({
                            lead_phone: clientNumber, role: 'user', content: clientMessage, message_id: incomingMessageId
                        });

                        if (msgInsertError) {
                            console.error(`❌ [SUPABASE ERROR] Failed to insert message:`, msgInsertError.message);
                            // We might want to continue, but usually, if the message isn't saved, AI will lack context.
                        }

                        // --- BRANCH A: STATIC MENU ---
                        if (instanceName === 'demo-menu') {
                            console.log(`🚦 [ROUTER] Branch A: Static Menu acionado para ${clientNumber}`);
                            const msgClean = clientMessage.trim().toLowerCase();

                            let menuResponse = "";
                            let newStatus = "waiting_menu_choice";

                            if (msgClean === '1') {
                                menuResponse = "Você escolheu a Opção 1: Informações sobre nossos serviços.\n💅 Manicure: R$ 45,00\n💆‍♀️ Limpeza de Pele: R$ 120,00\n\nDigite 0 para voltar ao menu principal.";
                            } else if (msgClean === '2') {
                                menuResponse = "Você escolheu a Opção 2: Falar com atendente humano. Um momento, por favor, nossa equipe já vai te atender.";
                                newStatus = "human_handling";
                                const { error: menuUpdError } = await supabaseAdmin.from('leads_lobo').update({
                                    status: newStatus,
                                    needs_human: true,
                                    ai_paused: true
                                }).eq('id', lead.id);
                                if (menuUpdError) console.error(`❌ [SUPABASE ERROR] Failed to update lead in menu branch:`, menuUpdError.message);
                            } else if (msgClean === '3') {
                                menuResponse = "Você escolheu a Opção 3: Horários de funcionamento.\n🕒 Funcionamos das 08:00 às 18:00 de segunda a sexta.\n\nDigite 0 para voltar ao menu principal.";
                            } else {
                                menuResponse = "Olá! Bem-vindo ao *Menu Estático de Teste*.\n\nEscolha uma opção:\n1️⃣ Nossos serviços e preços\n2️⃣ Falar com atendente\n3️⃣ Horários de funcionamento";
                            }

                            await sendWhatsAppPresence(clientNumber, 'composing');
                            await sendWhatsAppMessage(clientNumber, menuResponse, 1000);

                            // Apenas atualiza o status se for a ramificação do menu
                            const { error: finalMenuUpd } = await supabaseAdmin.from('leads_lobo').update({ status: newStatus }).eq('id', lead.id);
                            if (finalMenuUpd) console.error(`⚠️ [SUPABASE WARN] Failed to update lead status:`, finalMenuUpd.message);

                            console.log(`🚦 [ROUTER] Branch A finalizada.`);
                            return; // CRITICAL: Ends webhook execution here so the AI engine is never engaged
                        }

                        // --- BRANCH B: AI AGENT ---
                        // Dynamic Routing: Any instance that is NOT the static menu is routed to the AI Agent
                        if (instanceName !== 'demo-menu') {
                            console.log(`🎯 [ROUTER] Routing instance ${instanceName} to AI Agent processing.`);

                            // 1. FETCH INSTANCE CONFIG (Primary Truth)
                            let configQuery = supabaseAdmin.from('business_config').select('context_json').eq('instance_name', instanceName);
                            if (tenantId) configQuery = configQuery.eq('owner_id', tenantId);
                            
                            const { data: bConfig } = await configQuery.maybeSingle();
                            const instanceEnabled = bConfig?.context_json?.is_ai_enabled; // true, false, or undefined

                            // 2. FETCH GLOBAL SWITCH (Maintenance Mode)
                            const { data: elizaSwitch } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'eliza_active').maybeSingle();
                            const globalEnabled = !elizaSwitch || elizaSwitch.value?.enabled !== false;

                            // 3. APPLY HIERARCHY: Instance Overrides Global
                            let shouldProceed = false;

                            if (instanceEnabled === true) {
                                console.log(`✅ [SWITCH] Instance ${instanceName} explicitly ENABLED. Bypassing global status.`);
                                shouldProceed = true;
                            } else if (instanceEnabled === false) {
                                console.log(`⏸️ [SWITCH] Instance ${instanceName} explicitly DISABLED.`);
                                shouldProceed = false;
                            } else {
                                // Instance config missing or flag unset -> Follow Global Switch
                                console.log(`🔍 [SWITCH] No instance-level preference. Following Global Switch: ${globalEnabled ? 'ENABLED' : 'DISABLED'}`);
                                shouldProceed = globalEnabled;
                            }

                            if (!shouldProceed) {
                                console.log(`🛑 [PAUSE] Lead ${clientNumber} ignored (Instance: ${instanceEnabled}, Global: ${globalEnabled}).`);
                                await supabaseAdmin.from('leads_lobo').update({ 
                                    status: 'needs_human', 
                                    needs_human: true 
                                }).eq('phone', clientNumber);
                                return;
                            }

                            // 🎯 ALL GATES PASSED: Engage AI Engine
                            const { error: triggerError } = await supabaseAdmin.from('leads_lobo').update({
                                status: 'eliza_processing',
                                ai_paused: false,
                                needs_human: false,
                                instance_name: instanceName,
                                updated_at: new Date().toISOString()
                            }).eq('phone', clientNumber);

                            if (triggerError) {
                                console.error(`❌ [SUPABASE ERROR] Failed to trigger eliza_processing for ${clientNumber}:`, triggerError.message);
                                return;
                            }

                            console.log(`🚀 [WEBHOOK SUCCESS] Lead ${clientNumber} ready for Worker: status=eliza_processing, ai_paused=false, needs_human=false.`);
                        }
                    }
                }
            } catch (error) {
                console.error('❌ [WEBHOOK CRASH]:', error);
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
}).listen(PORT, () => {
    console.log(`🌐 Server(Healthcheck & Webhook) running on port ${PORT}`);
    console.log(`🚀 [BOOT] Server started. Igniting polling engine...`);
    startPolling().catch((err: any) => {
        console.error(`💥 [BOOT] startPolling() crashed fatally:`, err.message, err.stack);
    });
});