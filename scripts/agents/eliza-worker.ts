import * as http from 'http';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence, getBaseUrl } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import { google } from 'googleapis';
import { hasAccess } from '../../lib/auth/access-control';
import { PlanTier } from '../../lib/supabase/types';
import { generateGoogleAuthUrl } from '../../lib/google/auth';

console.log('[BOOT TRACE] 1. Imports and environment loaded');

/**
 * ELIZA WORKER - THE SILVER EAR (V2)
 * Native Multimodal Audio Processing + State Machine
 */

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});
console.log('[BOOT TRACE] 2. AI SDK Initialized');

process.env.TZ = 'America/Sao_Paulo';

// ==========================================
// 🛠️ UTILS: IDENTITY & INSTANCE RESOLVER
// ==========================================
async function resolveOwnerId(profile: any, lastMessage?: any): Promise<string> {
    // 1. If message has instance_name, resolve via business_config
    if (lastMessage?.instance_name) {
        const { data: bConfig } = await supabaseAdmin
            .from('business_config')
            .select('owner_id')
            .eq('instance_name', lastMessage.instance_name)
            .maybeSingle();
        if (bConfig?.owner_id) {
            console.log(`🔗 [RESOLVER] Owner found via Message Instance: ${lastMessage.instance_name} -> ${bConfig.owner_id}`);
            return bConfig.owner_id;
        }
    }

    // 3. SAFE FALLBACK: Assume the profile IS the owner (Onboarding/Testing scenario)
    return profile.id;
}

async function resolveInstance(ownerId: string): Promise<string> {
    // Database business_config lookup
    const { data: bConfig } = await supabaseAdmin
        .from('business_config')
        .select('instance_name')
        .eq('owner_id', ownerId)
        .maybeSingle();

    if (!bConfig?.instance_name) {
        throw new Error(`[FATAL] Instance Resolution Failed: No instance_name mapped for owner_id: ${ownerId}`);
    }
    return bConfig.instance_name;
}

/**
 * RESILIENCE: Exponential Backoff for AI Calls
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    const delays = [2000, 4000, 8000];
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            // Catch transient 503, 500, or rate limit errors
            const errMsg = err.message || String(err);
            const isTransient =
                errMsg.includes('503') ||
                errMsg.includes('504') ||
                errMsg.includes('500') ||
                errMsg.includes('429') ||
                errMsg.includes('Service Unavailable') ||
                errMsg.includes('Deadline Exceeded');

            if (i < maxRetries && isTransient) {
                console.warn(`⚠️ [AI:RETRY] Attempt ${i + 1} failed (Transient Error). Retrying in ${delays[i]}ms...`);
                await new Promise(res => setTimeout(res, delays[i]));
            } else {
                break;
            }
        }
    }
    throw lastError;
}

const MODEL_TIERS = [
    'gemini-3.1-flash-lite-preview', 
    'gemini-3-flash-preview',
    'gemini-2.5-flash'
];

async function generateWithFallback(params: { contents: any[] }, config?: any) {
    let lastError: any;
    for (const modelName of MODEL_TIERS) {
        try {
            console.log(`[LLM_INIT] Triggering Google GenAI with model: ${modelName}`);
            return await ai.models.generateContent({
                ...params,
                model: modelName,
                config: config
            });
        } catch (err: any) {
            lastError = err;
            const errMsg = err.message || String(err);
            const isFallbackable = 
                errMsg.includes('503') || 
                errMsg.includes('500') || 
                errMsg.includes('404') || 
                errMsg.includes('not found') ||
                errMsg.includes('Service Unavailable');

            if (isFallbackable && modelName !== MODEL_TIERS[MODEL_TIERS.length - 1]) {
                console.warn(`⚠️ [FALLBACK] Model ${modelName} failed. Shifting to next tier...`);
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

// ==============================================================
// 🔧 CONFIG & SCHEMAS
// ==============================================================
const onboardingSchema: any = {
    description: "Extract business metadata for onboarding",
    type: "OBJECT",
    properties: {
        businessName: { type: "STRING", nullable: true },
        primaryService: { type: "STRING", nullable: true },
        price: { type: "NUMBER", nullable: true },
        durationMinutes: { type: "NUMBER", nullable: true },
        summary: { type: "STRING", description: "A brief summary of what the user said in the audio/text" },
    },
    required: ["summary"],
};

// ==============================================================
// 🛠️ UTILS: MEDIA RETRIEVAL
// ==============================================================

async function getAudioBase64(messageId: string, instanceName: string) {
    const evoUrl = getBaseUrl();
    const evoKey = process.env.EVOLUTION_API_KEY || '';

    console.log(`📡 [MEDIA] Fetching audio for message: ${messageId} (Instance: ${instanceName})`);

    try {
        const response = await fetch(`${evoUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
            body: JSON.stringify({ message: { key: { id: messageId } } })
        });

        if (!response.ok) throw new Error(`Evolution API error: ${response.status}`);

        const data = await response.json();
        return data.base64; // Evolution returns the base64 string
    } catch (err: any) {
        console.error(`❌ [MEDIA ERROR]`, err.message);
        return null;
    }
}

// ==============================================================
// 🧠 STATE-DRIVEN BRAIN HANDLERS
// ==============================================================

/* 
async function handleHeadlessAgentState(profile: any, ownerId: string, messageData: any, bConfig: any, targetInstance: string) {
    console.log(`⚙️ [HEADLESS] Processing command from Admin...`);

    const systemPrompt = `
        You are the internal Headless AI Assistant for the business owner of ${bConfig?.business_name || 'the business'}.
        The user speaking to you is the BOSS.
        Your job is to execute internal system commands, parse metrics, or manage the calendar.
        Do NOT act like a receptionist. Do NOT greet the user. Be direct, technical, and precise.
    `;

    // Trigger Gemini with the specific Headless Prompt
    const result = await withRetry(async () => {
        return await generateWithFallback(
            { contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nBoss Command: "${messageData.text || '[AUDIO]'}"` }] }] },
            { thinking_config: { thinking_level: "high" } }
        );
    });

    const responseText = result.text || "Command acknowledged.";
    await sendWhatsAppMessage(profile.phone, responseText, 1200, targetInstance);
}
*/

