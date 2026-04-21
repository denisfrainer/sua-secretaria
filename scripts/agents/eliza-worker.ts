import { GoogleGenAI, SchemaType } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import { google } from 'googleapis';
import { hasAccess } from '../../lib/auth/access-control';
import { PlanTier } from '../../lib/supabase/types';
import { generateGoogleAuthUrl } from '../../lib/google/auth';

/**
 * ELIZA WORKER - STATE MACHINE VERSION
 * Decoupled from leads_lobo. Driven strictly by profiles.worker_status.
 * Lifecycle: ONBOARDING -> SIMULATION -> PAYWALL -> ACTIVE
 */

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

process.env.TZ = 'America/Sao_Paulo';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_SITE_URL + '/api/auth/google/callback'
);

// ==============================================================
// 🔧 ONBOARDING SCHEMA (Structured Outputs)
// ==============================================================
const onboardingSchema: any = {
    description: "Extract business metadata for onboarding",
    type: SchemaType.OBJECT,
    properties: {
        businessName: { type: SchemaType.STRING },
        primaryService: { type: SchemaType.STRING },
        price: { type: SchemaType.NUMBER },
        durationMinutes: { type: SchemaType.NUMBER },
    },
    required: ["businessName", "primaryService", "price", "durationMinutes"],
};

// ==============================================================
// 🧠 STATE-DRIVEN BRAIN HANDLERS
// ==============================================================

async function handleOnboardingState(profile: any, lastMessage: string) {
    console.log(`🎯 [BRAIN:ONBOARDING] Extracting for ${profile.phone}`);
    
    const prompt = `
        You are a sales rep for Sua SecretarIA. Extract business metadata for this new partner.
        User message: "${lastMessage}"
        
        Extract:
        - Business Name
        - Primary Service
        - Price (Number)
        - Duration in Minutes (Number)

        If incomplete, use professional defaults for a beauty parlor (e.g., "Sua Clínica", "Serviço", 100, 60).
    `;

    try {
        const model = ai.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: onboardingSchema
            }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const extracted = JSON.parse(responseText);

        console.log(`✅ [BRAIN:ONBOARDING] Data Extracted:`, extracted);

        // 1. Update Business Config (Atomic UUID Link)
        const { error: configError } = await supabaseAdmin.from('business_config').upsert({
            owner_id: profile.id,
            business_name: extracted.businessName,
            primary_service: extracted.primaryService,
            price: extracted.price,
            duration_minutes: extracted.durationMinutes,
            instance_name: `instance-${profile.phone}`,
            updated_at: new Date().toISOString()
        }, { onConflict: 'owner_id' });

        if (configError) throw configError;

        // 2. Transition State to SIMULATION
        await supabaseAdmin.from('profiles').update({
            conversation_state: 'SIMULATION',
            simulation_count: 0,
            updated_at: new Date().toISOString()
        }).eq('id', profile.id);

        // 3. Send Bridge Message
        const syncUrl = await generateGoogleAuthUrl(profile.id);
        const msg = `✅ Perfeito! Perfil criado para *${extracted.businessName}*.\n\nEspecialidade: ${extracted.primaryService}\nPreço: R$ ${extracted.price}\n\n*PASSO 3 (O TESTE):* Chame o número 48998097754 para testar o bot atuando como sua secretária AGORA. Quando terminar, sincronize sua agenda aqui: ${syncUrl}`;
        
        await sendWhatsAppMessage(profile.phone, msg);

    } catch (err: any) {
        console.error(`❌ [BRAIN:ONBOARDING ERROR]`, err.message);
        await sendWhatsAppMessage(profile.phone, "Não consegui entender o nome do seu negócio. Pode me enviar novamente?");
    }
}

async function handleSimulationState(profile: any) {
    console.log(`🧪 [BRAIN:SIMULATION] Intercepting with MOCK for ${profile.phone}`);
    const syncUrl = await generateGoogleAuthUrl(profile.id);
    const mockMsg = `Seu negócio foi configurado! Chame o número 48998097754 para testar o bot atuando como sua secretária agora mesmo. Quando terminar o teste, clique aqui para conectar sua agenda do Google: ${syncUrl}`;
    await sendWhatsAppMessage(profile.phone, mockMsg);
}

async function handlePaywallState(profile: any) {
    console.log(`💰 [BRAIN:PAYWALL] Assisting with checkout for ${profile.phone}`);
    const checkoutLink = "https://suasecretaria.com.br/precos";
    const msg = `Fico feliz que gostou do teste! Para colocar sua assistente para trabalhar no seu número oficial, basta escolher um plano aqui: ${checkoutLink}\n\nAssim que o pagamento for confirmado, eu te mando o código de ativação!`;
    await sendWhatsAppMessage(profile.phone, msg);
}

// ==============================================================
// 🧠 MAIN PROCESSING LOGIC
// ==============================================================

async function processProfile(profile: any) {
    console.log(`\n🧠 [ELIZA] Processing Profile: ${profile.phone} | State: ${profile.conversation_state}`);

    try {
        // Fetch last message from the 'messages' table
        const { data: messages } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', profile.phone)
            .order('created_at', { ascending: false })
            .limit(1);

        const lastMessage = messages?.[0]?.content || "Olá";

        // Skip if last message was from the assistant to prevent loops
        if (messages?.[0]?.role === 'assistant') {
            console.log(`🔇 [ELIZA] Skipping: Last message already from assistant.`);
            await supabaseAdmin.from('profiles').update({ worker_status: 'waiting_reply' }).eq('id', profile.id);
            return;
        }

        switch (profile.conversation_state) {
            case 'ONBOARDING':
                await handleOnboardingState(profile, lastMessage);
                break;
            case 'SIMULATION':
                await handleSimulationState(profile);
                break;
            case 'PAYWALL':
                await handlePaywallState(profile);
                break;
            case 'ACTIVE':
                // Live agent brain (not implemented for MVP onboarding)
                console.log(`🚀 [ACTIVE] Routing to live agent brain...`);
                break;
        }

        // Set to waiting_reply after successful dispatch
        const { error: statusError } = await supabaseAdmin.from('profiles').update({ 
            worker_status: 'waiting_reply',
            updated_at: new Date().toISOString()
        }).eq('id', profile.id);

        if (statusError) console.error(`❌ [ELIZA:STATUS_ERROR]`, statusError.message);
        console.log(`✅ [ELIZA] Profile ${profile.phone} processed.`);

    } catch (error: any) {
        console.error(`💥 [ELIZA FATAL] Profile ${profile.id} crashed:`, error.message);
        await supabaseAdmin.from('profiles').update({ worker_status: 'error' }).eq('id', profile.id);
    }
}

// ==============================================================
// 🔄 POLLING ENGINE
// ==============================================================
let isPolling = false;

async function startPolling() {
    console.log('🚀 [BOOT] Eliza State Machine Polling Engine Ignited...');

    setInterval(async () => {
        if (isPolling) return;
        isPolling = true;

        try {
            // Find one profile marked for processing
            const { data: profiles, error } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('worker_status', 'eliza_processing')
                .limit(1);

            if (error) {
                console.error(`❌ [POLL ERROR]`, error.message);
            } else if (profiles && profiles.length > 0) {
                await processProfile(profiles[0]);
            }
        } catch (e: any) {
            console.error(`❌ [POLL CRASH]`, e.message);
        } finally {
            isPolling = false;
        }
    }, 5000);
}

startPolling();