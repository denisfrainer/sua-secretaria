import http from 'http';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage } from '../../lib/whatsapp/sender';
import { processMenuState } from '../handlers/menu-handler';

/**
 * ELIZA WORKER - PURE POLLING ENGINE
 * Webhook ingestion is now handled by the Next.js API route
 * at app/api/webhook/evolution/route.ts
 * This worker ONLY polls leads_lobo and processes AI responses.
 */

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

const MODEL_TIERS = [
    'gemini-3.1-flash-lite-preview', 
    'gemini-3-flash-preview',
    'gemini-2.5-flash'
];

process.env.TZ = 'America/Sao_Paulo';

// ==============================================================
// 🧠 MAIN PROCESSING LOGIC
// ==============================================================

interface Message {
    role: string;
    content: string;
    created_at: string;
}

async function processLead(lead: any) {
    const phone = lead.phone;
    const instanceName = lead.instance_name;

    console.log(`\n🧠 [ELIZA] Processing Lead: ${phone} (Instance: ${instanceName})`);

    try {
        // 1. Lock lead
        const { error: lockError } = await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);
        if (lockError) throw new Error(`Lock failed: ${lockError.message}`);

        // 2. Fetch Business Config
        const { data: bConfig, error: configError } = await supabaseAdmin
            .from('business_config')
            .select('*')
            .eq('instance_name', instanceName)
            .maybeSingle();

        if (configError) throw new Error(`Config fetch error: ${configError.message}`);
        if (!bConfig) {
            console.error(`❌ [ELIZA] No business_config found for ${instanceName}`);
            await supabaseAdmin.from('leads_lobo').update({ status: 'error' }).eq('id', lead.id);
            return;
        }

        // ============================================================
        // 🚪 GATEKEEPER: Menu FSM (runs BEFORE AI to save LLM costs)
        // ============================================================
        const menuStep = lead.menu_step ?? 0;

        // Resolve the business slug for booking link generation
        let businessSlug = '';
        if (bConfig.owner_id) {
            const { data: profileData } = await supabaseAdmin
                .from('profiles')
                .select('slug')
                .eq('id', bConfig.owner_id)
                .maybeSingle();
            businessSlug = profileData?.slug || '';
        }

        // Get the latest user message for menu evaluation
        const { data: latestMsg } = await supabaseAdmin
            .from('messages')
            .select('content')
            .eq('lead_phone', phone)
            .eq('role', 'user')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const incomingText = latestMsg?.content || '';

        const menuResult = processMenuState(menuStep, incomingText, businessSlug);

        console.log(`🚪 [GATEKEEPER] Step: ${menuStep} → useAI: ${menuResult.useAI} | nextStep: ${menuResult.nextStep}`);

        if (!menuResult.useAI) {
            // ---- DETERMINISTIC PATH: Send menu reply & return early ----
            if (menuResult.reply) {
                await sendWhatsAppMessage(phone, menuResult.reply, 1000, instanceName);
                console.log(`📤 [MENU] Sent to ${phone}: "${menuResult.reply.substring(0, 60)}..."`);
            }

            // Persist the new menu_step and mark as replied
            await supabaseAdmin.from('leads_lobo').update({
                menu_step: menuResult.nextStep,
                status: 'replied',
                updated_at: new Date().toISOString()
            }).eq('id', lead.id);

            console.log(`✅ [MENU] Lead ${phone} handled by FSM. No LLM invoked. 💰`);
            return; // ⛔ CRITICAL: Early return. Gemini is never called.
        }

        // ============================================================
        // 🧠 AI PATH: Menu is done (step 99). Fall through to Eliza.
        // ============================================================
        console.log(`🧠 [AI_PASSTHROUGH] Lead ${phone} is in step 99. Invoking Eliza LLM...`);

        // 3. Fetch History
        const { data: rawHistory, error: historyError } = await supabaseAdmin
            .from('messages')
            .select('role, content, created_at')
            .eq('lead_phone', phone)
            .order('created_at', { ascending: false })
            .limit(10);

        if (historyError) throw new Error(`History fetch error: ${historyError.message}`);

        const chatHistory = (rawHistory as unknown as Message[] || []).reverse();
        
        if (chatHistory.length === 0) {
            chatHistory.push({ role: 'user', content: 'Olá', created_at: new Date().toISOString() });
        }

        const lastUserMsg = [...chatHistory].reverse().find((m: Message) => m.role === 'user');
        const currentMessage = lastUserMsg?.content || "Olá";

        // 4. Construct System Prompt
        const businessName = bConfig.business_name || "Nossa Empresa";
        const businessNiche = bConfig.business_niche || "Serviços";
        const contextJson = bConfig.context_json || {};
        const customRules = bConfig.custom_rules || "";

        const systemInstruction = `
            Você é a secretária virtual da empresa ${businessName}, focada em ${businessNiche}.
            Contexto do Negócio: ${JSON.stringify(contextJson)}
            Regras Customizadas: ${customRules}

            DIRETRIZES:
            - Seja extremamente concisa e profissional.
            - Responda em Português do Brasil.
            - Use no máximo 2 frases curtas.
            - Se não souber algo, peça para o cliente aguardar um especialista.
        `;

        // 5. LLM Call
        let responseText = "";
        for (const modelName of MODEL_TIERS) {
            try {
                const result = await ai.models.generateContent({
                    model: modelName,
                    contents: chatHistory.map((m: Message) => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    })),
                    config: {
                        systemInstruction: systemInstruction,
                    }
                });
                responseText = result.text || "";
                if (responseText) break;
            } catch (err: any) {
                console.warn(`⚠️ [ELIZA] Model ${modelName} failed: ${err.message}`);
            }
        }

        if (!responseText) throw new Error("AI failed to generate response across all models");

        // 6. Send Response
        console.log(`📤 [ELIZA] Sending to ${phone}: "${responseText.substring(0, 50)}..."`);
        await sendWhatsAppMessage(phone, responseText, 1000, instanceName);

        // 7. Update Status
        await supabaseAdmin.from('leads_lobo').update({ 
            status: 'replied',
            updated_at: new Date().toISOString()
        }).eq('id', lead.id);

        console.log(`✅ [ELIZA] Lead ${phone} processed successfully.`);

    } catch (error: any) {
        console.error(`💥 [ELIZA FATAL] ${phone}:`, error.message);
        await supabaseAdmin.from('leads_lobo').update({ 
            status: 'error',
            updated_at: new Date().toISOString()
        }).eq('id', lead.id);
    }
}