async function handleOnboardingState(profile: any, ownerId: string, messageData: { text?: string, audioBase64?: string, messageId?: string }, bConfig?: any) {
    console.log(`🎯 [BRAIN:ONBOARDING] Processing for ${profile.phone}`);

    const systemPrompt = `
        You are a sales rep for Sua SecretarIA. 
        Extract business metadata for this new partner based on their input (audio or text).
        
        Extract:
        - Business Name
        - Primary Service
        - Price (Number)
        - Duration in Minutes (Number)
        - Summary: A 1-sentence transcription/summary of what they said.

        🛡️ STRICT DIRECTIVE: You MUST extract and return all values EXACTLY as spoken in Portuguese. 
        DO NOT translate terms like 'corte de cabelo' to English.

        🛡️ GUARDRAIL: If the user is only greeting you (e.g., 'Oi', 'Bom dia') and has NOT provided business details, return the extraction fields (businessName, primaryService, price, durationMinutes) as null. 
        DO NOT invent or assume default values like 100 or 60.
    `;

    const parts: any[] = [{ text: systemPrompt }];

    if (messageData.audioBase64) {
        parts.push({
            inlineData: {
                data: messageData.audioBase64,
                mimeType: "audio/ogg" // Evolution usually sends ogg
            }
        });
    }

    if (messageData.text && messageData.text !== "[AUDIO]") {
        parts.push({ text: `User message: "${messageData.text}"` });
    } else if (messageData.audioBase64) {
        parts.push({ text: "Please process the attached audio message." });
    }

    try {
        const targetInstance = await resolveInstance(ownerId);

        const context = bConfig?.context_json || {};
        const isAwaitingConfirmation = context.pending_confirmation === true;

        if (isAwaitingConfirmation) {
            const userText = (messageData.text || "").toUpperCase().trim();
            console.log(`🧐 [BRAIN:ONBOARDING] Confirmation response from ${profile.phone}: ${userText}`);

            if (userText.includes('SIM') || userText.includes('CORRETO') || userText.includes('OK')) {
                // COMMIT DATA
                const pending = context.pending_metadata;
                console.log(`✅ [BRAIN:ONBOARDING] Data confirmed for ${profile.phone}. Committing...`);

                const { error: commitError } = await supabaseAdmin.from('business_config').upsert({
                    owner_id: ownerId,
                    business_name: pending.businessName,
                    primary_service: pending.primaryService,
                    price: pending.price,
                    duration_minutes: pending.durationMinutes,
                    instance_name: targetInstance,
                    context_json: { ...context, pending_confirmation: false, pending_metadata: null },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'owner_id' });

                if (commitError) throw commitError;

                // Transition to SIMULATION
                await supabaseAdmin.from('profiles').update({
                    conversation_state: 'SIMULATION',
                    updated_at: new Date().toISOString()
                }).eq('id', profile.id);

                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sua-secretaria.netlify.app';
                const connectUrl = `${baseUrl}/api/auth/connect?id=${profile.id}`;
                const successMsg = `Excelente! 🎉 Seus dados foram salvos com sucesso.\n\n*PASSO FINAL:* Conecte sua agenda Google para que eu possa organizar seus horários automaticamente:\n\n🔗 ${connectUrl}`;
                await sendWhatsAppMessage(profile.phone, successMsg, 1200, targetInstance);
                return;
            } else {
                // REJECTED or UNKNOWN
                console.log(`❌ [BRAIN:ONBOARDING] Confirmation rejected by ${profile.phone}. Clearing and restarting...`);
                await supabaseAdmin.from('business_config').update({
                    context_json: { ...context, pending_confirmation: false, pending_metadata: null }
                }).eq('owner_id', ownerId);

                const retryMsg = "Sem problemas! Vamos recomeçar. Por favor, me envie novamente o Nome da empresa, o Serviço que você oferece e o Valor.";
                await sendWhatsAppMessage(profile.phone, retryMsg, 1200, targetInstance);
                return;
            }
        }

        // 2. EXTRACTION LOGIC (Standard Onboarding with Resilience)
        const result = await withRetry(async () => {
            return await generateWithFallback(
                { contents: [{ role: 'user', parts }] },
                {
                    responseMimeType: "application/json",
                    responseSchema: onboardingSchema,
                    thinking_config: { thinking_level: "medium" }
                }
            );
        });

        const responseText = result.text || "";
        const extracted = JSON.parse(responseText);

        console.log(`✅ [BRAIN:ONBOARDING] Data Extracted:`, extracted);

        // 🛡️ GREETING DETECTION
        if (!extracted.businessName || !extracted.primaryService || !extracted.price) {
            console.log(`👋 [BRAIN:ONBOARDING] Greeting or incomplete data detected for ${profile.phone}.`);
            const welcomeMsg = `Olá! 👋 Sou a Eliza. Notei que você ainda não configurou seu perfil.\n\nPara começarmos, por favor me conte:\n\n1. O *Nome* da sua empresa\n2. Qual *Serviço* você oferece\n3. O *Preço* e a *Duração* média`;
            await sendWhatsAppMessage(profile.phone, welcomeMsg, 1200, targetInstance);
            return;
        }

        // 3. SET VIRTUAL CONFIRMATION STATE
        console.log(`⏳ [BRAIN:ONBOARDING] Data extracted for ${profile.phone}. Awaiting confirmation...`);

        await supabaseAdmin.from('business_config').upsert({
            owner_id: ownerId,
            context_json: { ...context, pending_confirmation: true, pending_metadata: extracted },
            updated_at: new Date().toISOString()
        }, { onConflict: 'owner_id' });

        const confirmationMsg = `Entendi! Só para confirmar, os dados da sua empresa são:\n\n🏢 *Nome:* ${extracted.businessName}\n🛠️ *Serviço:* ${extracted.primaryService}\n💰 *Preço:* R$ ${extracted.price}\n⏱️ *Duração:* ${extracted.durationMinutes} min\n\n*Está tudo correto?* (Responda SIM ou NÃO)`;
        await sendWhatsAppMessage(profile.phone, confirmationMsg, 1200, targetInstance);

        // Update Placeholder in Messages
        if (messageData.messageId) {
            await supabaseAdmin
                .from('messages')
                .update({ content: `[DATA EXTRACTED]: ${extracted.summary}` })
                .eq('message_id', messageData.messageId);
        }

    } catch (err: any) {
        console.error("💥 [ONBOARDING FATAL ERROR] Trace:", err);
        // Resolve instance for error message as well
        const errInstance = await resolveInstance(ownerId);

        // Fallback message for user after retries failed
        const fallbackMsg = "Sistema com alto volume de mensagens agora. Eliza está respirando um pouco, mas já te respondo! (Pode tentar mandar de novo em 1 minuto)";
        await sendWhatsAppMessage(profile.phone, fallbackMsg, 1200, errInstance);
    }
}

