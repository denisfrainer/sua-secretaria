import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, getBaseUrl } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';

/**
 * ELIZA MONOLITH - UNIFIED WEBHOOK & POLLING
 * Handles: Evolution API Webhooks & Background Db Polling
 */

const app = express();
app.use(express.json());

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
// 🛠️ WEBHOOK ROUTE (Ported from Next.js)
// ==========================================

app.post('/webhook/evolution', async (req, res) => {
    console.log('\n--- 🛡️ INBOUND RAW PAYLOAD START ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('--- 🛡️ INBOUND RAW PAYLOAD END ---\n');
    try {
        const body = req.body;
        const searchParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        
        // 1. Core Identification
        const event = body.event || body.type;
        const instanceName = body.instance || body.instanceName || searchParams.get('instance');
        const tenantId = searchParams.get('tenantId');

        // 2. Normalize Data Object
        const dataObj = (Array.isArray(body.data) ? body.data[0] : body.data) || body;

        // 3. Connection Lifecycle
        if (event === "connection.update" || event === "CONNECTION_UPDATE") {
            const state = dataObj.state || body.state || dataObj.status || body.status;
            if (state === "open" && instanceName) {
                console.log(`🔌 [WEBHOOK] Connection OPEN for instance: ${instanceName}`);
                await supabaseAdmin
                    .from('business_config')
                    .update({ status: 'CONNECTED', updated_at: new Date().toISOString() })
                    .eq('instance_name', instanceName);
            }
            return res.status(200).json({ success: true });
        }

        // 4. Message Processing
        if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
            const msgItem = dataObj?.messages?.[0] || dataObj;

            if (!msgItem?.key) {
                return res.status(200).json({ status: 'ignored', reason: 'no_key' });
            }

            let remoteJid = msgItem.key.remoteJid || "";
            if (msgItem.key.remoteJidAlt && String(msgItem.key.remoteJidAlt).includes('@s.whatsapp.net')) {
                remoteJid = String(msgItem.key.remoteJidAlt);
            }

            if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) {
                return res.status(200).json({ status: 'ignored' });
            }

            const rawNumber = remoteJid.split('@')[0];
            const phone = normalizePhone(rawNumber);
            const isFromMe = msgItem.key.fromMe === true;

            const messageObj = msgItem.message || {};
            const text = messageObj.conversation || messageObj.extendedTextMessage?.text || "";
            const isAudio = !!messageObj.audioMessage;
            const isImage = !!messageObj.imageMessage;

            if (!text && !isAudio && !isImage) {
                return res.status(200).json({ success: true, message: 'No processable content' });
            }

            console.log(`📡 [WEBHOOK] Inbound: ${phone} | fromMe: ${isFromMe} | Instance: ${instanceName}`);

            // 5. PERSIST MESSAGE
            let content = text;
            if (isAudio) content = "[AUDIO]";
            else if (isImage) content = "[IMAGE]";

            const messageId = msgItem.key.id || `gen_${Math.random().toString(36).substring(7)}`;

            await supabaseAdmin.from('messages').upsert({
                lead_phone: phone,
                role: isFromMe ? 'assistant' : 'user',
                content: content,
                message_id: messageId,
                instance_name: instanceName,
                created_at: new Date().toISOString()
            }, { onConflict: 'message_id' });

            // 6. ANTI-LOOP & WORKER SIGNAL
            if (isFromMe) {
                return res.status(200).json({ success: true, message: 'Outbound logged' });
            }

            // Rollback logic: Populate leads_lobo
            let activeOwnerId = tenantId;
            if (!activeOwnerId && instanceName) {
                const { data: bConfig } = await supabaseAdmin
                    .from('business_config')
                    .select('owner_id')
                    .eq('instance_name', instanceName)
                    .maybeSingle();
                activeOwnerId = bConfig?.owner_id;
            }

            const { error: upsertError } = await supabaseAdmin
                .from('leads_lobo')
                .upsert({
                    phone: phone,
                    status: 'eliza_processing',
                    instance_name: instanceName,
                    owner_id: activeOwnerId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'phone' });

            if (upsertError) {
                console.error(`❌ [WEBHOOK:UPSERT_ERROR]`, upsertError.message);
            } else {
                console.log(`✅ [WEBHOOK:SUCCESS] Lead ${phone} queued for Eliza Worker in leads_lobo`);
            }

            return res.status(200).json({ success: true });
        }

        return res.status(200).json({ success: true, message: 'Event ignored' });

    } catch (error: any) {
        console.error('❌ [WEBHOOK ERROR]:', error.stack || error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Healthcheck
app.get('/health', (req, res) => res.status(200).send('Eliza Monolith Live'));

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

// ==============================================================
// 🚀 SERVER BOOT
// ==============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🌐 Server (Webhook & Health) running on port ${PORT}`);
    console.log('🚀 [BOOT] Server started. Igniting polling engine...');
    startPolling();
});