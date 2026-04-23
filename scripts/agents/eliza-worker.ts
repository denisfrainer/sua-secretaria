import * as http from 'http';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, getBaseUrl } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';

/**
 * ELIZA WORKER - TACTICAL ROLLBACK VERSION
 * Legacy Polling: leads_lobo
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

// ==========================================
// 🛠️ UTILS: MEDIA RETRIEVAL
// ==========================================
interface Message {
    role: string;
    content: string;
    created_at: string;
}

async function getAudioBase64(messageId: string, instanceName: string) {
    const evoUrl = getBaseUrl();
    const evoKey = process.env.EVOLUTION_API_KEY || '';
    try {
        const response = await fetch(`${evoUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
            body: JSON.stringify({ message: { key: { id: messageId } } })
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.base64;
    } catch (err) {
        return null;
    }
}

// ==============================================================
// 🧠 MAIN PROCESSING LOGIC
// ==============================================================

async function processLead(lead: any) {
    const phone = lead.phone;
    const instanceName = lead.instance_name;
    const ownerId = lead.owner_id;

    console.log(`\n🧠 [ELIZA] Processing Lead: ${phone} (Instance: ${instanceName})`);

    try {
        // 1. Lock lead
        console.log(`🔒 [ELIZA] Locking lead ${lead.id}...`);
        const { error: lockError } = await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);
        if (lockError) throw new Error(`Lock failed: ${lockError.message}`);

        // 2. Fetch Business Config
        console.log(`📡 [ELIZA] Fetching config for ${instanceName}...`);
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

        // 3. Fetch History
        console.log(`📜 [ELIZA] Fetching history for ${phone}...`);
        const { data: rawHistory, error: historyError } = await supabaseAdmin
            .from('messages')
            .select('role, content, created_at')
            .eq('lead_phone', phone)
            .order('created_at', { ascending: false })
            .limit(10);

        if (historyError) throw new Error(`History fetch error: ${historyError.message}`);

        const chatHistory = (rawHistory as unknown as Message[] || []).reverse();
        
        // If history is empty, use a fallback
        if (chatHistory.length === 0) {
            console.warn(`⚠️ [ELIZA] No history found for ${phone}, starting fresh.`);
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
        console.log(`🤖 [ELIZA] Generating AI response for: "${currentMessage.substring(0, 50)}..."`);
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
let isPolling = false;

function startPolling() {
    console.log('🚀 [BOOT] Eliza Legacy Engine Polling (leads_lobo)...');

    setInterval(async () => {
        if (isPolling) return;
        isPolling = true;

        try {
            const { data: leads, error } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('status', 'eliza_processing')
                .limit(2);

            if (error) console.error(`❌ [POLL ERROR]`, error.message);
            else if (leads && leads.length > 0) {
                for (const l of leads) await processLead(l);
            }
        } catch (e: any) {
            console.error(`❌ [POLL CRASH]`, e.message);
        } finally {
            isPolling = false;
        }
    }, 5000);
}

const WORKER_PORT = process.env.WORKER_PORT;
if (WORKER_PORT) {
    http.createServer((req, res) => {
        res.writeHead(200);
        res.end('Eliza Worker Live');
    }).listen(WORKER_PORT, () => {
        startPolling();
    });
} else {
    startPolling();
}