async function handleSimulationState(profile: any, ownerId: string, messageData: { text?: string, audioBase64?: string, messageId?: string }, bConfig?: any) {
    try {
        console.log(`🎯 [BRAIN:SIMULATION] Processing for ${profile.phone}`);
        const targetInstance = await resolveInstance(ownerId);

        // 1. INTENT CLASSIFICATION: Decide if we transition to checkout or continue simulation
        const intentPrompt = `
            Analise a mensagem do usuário. 
            Se ele expressar que gostou do teste, quiser comprar, assinar, ou avançar (ex: 'gostei', 'como pago', 'quero continuar'), retorne APENAS a palavra 'PROCEED'. 
            Se ele estiver apenas conversando ou testando o bot (ex: 'qual o valor do corte?', 'tem horário?'), retorne APENAS 'SIMULATE'.
        `;

        const userContent = messageData.text || "[AUDIO]";
        const intentResult = await withRetry(async () => {
            return await generateWithFallback(
                { contents: [{ role: 'user', parts: [{ text: `${intentPrompt}\n\nMensagem do usuário: "${userContent}"` }] }] },
                { thinking_config: { thinking_level: "low" } }
            );
        });

        const intent = (intentResult.text || "").toUpperCase().trim();
        console.log(`📡 [STATE:SIMULATION] Intent detected for ${profile.phone}: ${intent}`);

        if (intent.includes('PROCEED')) {
            console.log(`🚀 [STATE:SIMULATION] Transitioning ${profile.phone} to PAYWALL`);
            // Escalate to Payment (PAYWALL state as per lib/supabase/types.ts)
            await supabaseAdmin.from('profiles').update({
                conversation_state: 'PAYWALL',
                updated_at: new Date().toISOString()
            }).eq('id', profile.id);

            const pixPayload = `00020126580014br.gov.bcb.pix0136[MOCK-PIX-KEY-123456789]5204000053039865802BR5916SUA SECRETARIA6009SAO PAULO62070503***63041A2B`;
            const checkoutMsg = `Excelente! Para ativar sua secretária inteligente, realize o pagamento via PIX Copia e Cola abaixo:\n\n\`${pixPayload}\`\n\n*(Ambiente de Testes: Aguardando confirmação do Webhook...)*`;

            await sendWhatsAppMessage(profile.phone, checkoutMsg, 1200, targetInstance);
            return;
        }

        // 2. SECRETARY SIMULATION: Execute the "Simulation" of the bot acting on behalf of the user
        console.log(`🤖 [STATE:SIMULATION] Continuing simulation for ${profile.phone}`);

        const simPrompt = `
            Você é uma secretária virtual para a empresa ${bConfig?.business_name || 'sua empresa'}.
            Seu objetivo é ser gentil, profissional e responder baseado nestas informações:
            - Serviço principal: ${bConfig?.primary_service || 'serviços gerais'}
            - Preço: R$ ${bConfig?.price || 'sob consulta'}
            - Duração: ${bConfig?.duration_minutes || '30'} min
            
            🛡️ GUARDRAIL: Mantenha a resposta curta. Seu objetivo é ajudar o cliente fictício a testar o bot.
        `;

        const simResult = await withRetry(async () => {
            return await generateWithFallback(
                { contents: [{ role: 'user', parts: [{ text: `${simPrompt}\n\nCliente: "${userContent}"` }] }] },
                { thinking_config: { thinking_level: "medium" } }
            );
        });

        const responseText = simResult.text || "Entendido! Como posso te ajudar hoje?";
        await sendWhatsAppMessage(profile.phone, responseText, 1200, targetInstance);
    } catch (err: any) {
        console.error("💥 [SIMULATION FATAL ERROR] Trace:", err);
        const errInstance = await resolveInstance(ownerId);
        await sendWhatsAppMessage(profile.phone, "Tive um probleminha técnico no seu teste. Pode tentar de novo em instantes?", 1200, errInstance);
    }
}

