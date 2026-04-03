import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import { google } from 'googleapis';
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
        name: 'check_cabin_availability',
        description: 'Verifica se a cabana está livre para um período de datas.',
        parameters: {
            type: 'OBJECT',
            properties: {
                check_in: { type: 'STRING', description: 'Data de entrada no formato YYYY-MM-DD' },
                check_out: { type: 'STRING', description: 'Data de saída no formato YYYY-MM-DD' }
            },
            required: ['check_in', 'check_out'],
        },
    },
    {
        name: 'schedule_cabin_reservation',
        description: 'Bloqueia o calendário e agenda a cabana.',
        parameters: {
            type: 'OBJECT',
            properties: {
                check_in: { type: 'STRING', description: 'Data de entrada YYYY-MM-DD' },
                check_out: { type: 'STRING', description: 'Data de saída YYYY-MM-DD' },
                client_name: { type: 'STRING', description: 'Nome do hóspede' },
                guest_count: { type: 'NUMBER', description: 'Número total de pessoas' }
            },
            required: ['check_in', 'check_out', 'client_name', 'guest_count'],
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

    if (name === 'check_cabin_availability') {
        console.log(`\n================= 🏖️ CONSOLE.GOD (CABIN CHECK) 🏖️ =================`);
        console.log(`📅 [API] Verificando cabana: ${args.check_in} até ${args.check_out}`);

        try {
            const timeMin = new Date(`${args.check_in}T14:00:00-03:00`).toISOString();
            const timeMax = new Date(`${args.check_out}T12:00:00-03:00`).toISOString();

            const response = await calendar.events.list({
                calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
                timeMin: timeMin,
                timeMax: timeMax,
                singleEvents: true,
                orderBy: 'startTime'
            });

            const events = response.data.items || [];
            console.log(`⬅️ [API] Retornou ${events.length} eventos conflitantes.`);

            if (events.length > 0) {
                events.forEach((ev: any) => console.log(`   - Bloqueio: ${ev.summary} (${ev.start?.dateTime || ev.start?.date})`));
                return { 
                    status: 'unavailable', 
                    message: `As datas de ${args.check_in} a ${args.check_out} já estão ocupadas. Peça para o cliente sugerir novas datas.` 
                };
            }

            return { 
                status: 'available', 
                message: `Período livre. Informe as regras, o valor total e peça o NOME COMPLETO e a QUANTIDADE DE PESSOAS para reservar.` 
            };
        } catch (err: any) {
            console.error("❌ [CALENDAR ERROR]:", err.message);
            return { status: 'error', message: 'Falha na API do Calendar.' };
        }
    }

    if (name === 'schedule_cabin_reservation') {
        console.log(`\n================= 📝 CONSOLE.GOD (CABIN BOOKING) 📝 =================`);
        console.log(`📅 [API] Reservando para ${args.client_name} (${args.guest_count} pax)`);

        try {
            const startTime = new Date(`${args.check_in}T14:00:00-03:00`);
            const endTime = new Date(`${args.check_out}T12:00:00-03:00`);
            
            await calendar.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
                requestBody: {
                    summary: `[RESERVA] ${args.client_name}`,
                    description: `Hóspedes: ${args.guest_count}\nTelefone: ${clientPhone}\nOrigem: IA WhatsApp`,
                    start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                    end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                    colorId: '5'
                }
            });

            console.log(`✅ [CALENDAR] Reserva efetuada com sucesso.`);
            return {
                status: 'success',
                message: 'Reserva confirmada. Envie a chave PIX e informe que o pagamento de 50% garante a data.'
            };
        } catch (err: any) {
            console.error("❌ [CALENDAR EXCEPTION]:", err.message);
            return { status: "error", message: err.message };
        }
    }

    return { status: 'error', message: 'Tool execution skipped or not found. Please continue the conversation using standard text.' };
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
    console.log(`\n===========================================`);
    console.log(`🧠 [ELIZA] Processing Lead: ${clientNumber}`);

    try {
        // 1. Lock lead status
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // 2. Load context and history
        console.log(`📡 [DB] Buscando business_context atualizado no Supabase...`);

        const { data: configData, error: configError } = await supabaseAdmin
            .from('business_config')
            .select('context_json')
            .eq('id', 1)
            .single();

        let businessContext = "";
        if (configError || !configData) {
            console.error(`❌ [DB ERROR] Falha ao carregar o cérebro da clínica:`, configError?.message);
            // Fallback de segurança mínimo caso o banco caia
            businessContext = JSON.stringify({ servicos: [], aviso: "Sistema em manutenção" });
        } else {
            businessContext = JSON.stringify(configData.context_json);
            console.log(`✅ [DB] Contexto de negócio carregado com sucesso (${businessContext.length} bytes).`);
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

        // Extração segura do tom de voz
        const toneStyle = configData?.context_json?.tone_of_voice?.base_style || 'Amigável e profissional';
        const toneRules = configData?.context_json?.tone_of_voice?.custom_instructions || 'Responda de forma natural.';

        let systemInstruction = `# 1. IDENTITY & CORE MISSION
You are Eliza, an AI Virtual Concierge for a vacation rental cabin. Your ONLY purpose is to inform prices, check calendar availability, and schedule reservations.
CRITICAL INSTRUCTION: ALL YOUR RESPONSES TO THE USER MUST BE GENERATED EXCLUSIVELY IN NATURAL BRAZILIAN PORTUGUESE (PT-BR). 

# 1.1 TONE OF VOICE & PERSONALITY
- ESTILO BASE: Você deve assumir rigorosamente o arquétipo "${toneStyle}".
- REGRAS COMPORTAMENTAIS: ${toneRules}

# 2. STRICT RULES & GUARDRAILS (RAIL MODE)
- ENTRY POINT: Greetings ("Olá", "Bom dia") are engagement triggers. Respond cordially, introduce yourself as Eliza, the virtual assistant of [NOME DA EMPRESA], and ask how you can help, immediately guiding them to STEP 1.
- CONSTRAINT 1 (NO CHITCHAT): You are a concierge, not a friend. Beyond the initial greeting, do not make open-ended conversation. Keep the flow moving to the reservation.
- CONSTRAINT 2 (SHORT ANSWERS): Your responses must be extremely concise. Maximum of 2 text bubbles per interaction. Maximum of 20 words per bubble. Use the "||" separator to split distinct ideas.
- CONSTRAINT 3 (NO HALLUCINATIONS): Base prices, rules, and availability STRICTLY on the "BUSINESS CONTEXT". If a user asks for something not listed, DO NOT invent it.
- CONSTRAINT 4 (ESCAPE HATCH - HANDOFF RESTRICTED): The 'notify_human_specialist' tool must be your LAST option. ONLY execute it if: (1) The client insists on off-topic subjects after 2 attempts to return to the booking funnel. (2) The client explicitly asks to speak with a human. (3) A critical technical error occurs. NEVER classify a greeting as urgency "medium" or "high". If triggered, say EXACTLY: "Vou pedir para a especialista responsável te ajudar com isso, só um momento." followed by "[HANDOFF_TRIGGERED]".

# 3. THE LINEAR BOOKING FUNNEL
You must force the user down this exact path. Do not skip steps unless the user explicitly provides the information upfront.

## STEP 1: DATE COLLECTION
Ask the user for their exact check-in and check-out dates.

## STEP 2: CALENDAR CHECK
Once you have both dates, execute the 'check_cabin_availability' tool. If available, inform them of the total price based on the BUSINESS CONTEXT rules (daily rate + cleaning fee) and ask for their full name and number of guests.

## STEP 3: RESERVATION
ONLY AFTER the user provides their name and guest count, execute the 'schedule_cabin_reservation' tool. Never confirm the reservation textually before the tool returns a success status.

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

        const responseText = result.text || '';

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

                await sendWhatsAppMessage(clientNumber, escapeMessage, 1000);

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

        await sendWhatsAppPresence(clientNumber, 'composing');

        console.log('📤 Sending chunks to WhatsApp:', chunks);
        await sendWhatsAppPresence(clientNumber, 'composing');

        const CHARS_PER_SECOND = 15;
        let accumulatedDelayMs = 0;

        for (const chunk of chunks) {
            // Calcula o tempo de "digitação" baseado no tamanho da bolha (mínimo 2s, máximo 12s)
            const bubbleTypingTimeMs = Math.max(2000, Math.min((chunk.length / CHARS_PER_SECOND) * 1000, 12000));
            accumulatedDelayMs += bubbleTypingTimeMs;

            console.log(`⌨️[TYPING] Bolha enviada em ${Math.round(accumulatedDelayMs / 1000)} s: "${chunk.substring(0, 30)}..."`);
            await sendWhatsAppMessage(clientNumber, chunk, accumulatedDelayMs);

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
                    console.log(`🛡️[WEBHOOK] Mensagem ignorada(Fogo Amigo).Origem: Outbound(Você enviou).`);
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
                    console.log(`🎙️[WEBHOOK] Áudio recebido de ${clientNumber}.`);

                    try {
                        // Configurações da sua Evolution API
                        const evoUrl = process.env.EVOLUTION_API_URL || 'https://api.revivafotos.com.br';
                        const instanceName = body.instance || 'agente-lobo';
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

                if (messageObj.imageMessage) {
                    console.log('🖼️ [WEBHOOK] Image received but ignored. Delegating payment to gateway.');
                }

                if (!clientMessage) {
                    clientMessage = messageObj.conversation || messageObj.extendedTextMessage?.text || '';
                }

                if (clientMessage && clientMessage.trim().length > 0) {
                    // --- LÓGICA DE ADMIN / SILENT HANDOFF ---
                    // ==============================================================
                    // 🛡️ A TRAVA GOD TIER (SILENT HANDOFF & FOGO AMIGO)
                    // ==============================================================
                    if (isFromMe) {
                        // Verifica se a mensagem foi enviada pelo próprio sistema (Eliza) via API
                        const isAPI = incomingMessageId && (incomingMessageId.startsWith('BAE5') || incomingMessageId.startsWith('B2B') || incomingMessageId.length > 32);

                        if (isAPI) {
                            // É a Eliza respondendo. Ignoramos para não criar loop.
                            return;
                        } else {
                            // É VOCÊ (Denis/Humano) digitando diretamente no WhatsApp ou WhatsApp Web.
                            let clientMessage = messageObj?.conversation || messageObj?.extendedTextMessage?.text || '';
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
                            console.log(`🛡️[FOGO AMIGO] Denis assumiu o controle.Travando a IA para o lead ${clientNumber}.`);
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

                        let { data: lead } = await supabaseAdmin.from('leads_lobo').select('*').eq('phone', clientNumber).maybeSingle();

                        if (lead) {
                            await supabaseAdmin.from('leads_lobo').update({ replied: true }).eq('phone', clientNumber);

                            if (lead.updated_at) {
                                const timeSinceContact = Date.now() - new Date(lead.updated_at).getTime();
                                if (timeSinceContact < 2000) {
                                    console.log(`🛡️[SHIELD] Auto - reply(Rápido demais).Ignorando.`);
                                    return;
                                }
                            }

                            if ((lead.reply_count || 0) >= 10) {
                                console.log(`🚨[CIRCUIT BREAKER] Bot Loop.Travando ${clientNumber}.`);
                                await supabaseAdmin.from('leads_lobo').update({ is_locked: true, status: 'needs_human', ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                                return;
                            }

                            if (lead.is_locked === true || lead.ai_paused === true || lead.needs_human === true) {
                                console.log(`🔒 Lead travado ou com humano.Ignorando.`);
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
                        console.log(`🎯[WEBHOOK] Status de ${clientNumber} -> 'eliza_processing'.Worker assumindo.`);
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
}).listen(PORT, () => console.log(`🌐 Server(Healthcheck & Webhook) running on port ${PORT} `));

startPolling();