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
 * Target Model: gemini-3.1-flash-lite-preview
 */

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

// ==============================================================
// 🪜 MODEL CASCADING (Tiered Fallback Strategy)
// ==============================================================
const MODEL_TIERS = [
    "gemini-3.1-flash-lite-preview", // Tier 1: Ultra Fast & Cheap
    "gemini-3-flash-preview",      // Tier 2: Standard Flash
    "gemini-2.5-flash"              // Tier 3: Legacy Fallback
];

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
    },
    {
        name: 'send_digital_media',
        description: 'Sends a digital media file (PDF, image portfolio, etc.) directly to the client\'s WhatsApp.',
        parameters: {
            type: 'OBJECT',
            properties: {
                media_type: {
                    type: 'STRING',
                    description: 'Type of media to send: "document" for PDFs/e-books, or "image" for portfolio images.'
                },
                file_url: {
                    type: 'STRING',
                    description: 'The publicly accessible URL of the file to send.'
                },
                caption: {
                    type: 'STRING',
                    description: 'A short caption/description to accompany the media file.'
                }
            },
            required: ['media_type', 'file_url', 'caption'],
        },
    }
];

async function executeToolCall(name: string, args: any, clientPhone: string, googleTokens?: any, ownerId?: string, businessConfig?: any, instanceName?: string): Promise<any> {
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
        console.log(`📅 Leitura de agenda acionada para a data: ${args.date} | Owner: ${ownerId}`);

        try {
            const requestedDate = new Date(`${args.date}T00:00:00-03:00`);
            const dayOfWeek = requestedDate.getDay(); // 0 = Sunday, 1 = Monday... 6 = Saturday

            // 1. Check Operating Hours rules first
            let dayConfig = businessConfig?.operating_hours?.weekdays;
            if (dayOfWeek === 0) dayConfig = businessConfig?.operating_hours?.sunday;
            if (dayOfWeek === 6) dayConfig = businessConfig?.operating_hours?.saturday;

            if (dayConfig && dayConfig.is_closed) {
                console.log(`❌ [CALENDAR] Dia fechado no operating_hours.`);
                return {
                    status: 'success',
                    date: args.date,
                    busy_slots: 'O dia todo',
                    message: `O estabelecimento está fechado neste dia de acordo com as regras de funcionamento.`
                };
            }

            let busySlots: string[] = [];

            // 2. Fetch Native Supabase Appointments
            if (ownerId) {
                const { data: nativeAppointments, error: nativeError } = await supabaseAdmin
                    .from('appointments')
                    .select('start_time, end_time')
                    .eq('owner_id', ownerId)
                    .eq('appointment_date', args.date)
                    .neq('status', 'cancelled');

                if (nativeError) {
                    console.error("❌ [DB ERROR]: Falha ao buscar agendamentos nativos.", nativeError);
                } else if (nativeAppointments) {
                    nativeAppointments.forEach((app: any) => {
                        const startTime = new Date(app.start_time).toLocaleTimeString('pt-BR', {
                            hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
                        });
                        busySlots.push(`[Nativo] ${startTime}`);
                    });
                }
            }

            // 3. Fetch Google Calendar (Secondary/Optional Sync)
            if (googleTokens && googleTokens.refresh_token) {
                try {
                    oauth2Client.setCredentials({ refresh_token: googleTokens.refresh_token });
                    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

                    const startOfDay = new Date(`${args.date}T00:00:00-03:00`);
                    const endOfDay = new Date(`${args.date}T23:59:59-03:00`);

                    const response = await calendar.events.list({
                        calendarId: 'primary',
                        timeMin: startOfDay.toISOString(),
                        timeMax: endOfDay.toISOString(),
                        singleEvents: true,
                        orderBy: 'startTime'
                    });

                    const events = response.data.items || [];
                    events.forEach((ev: any) => {
                        const start = ev.start?.dateTime || ev.start?.date;
                        if (start) {
                            const timeStr = new Date(start).toLocaleTimeString('pt-BR', {
                                hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
                            });
                            busySlots.push(`[Google] ${timeStr}`);
                        }
                    });
                    console.log(`⬅️ Payload Google Calendar encontrado: ${events.length} eventos.`);
                } catch (gErr: any) {
                    console.error("⚠️ [GOOGLE CALENDAR ERROR]:", gErr.message);
                }
            }

            return {
                status: 'success',
                date: args.date,
                busy_slots: busySlots.length > 0 ? busySlots : 'Nenhum horário ocupado.',
                message: busySlots.length > 0
                    ? `Estes horários já estão OCUPADOS: ${busySlots.join(', ')}. Não agende neles.`
                    : `Agenda livre para os horários de operação normal.`
            };

        } catch (err: any) {
            console.error("❌ [CALENDAR ERROR]:", err.message);
            return { status: 'error', message: 'Falha ao consultar a disponibilidade de agenda.' };
        }
    }

    if (name === 'schedule_appointment') {
        console.log(`📅 [CALENDAR] Iniciando agendamento para ${args.client_name}`);

        try {
            const startTime = new Date(`${args.date}T${args.time}:00-03:00`);
            const durationInMinutes = args.duration_minutes ? Number(args.duration_minutes) : 60;
            const endTime = new Date(startTime.getTime() + (durationInMinutes * 60 * 1000));

            // 1. Insert into Native Supabase Calendar
            if (ownerId) {
                const { error: dbError } = await supabaseAdmin.from('appointments').insert({
                    owner_id: ownerId,
                    lead_phone: clientPhone,
                    client_name: args.client_name,
                    service_type: args.service_type,
                    appointment_date: args.date,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    duration_minutes: durationInMinutes,
                    status: 'confirmed'
                });

                if (dbError) {
                    console.error("❌ [DB INSERT ERROR]: Falha ao salvar agendamento nativo.", dbError);
                    throw new Error("Erro ao salvar no banco de dados.");
                }
                console.log(`✅ [NATIVE CALENDAR] Agendamento salvo no Supabase!`);
            } else {
                console.error("⚠️ [NATIVE CALENDAR ERROR]: ownerId ausente, falha ao gravar agendamento.");
                throw new Error("Erro interno: owner id não encontrado.");
            }

            // 2. Sync to Google Calendar (Optional)
            if (googleTokens && googleTokens.refresh_token) {
                try {
                    oauth2Client.setCredentials({ refresh_token: googleTokens.refresh_token });
                    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

                    await calendar.events.insert({
                        calendarId: 'primary',
                        requestBody: {
                            summary: `[AGENDADO] ${args.client_name} - ${args.service_type}`,
                            description: `Serviço: ${args.service_type}\nTelefone: ${clientPhone}\nDuração: ${durationInMinutes}m\n(Agendado via Eliza)`,
                            start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                            end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                        }
                    });
                    console.log(`✅ [GOOGLE CALENDAR] Sucesso! Evento sincronizado.`);
                } catch (syncErr: any) {
                    console.error("⚠️ [GOOGLE SYNC ERROR] Falha ao sincronizar agenda:", syncErr.message);
                }
            }

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

    // ==============================================================
    // 📦 SEND DIGITAL MEDIA (PDF, Portfolio, E-book)
    // ==============================================================
    if (name === 'send_digital_media') {
        console.log(`\n================= 📦 CONSOLE.GOD (SEND_MEDIA) 📦 =================`);
        console.log(`📦 [MEDIA] Sending ${args.media_type} to ${clientPhone} via instance ${instanceName}`);

        try {
            const evoUrl = process.env.EVOLUTION_API_URL || 'https://api.revivafotos.com.br';
            const evoKey = process.env.EVOLUTION_API_KEY || process.env.WOLF_SECRET_TOKEN || '';
            const targetInstance = instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'agente-lobo';

            // Map media_type to mimetype
            const mimeTypeMap: Record<string, string> = {
                'document': 'application/pdf',
                'image': 'image/jpeg'
            };
            const resolvedMimetype = mimeTypeMap[args.media_type] || 'application/octet-stream';

            const mediaPayload = {
                number: clientPhone,
                mediatype: args.media_type,
                mimetype: resolvedMimetype,
                media: args.file_url,
                caption: args.caption
            };

            console.log(`📦 [MEDIA] Payload being sent:`, JSON.stringify(mediaPayload));
            console.log(`📦 [MEDIA] Target URL: ${evoUrl}/message/sendMedia/${targetInstance}`);

            const mediaRes = await fetch(`${evoUrl}/message/sendMedia/${targetInstance}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': evoKey
                },
                body: JSON.stringify(mediaPayload)
            });

            const mediaResponseBody = await mediaRes.text();
            console.log(`📦 [MEDIA] Evolution API response: status=${mediaRes.status} body=${mediaResponseBody.substring(0, 300)}`);

            if (!mediaRes.ok) {
                console.error(`❌ [MEDIA ERROR] Evolution API returned ${mediaRes.status}: ${mediaResponseBody}`);
                return { status: 'error', message: `Failed to send media. Evolution API returned status ${mediaRes.status}.` };
            }

            console.log(`✅ [MEDIA] File sent successfully to ${clientPhone}!`);
            console.log(`=======================================================================\n`);
            return { status: 'success', message: `Media (${args.media_type}) sent successfully to the client.` };

        } catch (err: any) {
            console.error(`❌ [MEDIA EXCEPTION] Failed to send media:`, err.message, err.stack);
            return { status: 'error', message: `Exception while sending media: ${err.message}` };
        }
    }

    return { status: 'error', message: 'Tool execution skipped or not found. Please continue the conversation using standard text.' };
}

async function analyzeReceiptWithGemini(base64Data: string, clientPhone: string) {
    console.log(`📸 [VISION] Analisando comprovante de ${clientPhone}...`);

    for (let i = 0; i < MODEL_TIERS.length; i++) {
        const currentModel = MODEL_TIERS[i];
        try {
            const result = await ai.models.generateContent({
                model: currentModel,
                contents: [{
                    role: 'user',
                    parts: [
                        { text: "Analyze this PIX transfer receipt. You must extract the exact transfer amount. Ignore account balances. Return STRICTLY a valid JSON with no markdown formatting: { \"is_valid_pix\": boolean, \"amount\": number, \"receiver\": \"string\" }. If the amount is R$ 499,00, output 499.00." },
                        { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                    ]
                }]
            });

            const responseText = result.text || "";
            const cleanedJson = responseText.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanedJson);

        } catch (error: any) {
            const status = error.status || 500;
            if (i < MODEL_TIERS.length - 1 && (status === 503 || status === 429 || status === 500)) {
                console.warn(`⚠️ [LLM_FALLBACK] Vision Model ${currentModel} failed (${status}). Shifting to tier ${i + 2}...`);
                continue;
            }
            console.error("❌ [VISION ERROR]:", error);
            return { is_valid_pix: false, error: "Falha no processamento da imagem" };
        }
    }
}

async function transcribeAudioWithGemini(base64Audio: string, mimeType: string): Promise<string> {
    console.log(`🎙️ [VOICE] Transcrevendo com gemini-3.1-flash-lite-preview...`);
    const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;

    for (let i = 0; i < MODEL_TIERS.length; i++) {
        const currentModel = MODEL_TIERS[i];
        try {
            const result = await ai.models.generateContent({
                model: currentModel,
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
        } catch (error: any) {
            const status = error.status || 500;
            if (i < MODEL_TIERS.length - 1 && (status === 503 || status === 429 || status === 500)) {
                console.warn(`⚠️ [LLM_FALLBACK] Voice Model ${currentModel} failed (${status}). Shifting to tier ${i + 2}...`);
                continue;
            }
            console.error("❌ [VOICE ERROR] Falha na transcrição:", error);
            return "";
        }
    }
    return "";
}

// ==============================================================
// 🖼️ IMAGE ANALYSIS — PHOTO RESTORATION VISION (Gemini 2.5 Flash)
// ==============================================================
async function analyzeImageWithGemini(base64Image: string, clientPhone: string): Promise<string> {
    console.log(`\n================= 🖼️ CONSOLE.GOD (IMAGE_VISION) 🖼️ =================`);
    console.log(`🖼️ [VISION] Analyzing photo from ${clientPhone}...`);
    console.log(`🖼️ [VISION] Base64 payload size: ${base64Image.length} chars (${Math.round(base64Image.length * 0.75 / 1024)} KB estimated)`);

    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const visionPrompt = `You are an expert photo restorer evaluating a client's submission via WhatsApp.
Analyze the physical damage visible in this uploaded photograph (e.g., scratches, fading, tears, water damage, color loss, creases, stains).
Based on your analysis, generate a natural, concise, and conversational sales pitch in Brazilian Portuguese offering to restore the photo for a fee.
Be warm and empathetic — this is likely a treasured family memory.
You MUST output ONLY plain text. No markdown, no bullet points, no JSON. Just a natural conversational message as if you were texting the client.`;

    for (let i = 0; i < MODEL_TIERS.length; i++) {
        const currentModel = MODEL_TIERS[i];
        try {
            console.log(`⏳ [VISION] Calling ${currentModel} with vision prompt...`);
            const visionStartTime = Date.now();

            const result = await ai.models.generateContent({
                model: currentModel,
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } },
                        { text: visionPrompt }
                    ]
                }],
                config: {
                    temperature: 0.7
                }
            });

            const responseText = (result.text || "").trim();
            console.log(`✅ [VISION] ${currentModel} responded in ${Date.now() - visionStartTime}ms`);
            console.log(`🖼️ [VISION] Analysis result (${responseText.length} chars): "${responseText.substring(0, 150)}..."`);
            console.log(`=======================================================================\n`);

            return responseText;
        } catch (error: any) {
            const status = error.status || 500;
            if (i < MODEL_TIERS.length - 1 && (status === 503 || status === 429 || status === 500)) {
                console.warn(`⚠️ [LLM_FALLBACK] Vision Model ${currentModel} failed (${status}). Shifting to tier ${i + 2}...`);
                continue;
            }
            console.error(`❌ [VISION ERROR] Image analysis failed:`, error.message, error.stack);
            return "";
        }
    }
    return "";
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
            .select('id, context_json, plan_tier, trial_ends_at, business_name, business_niche, custom_rules')
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
            .select('role, content, created_at')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: false })
            .limit(20);

        // Reverse to restore chronological order (Gemini needs sequential history)
        let chatHistory = (rawHistory || []).reverse();

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

        // Fetch niche-specific dynamic data (PRIORITIZE DASHBOARD context_json)
        const fullConfig = configData?.context_json as any;
        const businessName = fullConfig?.business_info?.name || configData?.business_name || 'Nosso Estabelecimento';
        const businessNiche = configData?.business_niche || 'serviço especializado';
        const customRules = fullConfig?.custom_prompt || configData?.custom_rules || 'Responda de forma natural e ajude com agendamentos.';

        const botName = fullConfig?.business_info?.bot_name || fullConfig?.bot_name || 'Eliza';

        const greetingRegex = /^(oi|oii|olá|ola|ei|bom dia|boa tarde|boa noite|tudo bem|opa|hello)[\s\W]*$/i;
        const isGreetingOnly = chatHistory.length === 0 && greetingRegex.test(currentMessage.trim());

        if (isGreetingOnly) {
            console.log(`👋 [ELIZA_FLOW] Saudação detectada. Iniciando funil de atendimento.`);
            console.log(`🚫 [ELIZA_FLOW] Handoff bloqueado para mensagem inicial.`);
            dynamicInstruction += `\n⚠️ CRITICAL OVERRIDE: O usuário apenas enviou uma saudação inicial. VOCÊ NÃO PODE ACIONAR O HANDOFF (notify_human_specialist). Responda com fluidez natural: identifique-se como ${botName}, assistente virtual da ${businessName}, e pergunte como pode ajudar, seguindo suas instruções de negócio.`;
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



        let systemInstruction = "";

        // CHECK IF IT'S A FULL PROMPT OVERRIDE (MANUAL MODE)
        if (customRules.includes("# 1. IDENTITY")) {
            console.log(`🧠 [ELIZA_FLOW] Full Prompt Override detectado. Ignorando template interno.`);
            systemInstruction = customRules;
        } else {
            systemInstruction = `# 1. IDENTITY & CORE MISSION
You are the AI Assistant for ${businessName}, a specialized ${businessNiche}. Your mission is to follow these specific rules: ${customRules}

# 1.1 TONE OF VOICE & PERSONALITY
- ESTILO BASE: Você deve assumir rigorosamente o arquétipo "${toneStyle}".
- REGRAS COMPORTAMENTAIS: ${toneRules}

# 2. STRICT RULES & GUARDRAILS (RAIL MODE)
- ENTRY POINT: Greetings ("Olá", "Bom dia") are engagement triggers. Respond cordially, introduce yourself as ${botName}, the virtual assistant of ${businessName}, and ask how you can help.
- CONSTRAINT 1 (NO CHITCHAT): You are a professional assistant, not a friend. Beyond the initial greeting, do not make open-ended conversation. Keep the flow moving towards the business goal.
- CONSTRAINT 2 (SHORT ANSWERS): Your responses must be extremely concise. Maximum of 2 text bubbles per interaction. Maximum of 20 words per bubble. Use the "||" separator to split distinct ideas.
- CONSTRAINT 3 (NO HALLUCINATIONS): Base prices, services, and rules STRICTLY on the "BUSINESS CONTEXT". If a user asks for a service or price not listed, DO NOT invent it.
- CONSTRAINT 4 (ESCAPE HATCH - HANDOFF RESTRICTED): The 'notify_human_specialist' tool must be your LAST option. ONLY execute it if: (1) The client insists on off-topic subjects after 2 attempts to return to the business funnel. (2) The client explicitly asks to speak with a human. (3) A critical technical error occurs. NEVER classify a greeting as urgency "medium" or "high". If triggered, say EXACTLY: "Vou pedir para um especialista te ajudar com isso, só um momento." followed by "[HANDOFF_TRIGGERED]".

# 3. OPERATION FUNNEL
Follow the business rules provided in your CORE MISSION. If the task involves scheduling, use the following steps:

## STEP 1: SERVICE IDENTIFICATION
Identify which service or product the user wants based ONLY on the BUSINESS CONTEXT.

## STEP 2: AVAILABILITY & DETAILS
If scheduling is needed, ask for the preferred date and use 'check_calendar_availability'. Offer a maximum of TWO available time slots.

## STEP 3: EXECUTION
- GOLDEN RULE: NEVER confirm a transaction or booking textually before successfully executing the required tool.
- For bookings, ask for the full name ONLY after a slot is chosen.
- ONLY AFTER the data is collected, execute the appropriate tool (e.g., 'schedule_appointment').
- Inform the client of confirmation ONLY after the tool returns success.
`;
        }

        // ALWAYS APPEND DYNAMIC DATA
        systemInstruction += `
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
        console.log(`\n================= 🤖 FINAL CONSTRUCTED SYSTEM PROMPT 🤖 =================`);
        console.log(systemInstruction);
        console.log(`=========================================================================\n`);

        // 4. Fallback Model Loop (Tiered Strategy)
        let responseText = '';
        let wasHandoffToolCalled = false;
        let success = false;

        const cleanedHistory = chatHistory
            .filter((msg: any) => {
                const isHandoff = msg.content.includes("[HANDOFF_TRIGGERED]");
                const isEscape = msg.content.includes("Vou pedir para a especialista");
                return !isHandoff && !isEscape;
            })
            .map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }));

        for (let i = 0; i < MODEL_TIERS.length; i++) {
            const currentModel = MODEL_TIERS[i];
            try {
                const chat = ai.chats.create({
                    model: currentModel,
                    config: {
                        systemInstruction: systemInstruction,
                        tools: [{ functionDeclarations }] as any,
                    },
                    history: cleanedHistory,
                });

                console.log(`⏳ [LLM] Calling ${currentModel} with message: "${currentMessage.substring(0, 80)}..."`);
                const llmStartTime = Date.now();
                let result = await chat.sendMessage({ message: currentMessage });
                console.log(`✅ [LLM] ${currentModel} responded in ${Date.now() - llmStartTime}ms. Has text: ${!!result.text}, Has tools: ${!!result.functionCalls}`);

                // 5. Tool Loop (Function Calling)
                let loopCount = 0;
                while (result.functionCalls && result.functionCalls.length > 0 && loopCount < 3) {
                    loopCount++;
                    const functionResponseParts: any[] = [];

                    for (const call of result.functionCalls) {
                        if (call.name === 'notify_human_specialist') wasHandoffToolCalled = true;
                        const output = await executeToolCall(call.name || '', call.args, clientNumber, googleTokens, lead.owner_id, JSON.parse(businessContext), instanceToUse);
                        functionResponseParts.push({ functionResponse: { name: call.name, response: output } });
                    }

                    console.log(`🔄 [TOOL] Returning tool response to ${currentModel}...`);
                    result = await chat.sendMessage({ message: functionResponseParts });
                }

                responseText = result.text || '';
                success = true;
                break; // Success! Exit model loop

            } catch (error: any) {
                const status = error.status || 500;
                if (i < MODEL_TIERS.length - 1 && (status === 503 || status === 429 || status === 500)) {
                    console.warn(`⚠️ [LLM_FALLBACK] Main Model ${currentModel} failed (${status}). Shifting to tier ${i + 2}: ${MODEL_TIERS[i + 1]}...`);
                    continue;
                }
                throw error; // Re-throw fatal or final model error
            }
        }

        if (!success) {
            throw new Error('ELIZA FATAL: All model tiers exhausted.');
        }

        // 🛡️ [EMPTY STRING SHIELD]
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

http.createServer((req: any, res: any) => {
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
        req.on('data', (chunk: any) => { bodyStr += chunk.toString(); });

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

                if (instanceName === 'unknown' || !instanceName) {
                    console.warn(`⚠️ [ROUTER] Warning: instanceName is "${instanceName}". This may cause lookup failures.`);
                }

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

                    const rawState = candidates.find((c: any) => typeof c === 'string' && c.length > 0) || 'unknown';
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

                        if (newStatus === 'CONNECTED') {
                            const sevenDaysFromNow = new Date();
                            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                            const newTrialDate = sevenDaysFromNow.toISOString();

                            updatePayload.plan_tier = 'TRIAL';
                            updatePayload.trial_ends_at = newTrialDate;

                            console.log(`[TRIAL_ACTIVATION] Instance connected. Account ${config.owner_id} forced to TRIAL, trial_ends_at updated to:`, newTrialDate);
                        }

                        const { error: updateError } = await supabaseAdmin
                            .from('business_config')
                            .update(updatePayload)
                            .eq('id', config.id);

                            // 🔄 [SYNC] Propagate trial status to user profile for Header/UI usage
                            if (updatePayload.plan_tier === 'TRIAL') {
                                console.log(`🔄 [SYNC] Syncing FORCED TRIAL status to profile for owner: ${config.owner_id}`);
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

                // 1. EXTRACT CORE VARIABLES (Early Resolution to prevent ReferenceErrors)
                const remoteJid = dataObj.key?.remoteJid || '';
                
                // ROBUST JID RESOLUTION: Strictly prioritize key.participant (physical sender) -> key.remoteJidAlt -> key.remoteJid
                const jidCandidates = [
                    dataObj.key?.participant,     // v2 physical sender (PRIORITY)
                    dataObj.key?.remoteJidAlt,    // v2 alternative
                    dataObj.key?.remoteJid,       // v1/v2 standard
                    dataObj.participant,           // v1 legacy
                    body.sender                   // Z-API variant
                ];
                
                const rawJid = jidCandidates.find(c => typeof c === 'string' && c.includes('@s.whatsapp.net')) || String(remoteJid);
                const clientNumber = normalizePhone(rawJid);
                const incomingMessageId = dataObj.key?.id;
                const messageObj = dataObj.message;
                const isFromMe = dataObj.key?.fromMe === true;

                console.log(`🔍 [JID_DEBUG] rawJid="${rawJid}" | normalized="${clientNumber}" | remoteJid="${remoteJid}"`);

                if (!clientNumber || clientNumber === '55' || clientNumber.length < 5) {
                    console.error(`🛡️ [GUARD] Aborting: Failed to resolve valid JID from payload.`);
                    console.error(`🛡️ [DEBUG] Payload keys:`, JSON.stringify(Object.keys(dataObj.key || {})));
                    console.error(`🛡️ [DEBUG] jidCandidates values:`, JSON.stringify(jidCandidates));
                    return;
                }

                // 🛡️ [GUARD] Strict Null Message Check
                if (!messageObj) {
                    console.log(`🔇 [ROUTER] Dropped message from ${clientNumber}: message object is null (likely a sticker, reaction, or system event)`);
                    return;
                }

                // 2. HARDEN TENANT ID (Recovery Path)
                if (!tenantId) {
                    console.log(`🔍 [RECOVERY] tenantId missing from URL. Attempting lookup for instance: ${instanceName}`);
                    const { data: config } = await supabaseAdmin
                        .from('business_config')
                        .select('owner_id')
                        .eq('instance_name', instanceName)
                        .maybeSingle();
                    
                    if (config?.owner_id) {
                        tenantId = config.owner_id;
                        console.log(`✅ [RECOVERY] tenantId recovered: ${tenantId}`);
                    } else {
                        console.warn(`⚠️ [RECOVERY] Failed to recover tenantId for ${instanceName}. Upsert may fail.`);
                    }
                }

                // 3. SECURITY SHIELDS
                if (remoteJid.endsWith('@g.us')) {
                    console.log('🔇 [WEBHOOK] Grupo ignorado:', remoteJid);
                    return;
                }

                if (isFromMe) {
                    const bypassNumber = process.env.BYPASS_NUMBER ? normalizePhone(process.env.BYPASS_NUMBER) : null;
                    if (bypassNumber && clientNumber === bypassNumber) {
                        console.log(`🧪 [TESTING] Bypassing fromMe filter for test number: ${clientNumber}`);
                    } else {
                        console.log(`🛡️ [FILTER] Dropped message from ${remoteJid}: fromMe is true (Self-messaging/Anti-loop)`);
                        return;
                    }
                }

                let clientMessage = '';

                // --- 🎙️ ÁUDIO E 💬 TEXTO ---
                if (messageObj.audioMessage) {
                    console.log(`🎙️ [WEBHOOK] Áudio recebido de ${clientNumber}.`);

                    try {
                        const evoUrl = process.env.EVOLUTION_API_URL || 'https://api.revivafotos.com.br';
                        const evoKey = process.env.EVOLUTION_API_KEY || process.env.WOLF_SECRET_TOKEN || '';

                        console.log(`📡 [DEBUG AUDIO] Pedindo para Evolution descriptografar o áudio...`);

                        // FIX: URL spaces removed
                        const mediaRes = await fetch(`${evoUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': evoKey
                            },
                            body: JSON.stringify({ message: dataObj })
                        });

                        if (!mediaRes.ok) {
                            console.error(`❌ [DEBUG AUDIO] Erro na descriptografia da Evolution: ${mediaRes.status}`);
                        } else {
                            const mediaData = await mediaRes.json();

                            if (mediaData && mediaData.base64) {
                                const audioBase64 = mediaData.base64;
                                const cleanMimeType = (mediaData.mimetype || "audio/ogg").split(';')[0];

                                console.log(`🔍 [DEBUG AUDIO] Áudio descriptografado: ${audioBase64.length} chars | Formato: ${cleanMimeType}`);

                                if (audioBase64.length < 500) {
                                    console.log(`⚠️ [DEBUG AUDIO] Base64 muito curto. Áudio vazio. Abortando.`);
                                } else {
                                    const transcript = await transcribeAudioWithGemini(audioBase64, cleanMimeType);

                                    if (transcript && transcript !== "[SILÊNCIO]") {
                                        clientMessage = transcript;
                                        console.log(`📝 [VOICE] Áudio transcrito com sucesso: "${clientMessage}"`);
                                    } else {
                                        console.log(`⚠️ [VOICE] Transcrição falhou ou áudio mudo.`);
                                    }
                                }
                            } else {
                                console.error(`❌ [DEBUG AUDIO] Evolution não retornou o Base64 no payload.`);
                            }
                        }
                    } catch (error: any) {
                        console.error('❌ [WEBHOOK CRASH] (Audio Extraction):', error.message, error.stack);
                    }
                }

                // --- 🖼️ IMAGEM (PHOTO RESTORATION VISION) ---
                if (!clientMessage && messageObj.imageMessage) {
                    console.log(`🖼️ [WEBHOOK] Imagem recebida de ${clientNumber}. Iniciando pipeline de visão...`);

                    try {
                        const evoUrl = process.env.EVOLUTION_API_URL || 'https://api.revivafotos.com.br';
                        const evoKey = process.env.EVOLUTION_API_KEY || process.env.WOLF_SECRET_TOKEN || '';

                        console.log(`📡 [DEBUG IMAGE] Pedindo para Evolution descriptografar a imagem...`);

                        const imageMediaRes = await fetch(`${evoUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': evoKey
                            },
                            body: JSON.stringify({ message: dataObj })
                        });

                        if (!imageMediaRes.ok) {
                            console.error(`❌ [DEBUG IMAGE] Evolution decryption error: ${imageMediaRes.status}`);
                        } else {
                            const imageMediaData = await imageMediaRes.json();

                            if (imageMediaData && imageMediaData.base64) {
                                const imageBase64 = imageMediaData.base64;
                                console.log(`🔍 [DEBUG IMAGE] Image decrypted: ${imageBase64.length} chars | Mime: ${imageMediaData.mimetype || 'image/jpeg'}`);

                                if (imageBase64.length < 500) {
                                    console.log(`⚠️ [DEBUG IMAGE] Base64 too short. Corrupt or empty image. Aborting vision pipeline.`);
                                } else {
                                    const visionAnalysis = await analyzeImageWithGemini(imageBase64, clientNumber);

                                    if (visionAnalysis && visionAnalysis.length > 10) {
                                        clientMessage = visionAnalysis;
                                        console.log(`✅ [VISION] Photo analysis assigned to clientMessage (${clientMessage.length} chars)`);
                                    } else {
                                        console.log(`⚠️ [VISION] Analysis returned empty or too short. Falling back to text extraction.`);
                                    }
                                }
                            } else {
                                console.error(`❌ [DEBUG IMAGE] Evolution did not return base64 in payload.`);
                            }
                        }
                    } catch (imageError: any) {
                        console.error('❌ [WEBHOOK CRASH] (Image Extraction):', imageError.message, imageError.stack);
                    }
                }

                if (!clientMessage) {
                    clientMessage = messageObj.conversation || messageObj.extendedTextMessage?.text || '';
                }

                const ownerPhone = normalizePhone(process.env.OWNER_PHONE || '554899999999');
                const isOwner = clientNumber === ownerPhone;

                if (clientMessage && clientMessage.trim().length > 0) {
                    // --- LÓGICA DE ADMIN / SILENT HANDOFF ---
                    if (isFromMe || isOwner) {
                        const isAPI = incomingMessageId && (incomingMessageId.startsWith('BAE5') || incomingMessageId.startsWith('B2B') || incomingMessageId.length > 32);

                        if (isAPI) {
                            return; // Eliza response, ignore
                        } else {
                            const cmd = clientMessage.trim();

                            if (cmd === '/pausar') {
                                await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                                console.log(`⏸️ [COMANDO] IA pausada manualmente para ${clientNumber}.`);
                                return;
                            } else if (cmd === '/retomar') {
                                await supabaseAdmin.from('leads_lobo').update({ ai_paused: false, needs_human: false, status: 'organic_inbound' }).eq('phone', clientNumber);
                                console.log(`▶️ [COMANDO] IA retomada manualmente para ${clientNumber}.`);
                                return;
                            }

                            console.log(`🛡️ [FOGO AMIGO] Denis assumiu o controle via ${isOwner ? 'OWNER_PHONE' : 'DIRECT'}. Travando a IA para o lead ${clientNumber}.`);
                            await supabaseAdmin.from('leads_lobo').update({
                                needs_human: true,
                                ai_paused: true,
                                status: 'human_handling'
                            }).eq('phone', clientNumber);

                            return;
                        }
                    }

                    if (clientMessage) {
                        console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);

                        const autoReplyKeywords = ['bem-vindo', 'digite 1', 'mensagem automática', 'em breve retornaremos'];
                        const msgLower = clientMessage.toLowerCase();
                        if (autoReplyKeywords.some((kw: string) => msgLower.includes(kw))) {
                            console.log(`🛡️ [SHIELD] Auto-reply detected. Ignorando.`);
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
                                await supabaseAdmin.from('leads_lobo').update({
                                    is_locked: true,
                                    status: 'needs_human',
                                    ai_paused: true,
                                    needs_human: true
                                }).eq('phone', clientNumber);
                                return;
                            }

                            if (lead.is_locked === true) {
                                console.log(`🔒 [GUARD] Lead is_locked=true. Ignoring message from ${clientNumber}.`);
                                return;
                            }

                            if (lead.ai_paused === true || lead.needs_human === true) {
                                console.log(`🔓 [GUARD] Lead was paused. New message received — unpausing for AI.`);
                                await supabaseAdmin.from('leads_lobo').update({
                                    ai_paused: false,
                                    needs_human: false
                                }).eq('id', lead.id);
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

                            console.log(`\n================= 🛸 CONSOLE.GOD (UPSERT PRE-FLIGHT) 🛸 =================`);
                            console.log(`📱 Phone: ${clientNumber}`);
                            console.log(`🤖 Instance: ${instanceName}`);
                            console.log(`🔑 Tenant/Owner: ${tenantId}`);
                            console.log(`🛡️ isFromMe: ${isFromMe}`);
                            console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
                            console.log(`========================================================================\n`);

                            let { data: newLead, error: insertError } = await supabaseAdmin
                                .from('leads_lobo')
                                .upsert(payload, { onConflict: 'phone' })
                                .select()
                                .single();

                            if (insertError) {
                                if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                                    const { data: fallbackLead } = await supabaseAdmin
                                        .from('leads_lobo')
                                        .select('*')
                                        .eq('phone', clientNumber)
                                        .single();
                                    newLead = fallbackLead;
                                } else {
                                    console.error(`❌ [SUPABASE ERROR] Failed to CREATE lead:`, insertError.message);
                                    return;
                                }
                            }
                            lead = newLead;
                        }

                        // --- SALVAMENTO E GATILHO (IDEMPOTENT) ---
                        // FIX: Use upsert with onConflict for message_id to handle Evolution API retries
                        const { error: msgInsertError } = await supabaseAdmin.from('messages').upsert({
                            lead_phone: clientNumber, 
                            role: 'user', 
                            content: clientMessage, 
                            message_id: incomingMessageId,
                            instance_name: instanceName
                        }, { onConflict: 'message_id' });

                        if (msgInsertError) {
                            console.error(`❌ [SUPABASE ERROR] Failed to upsert message:`, msgInsertError.message);
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
                                await supabaseAdmin.from('leads_lobo').update({
                                    status: newStatus,
                                    needs_human: true,
                                    ai_paused: true
                                }).eq('id', lead.id);
                            } else if (msgClean === '3') {
                                menuResponse = "Você escolheu a Opção 3: Horários de funcionamento.\n🕒 Funcionamos das 08:00 às 18:00 de segunda a sexta.\n\nDigite 0 para voltar ao menu principal.";
                            } else {
                                menuResponse = "Olá! Bem-vindo ao *Menu Estático de Teste*.\n\nEscolha uma opção:\n1️⃣ Nossos serviços e preços\n2️⃣ Falar com atendente\n3️⃣ Horários de funcionamento";
                            }

                            await sendWhatsAppPresence(clientNumber, 'composing');
                            await sendWhatsAppMessage(clientNumber, menuResponse, 1000);
                            await supabaseAdmin.from('leads_lobo').update({ status: newStatus }).eq('id', lead.id);
                            return;
                        }

                        // --- BRANCH B: AI AGENT ---
                        if (instanceName !== 'demo-menu') {
                            console.log(`🎯 [ROUTER] Routing instance ${instanceName} to AI Agent processing.`);

                            let configQuery = supabaseAdmin.from('business_config').select('context_json').eq('instance_name', instanceName);
                            if (tenantId) configQuery = configQuery.eq('owner_id', tenantId);

                            const { data: bConfig } = await configQuery.maybeSingle();
                            const instanceEnabled = bConfig?.context_json?.is_ai_enabled;

                            const { data: elizaSwitch } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'eliza_active').maybeSingle();
                            const globalEnabled = !elizaSwitch || elizaSwitch.value?.enabled !== false;

                            let shouldProceed = instanceEnabled === true ? true : (instanceEnabled === false ? false : globalEnabled);

                            if (!shouldProceed) {
                                console.log(`🛑 [PAUSE] Lead ${clientNumber} ignored (Instance: ${instanceEnabled}, Global: ${globalEnabled}).`);
                                await supabaseAdmin.from('leads_lobo').update({ status: 'needs_human', needs_human: true }).eq('phone', clientNumber);
                                return;
                            }

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

            } catch (error: any) {
                console.error('❌ [WEBHOOK CRASH]:', error.message, error.stack);
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