// ==============================================================
// 🔄 POLLING ENGINE
// ==============================================================
// ==============================================================
// 🔄 IMMORTAL POLLING ENGINE (Heartbeat)
// ==============================================================

/**
 * Immortal recursive polling loop.
 * Uses setTimeout to prevent overlapping ticks and ensures
 * the engine stays alive even after fatal errors.
 */
async function pollLeads() {
    try {
        // 1. Fetch leads queued for processing
        const { data: leads, error } = await supabaseAdmin
            .from('leads_lobo')
            .select('*')
            .eq('status', 'eliza_processing')
            .eq('ai_paused', false)
            .limit(2); // Small batch to keep it fast

        if (error) {
            console.error(`❌ [POLL ERROR] Database query failed:`, error.message);
        } else if (leads && leads.length > 0) {
            console.log(`📡 [HEARTBEAT] Found ${leads.length} leads to process.`);
            
            // Process each lead sequentially to avoid rate limits/concurrency issues
            for (const lead of leads) {
                try {
                    await processLead(lead);
                } catch (leadErr: any) {
                    console.error(`💥 [POLL] Critical failure processing lead ${lead.phone}:`, leadErr.message);
                    
                    // Emergency status move to prevent infinite loops
                    await supabaseAdmin.from('leads_lobo').update({ 
                        status: 'error',
                        updated_at: new Date().toISOString()
                    }).eq('id', lead.id);
                }
            }
        }
    } catch (fatalError: any) {
        // Isolate the crash. Do NOT let it kill the process.
        console.error('🚨 [POLLING ENGINE FATAL ERROR]:', fatalError.stack || fatalError.message);
    } finally {
        // CRITICAL: Always schedule the next heartbeat, even if a crash occurred.
        // This makes the worker "immortal".
        setTimeout(pollLeads, 5000); 
    }
}

// ==============================================================
// 🚀 BOOT: PURE POLLING ENGINE + MINIMAL HEALTHCHECK
// ==============================================================
// Healthcheck on a background port so Railway knows the process is alive.
// Webhook ingestion is handled by the Next.js API route.
const HEALTH_PORT = process.env.ELIZA_PORT || 3001;

http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
        res.writeHead(200);
        res.end('Eliza Polling Engine Online');
        return;
    }
    res.writeHead(404);
    res.end();
}).listen(HEALTH_PORT, () => {
    console.log(`\n🌐 Healthcheck listening on port ${HEALTH_PORT}`);
    console.log('🚀 [BOOT] Igniting immortal polling engine...');
    pollLeads(); // Start the recursive loop
});