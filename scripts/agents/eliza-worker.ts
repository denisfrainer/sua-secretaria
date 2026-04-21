import http from 'http';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
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

// ==============================================================
// 🔧 CONFIG & SCHEMAS
// ==============================================================
const onboardingSchema: any = {
    description: "Extract business metadata for onboarding",
    type: "OBJECT",
    properties: {
        businessName: { type: "STRING" },
        primaryService: { type: "STRING" },
        price: { type: "NUMBER" },
        durationMinutes: { type: "NUMBER" },
        summary: { type: "STRING", description: "A brief summary of what the user said in the audio/text" },
    },
    required: ["businessName", "primaryService", "price", "durationMinutes", "summary"],
};

// ==============================================================
// 🛠️ UTILS: MEDIA RETRIEVAL
// ==============================================================

async function getAudioBase64(messageId: string, instanceName: string) {
    const evoUrl = process.env.EVOLUTION_API_URL || 'https://api.revivafotos.com.br';
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

async function handleOnboardingState(profile: any, messageData: { text?: string, audioBase64?: string, messageId?: string }) {
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

        If incomplete, use professional defaults for a beauty parlor (e.g., "Sua Clínica", "Serviço", 100, 60).
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
        const result = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [{ role: 'user', parts }],
            config: {
                responseMimeType: "application/json",
                responseSchema: onboardingSchema
            }
        });

        const responseText = result.text || "";
        const extracted = JSON.parse(responseText);

        console.log(`✅ [BRAIN:ONBOARDING] Data Extracted:`, extracted);

        // 1. Update Business Config
        const { error: configError } = await supabaseAdmin.from('business_config').upsert({
            owner_id: profile.id,
            business_name: extracted.businessName,
            primary_service: extracted.primaryService,
            price: extracted.price,
            duration_minutes: extracted.durationMinutes,
            instance_name: profile.instance_name || `instance-${profile.phone}`,
            updated_at: new Date().toISOString()
        }, { onConflict: 'owner_id' });

        if (configError) throw configError;

        // 2. Update Placeholder in Messages (Context Persistence)
        if (messageData.messageId) {
            await supabaseAdmin
                .from('messages')
                .update({ content: `[AUDIO TRANSCRIPT]: ${extracted.summary}` })
                .eq('message_id', messageData.messageId);
        }

        // 3. Transition State to SIMULATION
        await supabaseAdmin.from('profiles').update({
            conversation_state: 'SIMULATION',
            updated_at: new Date().toISOString()
        }).eq('id', profile.id);

        // 4. Send Response
        const syncUrl = await generateGoogleAuthUrl(profile.id);
        const msg = `✅ Perfeito! Perfil criado para *${extracted.businessName}*.\n\nEspecialidade: ${extracted.primaryService}\nPreço: R$ ${extracted.price}\n\n*PASSO 3 (O TESTE):* Chame o número 48998097754 para testar o bot atuando como sua secretária AGORA. Quando terminar, sincronize sua agenda aqui: ${syncUrl}`;

        await sendWhatsAppMessage(profile.phone, msg);

    } catch (err: any) {
        console.error(`❌ [BRAIN:ONBOARDING ERROR]`, err.message);
        await sendWhatsAppMessage(profile.phone, "Não consegui processar seu áudio/mensagem. Pode tentar novamente?");
    }
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

        // Handle Audio Multimodal
        if (lastMessage.content === "[AUDIO]") {
            const instanceName = profile.instance_name || process.env.NEXT_PUBLIC_INSTANCE_NAME || 'secretaria';
            const base64 = await getAudioBase64(lastMessage.message_id, instanceName);
            if (base64) {
                messageData.audioBase64 = base64;
            } else {
                console.warn(`⚠️ [ELIZA] Audio base64 not found for ${lastMessage.message_id}`);
            }
        }

        switch (profile.conversation_state) {
            case 'ONBOARDING':
                await handleOnboardingState(profile, messageData);
                break;
            default:
                // For SIMULATION/PAYWALL/ACTIVE, we'd implement similar multimodal logic
                console.log(`⏩ [STATE:${profile.conversation_state}] Logic not multimodal yet. Just answering...`);
                await sendWhatsAppMessage(profile.phone, "Entendido! Estou processando seu teste. Siga as instruções acima.");
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