async function handleLeadActiveState(profile: any, ownerId: string, messageData: { text?: string, audioBase64?: string, messageId?: string }, bConfig?: any) {
    try {
        console.log(`👤 [BRAIN:LEAD_ACTIVE] Customer ${profile.phone} talking to business ${ownerId}`);
        const targetInstance = await resolveInstance(ownerId);

        // 2. RECEPTIONIST FLOW
        const userContent = messageData.text || "[AUDIO]";

        const systemPrompt = `
            Você é a secretária virtual oficial da empresa ${bConfig?.business_name || 'nossa empresa'}.
            Seu objetivo é atender o cliente de forma profissional, gentil e eficiente.
            
            Informações da Empresa:
            - Serviço: ${bConfig?.primary_service || 'Consultar atendente'}
            - Preço: R$ ${bConfig?.price || 'Sob consulta'}
            - Duração: ${bConfig?.duration_minutes || '30'} min
            
            🛡️ DIRETRIZES:
            - Responda de forma curta e objetiva.
            - Seja prestativa e foque em resolver a dúvida do cliente.
            - Nunca mencione que você é um teste ou que estamos em simulação. Você é a secretária real.
        `;

        const result = await withRetry(async () => {
            return await generateWithFallback(
                { contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nCliente: "${userContent}"` }] }] },
                { thinking_config: { thinking_level: "medium" } }
            );
        });

        const responseText = result.text || "Entendido! Como posso te ajudar?";
        console.log(`[SENDER_PAYLOAD] Dispatching message via Evolution API to instance: ${targetInstance}`);
        await sendWhatsAppMessage(profile.phone, responseText, 1200, targetInstance);

    } catch (err: any) {
        console.error("💥 [LEAD_ACTIVE FATAL ERROR] Trace:", err);
        const errInstance = await resolveInstance(ownerId);
        console.log(`[SENDER_PAYLOAD] Dispatching error message to instance: ${errInstance}`);
        await sendWhatsAppMessage(profile.phone, "Desculpe, tive um erro momentâneo. Pode repetir sua mensagem?", 1200, errInstance);
    }
}

async function handlePaywallState(profile: any, ownerId: string, messageData: { text?: string, audioBase64?: string, messageId?: string }, bConfig?: any) {
    console.log(`⏳ [STATE:PAYWALL] User ${profile.phone} sent message while waiting for payment.`);
    const targetInstance = await resolveInstance(ownerId);

    const waitingPayload = "Ainda estou aguardando a confirmação do seu pagamento pelo banco. ⏳\nAssim que compensar, te enviarei o código de acesso automático!\n\nCaso precise da chave PIX novamente:\n`00020126580014br.gov.bcb.pix0136[MOCK-PIX-KEY-123456789]5204000053039865802BR5916SUA SECRETARIA6009SAO PAULO62070503***63041A2B`";

    await sendWhatsAppMessage(profile.phone, waitingPayload, 1200, targetInstance);
}

// ==============================================================
// 🧠 MAIN PROCESSING LOGIC
// ==============================================================

async function processProfile(profile: any) {
    console.log(`\n🧠 [ELIZA] Processing Profile: ${profile.phone} | State: ${profile.conversation_state}`);

    try {
        const { data: messages } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('lead_phone', profile.phone)
            .order('created_at', { ascending: false })
            .limit(1);

        if (!messages || messages.length === 0) {
            await supabaseAdmin.from('profiles').update({ worker_status: 'waiting_reply' }).eq('id', profile.id);
            return;
        }

        const lastMessage = messages[0];

        if (lastMessage.role === 'assistant') {
            await supabaseAdmin.from('profiles').update({ worker_status: 'waiting_reply' }).eq('id', profile.id);
            return;
        }

        let messageData: any = {
            text: lastMessage.content,
            messageId: lastMessage.message_id
        };

        // Resolve Owner ID for business context lookups
        const ownerId = await resolveOwnerId(profile, lastMessage);

        // Resolve Instance Name: Prioritize the instance where the message actually arrived
        const targetInstance = lastMessage.instance_name || await resolveInstance(ownerId);

        console.log(`🔗 [ELIZA] Resolved Context -> Owner: ${ownerId} | Instance: ${targetInstance}`);

        // Fetch Business Context once
        const { data: bConfig } = await supabaseAdmin
            .from('business_config')
            .select('*')
            .eq('owner_id', ownerId)
            .maybeSingle();

        // 🛡️ HEADLESS AGENT FORK [DISABLED FOR TACTICAL SIMPLIFICATION]
        /*
        const isAdmin = bConfig?.admin_phone && profile.phone === bConfig.admin_phone;

        if (isAdmin) {
            console.log(`👑 [BRAIN:HEADLESS_AGENT] Commander recognized: ${profile.phone}`);
            await handleHeadlessAgentState(profile, ownerId, messageData, bConfig, targetInstance);
            
            // Update worker status and EXIT. Do NOT process normal customer states.
            await supabaseAdmin.from('profiles').update({ 
                worker_status: 'waiting_reply',
                updated_at: new Date().toISOString()
            }).eq('id', profile.id);
            return; 
        }
        */

        // Handle Audio Multimodal
        if (lastMessage.content === "[AUDIO]") {
            const base64 = await getAudioBase64(lastMessage.message_id, targetInstance);
            if (base64) {
                messageData.audioBase64 = base64;
            } else {
                console.warn(`⚠️ [ELIZA] Audio base64 not found for ${lastMessage.message_id}`);
            }
        }

        switch (profile.conversation_state) {
            case 'ONBOARDING':
                await handleOnboardingState(profile, ownerId, messageData, bConfig);
                break;
            case 'LEAD_ACTIVE':
                await handleLeadActiveState(profile, ownerId, messageData, bConfig);
                break;
            case 'ACTIVE':
            case 'SIMULATION':
                await handleSimulationState(profile, ownerId, messageData, bConfig);
                break;
            case 'PAYWALL':
                await handlePaywallState(profile, ownerId, messageData, bConfig);
                break;
            case 'UNKNOWN':
            case 'IDLE':
            case null:
            default:
                console.log(`⏩ [STATE:${profile.conversation_state}] Fallback to LEAD_ACTIVE (Legacy Logic)`);
                await handleLeadActiveState(profile, ownerId, messageData, bConfig);
                break;
        }

        await supabaseAdmin.from('profiles').update({
            worker_status: 'waiting_reply',
            updated_at: new Date().toISOString()
        }).eq('id', profile.id);

    } catch (error: any) {
        console.error(`💥 [ELIZA FATAL]`, error.message);
        await supabaseAdmin.from('profiles').update({ worker_status: 'error' }).eq('id', profile.id);
    }
}

// ==============================================================
// 🔄 POLLING ENGINE
// ==============================================================
let isPolling = false;

function startPolling() {
    console.log('🚀 [BOOT] Eliza Multimodal Engine Polling...');

    setInterval(async () => {
        if (isPolling) return;
        isPolling = true;

        try {
            const { data: profiles, error } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('worker_status', 'eliza_processing')
                .limit(2);

            if (error) console.error(`❌ [POLL ERROR]`, error.message);
            else if (profiles) {
                for (const p of profiles) await processProfile(p);
            }
        } catch (e: any) {
            console.error(`❌ [POLL CRASH]`, e.message);
        } finally {
            isPolling = false;
        }
    }, 5000);
}

// ==============================================================
// 🌐 HEALTHCHECK SERVER (Optional)
// ==============================================================
const WORKER_PORT = process.env.WORKER_PORT;

if (WORKER_PORT) {
    console.log(`[BOOT TRACE] 3. Initializing Standalone Healthcheck Server on port ${WORKER_PORT}`);
    http.createServer((req, res) => {
        res.writeHead(200);
        res.end('Eliza Worker Live');
    }).listen(WORKER_PORT, () => {
        console.log(`🌐 Healthcheck Server running on port ${WORKER_PORT}`);
        console.log('[BOOT TRACE] 4. Calling startPolling()');
        startPolling();
    });
} else {
    // In concurrent mode (Railway), Next.js handles the $PORT signal
    console.log('[BOOT TRACE] 3. Running alongside Next.js (Skipping separate port bind)');
    console.log('[BOOT TRACE] 4. Calling startPolling()');
    startPolling();
}