import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, getBaseUrl } from '../../lib/whatsapp/sender';
import { processMenuState } from '../handlers/menu-handler';
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
    // ============================================================
    // 🔬 UNIVERSAL RAW LOG — OUTSIDE try/catch, OUTSIDE if/else
    // This line MUST execute for every single POST, no exceptions.
    // ============================================================
    const rawEvent = req.body?.event || req.body?.type || req.body?.apiType || 'UNKNOWN';
    const rawInstance = req.body?.instance || req.body?.instanceName || 'UNKNOWN';
    const rawDataKeys = req.body?.data ? Object.keys(req.body.data) : [];
    console.log(`\n📡 [WEBHOOK_RAW] Event: "${rawEvent}" | Instance: "${rawInstance}" | Data Keys: [${rawDataKeys.join(', ')}]`);
    console.log(`📡 [WEBHOOK_RAW] Full Body:`, JSON.stringify(req.body, null, 2));

    try {
        const body = req.body;
        const searchParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        
        // 1. Core Identification (Exhaustive event extraction)
        const event = (body.event || body.type || body.apiType || '').toLowerCase().trim();
        const instanceName = body.instance || body.instanceName || body.data?.instance || searchParams.get('instance');
        const tenantId = searchParams.get('tenantId');

        console.log(`🏷️ [WEBHOOK] Normalized Event: "${event}" | Instance: "${instanceName}" | Tenant: "${tenantId}"`);

        // 2. Normalize Data Object (handles v1, v2, and array-wrapped payloads)
        const dataObj = (Array.isArray(body.data) ? body.data[0] : body.data) || body;

        // 3. Connection Lifecycle
        if (event === 'connection.update' || event === 'connection_update') {
            const state = dataObj.state || body.state || dataObj.status || body.status;
            console.log(`🔌 [WEBHOOK] Connection event. State: "${state}" | Instance: "${instanceName}"`);
            if (state === 'open' && instanceName) {
                console.log(`✅ [WEBHOOK] Connection OPEN for instance: ${instanceName}`);
                await supabaseAdmin
                    .from('business_config')
                    .update({ status: 'CONNECTED', updated_at: new Date().toISOString() })
                    .eq('instance_name', instanceName);
            }
            return res.status(200).json({ success: true });
        }

        // 4. Message Processing (Exhaustive event matching)
        if (event === 'messages.upsert' || event === 'messages_upsert' || event === 'message' || event === 'messages') {
            console.log(`💬 [WEBHOOK] Message event detected: "${event}"`);

            // Evolution API 'messages.upsert' payload usually puts the message directly in 'data'
            // Or sometimes wraps it in a 'messages' array depending on the exact version/event.
            const payloadData = body.data || body;
            if (!payloadData) {
                console.warn('⚠️ [WEBHOOK] No data object found. Dropping.');
                return res.status(200).json({ status: 'ignored', reason: 'no_data' });
            }

            // Normalize the message object (handles both array wrap and direct object)
            // msgItem should be the container that HAS the 'key' and 'message' properties as siblings.
            const msgItem = (payloadData.messages && Array.isArray(payloadData.messages)) 
                ? payloadData.messages[0] 
                : payloadData;

            console.log(`💬 [WEBHOOK] msgItem keys: [${Object.keys(msgItem || {}).join(', ')}]`);

            if (!msgItem || !msgItem.key) {
                console.warn(`⚠️ [WEBHOOK] No 'key' found in msgItem. Dropping.`, JSON.stringify(msgItem));
                return res.status(200).json({ status: 'ignored', reason: 'no_key' });
            }

            let remoteJid = msgItem.key.remoteJid || "";
            if (msgItem.key.remoteJidAlt && String(msgItem.key.remoteJidAlt).includes('@s.whatsapp.net')) {
                remoteJid = String(msgItem.key.remoteJidAlt);
            }

            if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) {
                console.warn(`⚠️ [WEBHOOK] Invalid remoteJid: "${remoteJid}". Dropping (likely a group message).`);
                return res.status(200).json({ status: 'ignored', reason: 'invalid_jid' });
            }

            const rawNumber = remoteJid.split('@')[0];
            const phone = normalizePhone(rawNumber);
            const isFromMe = msgItem.key.fromMe === true;

            // Exhaustive text extraction (covers all Evolution API message types)
            const messageObj = msgItem.message || {};
            const text = messageObj.conversation 
                || messageObj.extendedTextMessage?.text 
                || messageObj.imageMessage?.caption
                || messageObj.videoMessage?.caption
                || messageObj.buttonsResponseMessage?.selectedDisplayText
                || messageObj.listResponseMessage?.title
                || messageObj.templateButtonReplyMessage?.selectedDisplayText
                || "";
            const isAudio = !!messageObj.audioMessage;
            const isImage = !!messageObj.imageMessage;
            const isVideo = !!messageObj.videoMessage;
            const isDocument = !!messageObj.documentMessage;
            const isSticker = !!messageObj.stickerMessage;

            console.log('[DEBUG PARSING]', { phone, text, instanceName });
            console.log(`💬 [WEBHOOK] Phone: ${phone} | fromMe: ${isFromMe} | Text: "${text.substring(0, 80)}" | Audio: ${isAudio} | Image: ${isImage}`);

            if (!text && !isAudio && !isImage && !isVideo && !isDocument) {
                console.log(`⏭️ [WEBHOOK] No processable content (sticker/reaction/etc). Skipping.`);
                return res.status(200).json({ success: true, message: 'No processable content' });
            }

            // 5. PERSIST MESSAGE
            let content = text;
            if (isAudio) content = "[AUDIO]";
            else if (isImage) content = "[IMAGE]";
            else if (isVideo) content = "[VIDEO]";
            else if (isDocument) content = "[DOCUMENT]";

            const messageId = msgItem.key.id || `gen_${Math.random().toString(36).substring(7)}`;

            const { error: msgError } = await supabaseAdmin.from('messages').upsert({
                lead_phone: phone,
                role: isFromMe ? 'assistant' : 'user',
                content: content,
                message_id: messageId,
                instance_name: instanceName,
                created_at: new Date().toISOString()
            }, { onConflict: 'message_id' });

            if (msgError) {
                console.error(`❌ [WEBHOOK] Message persist error:`, msgError.message);
            } else {
                console.log(`💾 [WEBHOOK] Message persisted: ${messageId}`);
            }

            // 6. ANTI-LOOP & WORKER SIGNAL
            if (isFromMe) {
                console.log(`🔄 [WEBHOOK] Outbound message logged. Skipping worker signal.`);
                return res.status(200).json({ success: true, message: 'Outbound logged' });
            }

            // 7. Resolve Owner & Queue for Eliza
            let activeOwnerId = tenantId;
            if (!activeOwnerId && instanceName) {
                const { data: bConfig } = await supabaseAdmin
                    .from('business_config')
                    .select('owner_id')
                    .eq('instance_name', instanceName)
                    .maybeSingle();
                activeOwnerId = bConfig?.owner_id;
            }

            if (!activeOwnerId) {
                console.error(`❌ [WEBHOOK] Could not resolve owner_id for instance: ${instanceName}. Lead NOT queued.`);
                return res.status(200).json({ success: false, reason: 'no_owner_id' });
            }

            const { data: upsertData, error: upsertError } = await supabaseAdmin
                .from('leads_lobo')
                .upsert({
                    phone: phone,
                    status: 'eliza_processing',
                    instance_name: instanceName,
                    owner_id: activeOwnerId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'phone' })
                .select();

            if (upsertError) {
                console.error('❌ [DB INSERT ERROR - leads_lobo]:', upsertError);
            } else {
                console.log(`✅ [WEBHOOK:SUCCESS] Lead ${phone} queued for Eliza Worker in leads_lobo. Data:`, upsertData);
            }

            return res.status(200).json({ success: true });
        }

        // 5. Unmatched Event (Log it so we can see what we're missing)
        console.log(`⏭️ [WEBHOOK] Unhandled event: "${event}". Ignoring.`);
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
// 🚀 SERVER BOOT
// ==============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🌐 Server (Webhook & Health) running on port ${PORT}`);
    console.log('🚀 [BOOT] Server started. Igniting immortal polling engine...');
    pollLeads(); // Start the recursive loop
});