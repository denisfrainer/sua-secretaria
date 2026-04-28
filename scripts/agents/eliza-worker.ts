import http from 'http';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage } from '../../lib/whatsapp/sender';
import { processMenuState } from '../handlers/menu-handler';
import { normalizePhone } from '../../lib/utils/phone';

/**
 * ELIZA WORKER - NATIVE WEBHOOK INGESTION & POLLING ENGINE
 * Reverted to native http.createServer to handle Evolution webhooks
 * directly and process leads asynchronously.
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
    console.log('💓 [HEARTBEAT] Scanning leads_lobo for eliza_processing leads...');
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
// 🚀 BOOT: WEBHOOK INGESTION + IMMORTAL POLLING ENGINE
// ==============================================================
// This single server handles both incoming Evolution API webhooks AND
// the background polling engine loop. We bind to PORT (injected by Railway).

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    console.log('🚨 [INBOUND] Method:', req.method, 'URL:', req.url);
    console.log('📡 [HEADERS]:', JSON.stringify(req.headers));

    // Healthcheck
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
        res.writeHead(200);
        res.end('Eliza Polling Engine & Webhook Online');
        return;
    }

    // Webhook Ingestion
    if (req.method === 'POST') {
        const chunks: Buffer[] = [];
        req.on('data', chunk => {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });

        req.on('end', async () => {
            try {
                const body = Buffer.concat(chunks).toString('utf8');
                console.log('📦 [RAW BODY]:', body);
                const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
                const tenantId = parsedUrl.searchParams.get('tenantId');
                console.log('🆔 [TENANT_ID FROM URL]:', tenantId);

                const payload = JSON.parse(body);

                // 1. Process Event Type
                const eventRaw = String(payload.event || payload.type || payload.apiType || '');
                const eventNormalized = eventRaw.toUpperCase().replace(/\./g, '_');

                const instanceName = payload.instance || payload.instanceName || payload.data?.instance || parsedUrl.searchParams.get('instance') || 'Unknown';

                // ============================================================
                // 🚪 CROSS-PLATFORM CONNECTION STATE HANDLER
                // ============================================================
                if (eventNormalized === 'CONNECTION_UPDATE') {
                    const state = payload.data?.state || payload.data?.status || payload.state;
                    if (state) {
                        let statusStr = String(state).toUpperCase();
                        if (statusStr === 'OPEN') statusStr = 'CONNECTED';
                        if (statusStr === 'CLOSE' || statusStr === 'DISCONNECTED') statusStr = 'DISCONNECTED';
                        
                        await supabaseAdmin.from('business_config')
                            .update({ status: statusStr, updated_at: new Date().toISOString() })
                            .eq('instance_name', instanceName);
                        console.log(`🔄 [CONNECTION] Instance ${instanceName} status updated to ${statusStr}`);
                    }
                    res.writeHead(200);
                    res.end('Connection Update processed');
                    return; // End execution for this event type
                }

                if (eventNormalized !== 'MESSAGES_UPSERT') {
                    console.log(`🔕 [SILENT DROP] Ignored event type: ${eventNormalized}`);
                    res.writeHead(200);
                    res.end('Ignored event');
                    return;
                }

                let dataObj = Array.isArray(payload.data) ? payload.data[0] : payload.data;
                if (!dataObj) {
                    console.warn(`🔕 [SILENT DROP] No dataObj found in payload.`);
                    res.writeHead(200);
                    res.end('No data object');
                    return;
                }

                const msgItem = (dataObj.messages && Array.isArray(dataObj.messages))
                    ? dataObj.messages[0]
                    : dataObj;

                if (!msgItem || !msgItem?.key) {
                    console.warn(`🔕 [SILENT DROP] No msgItem or msgItem.key found in dataObj.`);
                    res.writeHead(200);
                    res.end('No key');
                    return;
                }

                // Strictly ignore loops (messages sent by the bot itself)
                const isFromMe = msgItem?.key?.fromMe === true;
                console.log('🕵️ [PARSER] isFromMe:', isFromMe);
                if (isFromMe) {
                    console.log('🔕 [SILENT DROP] Ignored fromMe message (anti-loop).');
                    res.writeHead(200);
                    res.end('Ignored fromMe');
                    return;
                }

                // 2. Extract and Normalize Phone
                let remoteJid = msgItem?.key?.remoteJid || '';
                if (msgItem?.key?.remoteJidAlt && String(msgItem?.key?.remoteJidAlt).includes('@s.whatsapp.net')) {
                    remoteJid = String(msgItem?.key?.remoteJidAlt);
                }

                if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) {
                    console.warn(`🔕 [SILENT DROP] Ignored group or invalid JID: "${remoteJid}"`);
                    res.writeHead(200);
                    res.end('Ignored group or invalid JID');
                    return;
                }

                const rawNumber = remoteJid.split('@')[0];
                const clientNumber = normalizePhone(rawNumber);
                console.log('🕵️ [PARSER] Phone:', clientNumber, '(Raw:', rawNumber, ')');

                // 3. Extract Text and Instance Name
                const msgData = msgItem?.message?.ephemeralMessage?.message || msgItem?.message || payload.data?.message || payload.data || {};
                let text = msgData.conversation
                    || msgData.extendedTextMessage?.text
                    || msgData.imageMessage?.caption
                    || msgData.videoMessage?.caption
                    || msgData.buttonsResponseMessage?.selectedDisplayText
                    || msgData.listResponseMessage?.title
                    || msgData.templateButtonReplyMessage?.selectedDisplayText
                    || '';
                
                console.log('🕵️ [PARSER] Extracted Text:', text ? text.substring(0, 50) : '');

                const isAudio = !!msgData.audioMessage;
                const isImage = !!msgData.imageMessage;
                const isVideo = !!msgData.videoMessage;
                const isDocument = !!msgData.documentMessage;

                if (!text && !isAudio && !isImage && !isVideo && !isDocument) {
                    console.warn(`🔕 [SILENT DROP] No processable text or media found. Extracted text was empty.`);
                    res.writeHead(200);
                    res.end('No processable content');
                    return;
                }

                let content = text;
                if (isAudio) content = '[AUDIO]';
                else if (isImage) content = '[IMAGE]';
                else if (isVideo) content = '[VIDEO]';
                else if (isDocument) content = '[DOCUMENT]';

                console.log('🔍 [PARSER TRACE]:', {
                    eventName: eventNormalized,
                    instanceName,
                    isFromMe,
                    rawJid: dataObj?.messages?.[0]?.key?.remoteJid || dataObj?.key?.remoteJid || remoteJid,
                    clientNumber
                });

                console.log(`\n📥 [WEBHOOK INGEST] Received from ${clientNumber} on instance ${instanceName}`);

                const messageId = msgItem?.key?.id || `gen_${Math.random().toString(36).substring(7)}`;

                // Optional: Persist the raw message in DB for history
                await supabaseAdmin.from('messages').upsert({
                    lead_phone: clientNumber,
                    role: 'user',
                    content: content,
                    message_id: messageId,
                    instance_name: instanceName,
                    created_at: new Date().toISOString()
                }, { onConflict: 'message_id' });

                // 4. THE QUEUEING UPSERT (Phase 2 Fix - Owner ID Mapping)
                let activeOwnerId = tenantId;
                if (!activeOwnerId && instanceName && instanceName !== 'Unknown') {
                    const { data: bConfig } = await supabaseAdmin
                        .from('business_config')
                        .select('owner_id')
                        .eq('instance_name', instanceName)
                        .maybeSingle();
                    activeOwnerId = bConfig?.owner_id;
                }

                if (!activeOwnerId) {
                    console.error(`❌ [WEBHOOK] LEAD DROPPED: Could not resolve owner_id | phone=${clientNumber} | instance=${instanceName}`);
                    res.writeHead(200);
                    res.end('Dropped: No owner_id');
                    return;
                }

                try {
                    const { data, error } = await supabaseAdmin.from('leads_lobo').upsert({
                        phone: clientNumber, // Must be normalized
                        status: 'eliza_processing', // CRITICAL TRIGGER
                        instance_name: instanceName,
                        owner_id: activeOwnerId, // CRITICAL: Ensure this maps correctly
                        lead_source: 'inbound',
                        menu_step: 0,
                        ai_paused: false,
                        needs_human: false,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'phone' });

                    if (error) {
                        console.error('❌ [DB INSERT ERROR]:', JSON.stringify(error, null, 2));
                    } else {
                        console.log('✅ [DB SUCCESS]: Lead queued in leads_lobo.');
                    }
                } catch (e) {
                    console.error('🔥 [CRITICAL DB CRASH]:', e);
                }

                console.log(`✅ [WEBHOOK] Queued ${clientNumber} for Eliza.`);
                res.writeHead(200);
                res.end('Webhook Ingested Successfully');

            } catch (err: any) {
                console.error('🔥 [PARSER CRASH]:', err?.message, err?.stack);
                const bodyStr = Buffer.concat(chunks).toString('utf8');
                console.error('📦 [CRASHING PAYLOAD]:', bodyStr);
                res.writeHead(200);
                res.end('Error ingested but returning 200');
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
}).listen(PORT, () => {
    console.log(`\n🌐 Eliza Worker Server listening on port ${PORT}`);
    console.log('🚀 [BOOT] Igniting immortal polling engine...');
    pollLeads(); // Start the recursive loop
});