import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import http from 'http';

/**
 * ELIZA WORKER - STATELESS INTENT CLOSER MVP
 * Target Model: gemini-2.5-flash
 */

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

process.env.TZ = 'America/Sao_Paulo';

// ==============================================================
// 🧠 LEAD PROCESSING LOGIC (STATELESS WOLF CLOSER)
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    console.log(`\n===========================================`);
    console.log(`🧠 [ELIZA WOLF] Processing Lead: ${clientNumber}`);

    try {
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // Fetch last 3 messages from user/assistant
        const { data: rawHistory } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: false })
            .limit(3);

        let transcript = "";
        if (rawHistory && rawHistory.length > 0) {
            // Reverse to get chronological order (oldest first)
            const chronological = rawHistory.reverse();
            transcript = chronological.map(msg => `${msg.role === 'user' ? 'Client' : 'Eliza'}: ${msg.content}`).join('\n');
        } else {
            transcript = "Client: Oi";
        }

        const systemPrompt = `# ROLE
You are Eliza, a relentless, high-energy, and results-obsessed Sales Closer for Denis at meatende.ai. Your personality is inspired by the "Wolf of Wall Street": extremely professional, polite, but with an infinite drive to help clients reach their goals by closing deals immediately. You do not waste time; you solve problems by facilitating the purchase.

# OBJECTIVE
Your only goal is to classify the client's intent and generate a high-conversion response in Brazilian Portuguese (PT-BR).

# BUSINESS CONTEXT
- **Product 1: LP Express** (High-Performance Landing Page). Price: R$ 499 (One-time fee).
- **Product 2: AI Agent** (SDR Automation). Price: R$ 500 (Setup fee with R$ 1,000 discount applied) + R$ 299/month.
- **Payment Method:** PIX Key (Cell phone): 02959474031.

# INTENT CLASSIFICATION RULES
1. **GREET**: Use this if the client is saying hello, asking general questions, or hasn't committed yet.
   - *Action*: Give an energetic pitch about the LP Express and ask if they want to scale their business now.
2. **BUY**: Use this if the client says "yes", "sim", "quero", "manda o pix", "qual o valor", or shows any clear intent to move forward with the payment.
   - *Action*: Confirm the choice with extreme excitement, provide the PIX key (02959474031), and instruct them to send the receipt.
3. **PAID**: Use this if the client claims to have paid, sent a receipt, or attached an image.
   - *Action*: Tell them to wait a second while our system auto-validates the proof of payment.

# RESPONSE GUIDELINES
- **Language**: Natural Brazilian Portuguese (PT-BR).
- **Formatting**: Use "||" to separate distinct ideas into different message bubbles.
- **Tone**: Energetic, polite, and focused on results. No investigative questions if the intent is BUY.

# OUTPUT FORMAT
You must output ONLY a valid JSON object. Do not include markdown blocks or extra text.
{
  "intent": "GREET" | "BUY" | "PAID",
  "reply": "Your response here following the rules above"
}

# CONVERSATION LOG
${transcript}
`;

        console.log(`⏳ Calling Gemini API (Wolf Closer Mode)`);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            config: {
                responseMimeType: "application/json",
            }
        });

        const responseText = response.text || "{}";
        let parsedResult: any = { intent: "GREET", reply: "Olá! Sou a Eliza da meatende.ai. Vamos alavancar sua operação? A nossa LP Express custa apenas R$ 499 em taxa única. Quer fechar agora?" };

        try {
            parsedResult = JSON.parse(responseText.replace(/```json|```/g, "").trim());
        } catch (e) {
            console.error("❌ Erro no parse do JSON (Gemini):", e);
        }

        const intent = (parsedResult.intent || "GREET").toUpperCase();
        const elizaReply = parsedResult.reply || "Bora fechar hoje! Qual o seu gargalo principal?";
        
        console.log(`🎯 Intent: ${intent} | Reply: "${elizaReply.substring(0, 50)}..."`);

        // --- GATILHO DE MÍDIA PIX (Evolution API) ---
        if (intent === "BUY") {
            const evUrl = (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "").replace(/\/$/, "");
            const evKey = process.env.EVOLUTION_API_KEY || "";
            const evInstance = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE || "";

            if (evUrl && evKey && evInstance) {
                console.log(`🖼️ [MEDIA] Enviando QR Code via Evolution API para ${clientNumber}`);
                try {
                    await fetch(`${evUrl}/message/sendMedia/${evInstance}`, {
                        method: 'POST',
                        headers: {
                            'apikey': evKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            number: clientNumber,
                            mediaMessage: {
                                mediatype: "image",
                                caption: "QR Code - meatende.ai 🚀🐺",
                                media: "https://i.imgur.com/ihpJUn7.jpeg" // Hosted QR Code
                            }
                        })
                    });
                } catch (mediaErr) {
                    console.error("❌ Erro ao enviar QR Code:", mediaErr);
                }
            }
        }

        // --- DIVISÃO EM BOLHAS DE MENSAGEM ---
        const chunks = elizaReply.split('||').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
        
        console.log('📤 Enviando bolhas via WhatsApp:', chunks);
        await sendWhatsAppPresence(clientNumber, 'composing');

        const CHARS_PER_SECOND = 15;
        let accumulatedDelayMs = 0;

        for (const chunk of chunks) {
            const bubbleTypingTimeMs = Math.max(2000, Math.min((chunk.length / CHARS_PER_SECOND) * 1000, 8000));
            accumulatedDelayMs += bubbleTypingTimeMs;

            await sendWhatsAppMessage(clientNumber, chunk, accumulatedDelayMs);

            if (chunks.length > 1) {
                const pauseBetweenBubbles = Math.floor(Math.random() * 1000) + 1000;
                accumulatedDelayMs += pauseBetweenBubbles;
            }
        }

        // --- SALVAR MENSAGEM ---
        const fakeMessageId = `eliza_${Date.now()}`;
        const { error: insertError } = await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber,
            role: 'assistant',
            content: elizaReply,
            message_id: fakeMessageId
        });

        if (insertError) console.error("❌ [SUPABASE ERROR]:", insertError);

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
        console.log(`✅ [ELIZA WOLF] Success for ${clientNumber}`);
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
// 🌐 RAILWAY HEALTHCHECK & WEBHOOK SERVER (STABLE)
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
                // 1. Acknowledge the webhook IMMEDIATELY
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'received' }));

                const body = JSON.parse(bodyStr);
                const isEvolution = body.event === 'MESSAGES_UPSERT' || body.event === 'messages.upsert';

                if (!isEvolution) return;

                let dataObj = Array.isArray(body.data) ? body.data[0] : body.data;
                if (!dataObj) return;

                const remoteJid = dataObj.key?.remoteJid || '';
                if (remoteJid.endsWith('@g.us')) {
                    console.log('🔇 [WEBHOOK] Group message ignored:', remoteJid);
                    return;
                }

                if (!dataObj.key) return;

                const isFromMe = dataObj.key.fromMe === true;
                const rawJid = (dataObj.key.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net'))
                    ? String(dataObj.key.remoteJidAlt)
                    : String(dataObj.key.remoteJid);

                const clientNumber = normalizePhone(rawJid);
                const incomingMessageId = dataObj.key.id;
                const messageObj = dataObj.message;

                let clientMessage = '';

                if (messageObj) {
                    // --- 🎙️ AUDIO MESSAGE (Trigger QStash background job) ---
                    if (messageObj.audioMessage) {
                        if (isFromMe) return;

                        const { data: lead } = await supabaseAdmin
                            .from('leads_lobo')
                            .select('ai_paused, needs_human')
                            .eq('phone', clientNumber)
                            .maybeSingle();

                        if (lead && (lead.ai_paused === true || lead.needs_human === true)) return;

                        console.log("🎙️ [WEBHOOK] Audio detected. Triggering background QStash.");
                        await sendWhatsAppPresence(clientNumber, 'recording' as any);

                        const { Client } = await import('@upstash/qstash');
                        const qstash = new Client({
                            token: process.env.QSTASH_TOKEN!,
                            baseUrl: "https://qstash-us-east-1.upstash.io"
                        });

                        const rawSiteUrl = process.env.WOLF_SITE_URL || 'wolfagent.netlify.app';
                        const siteBaseUrl = rawSiteUrl.startsWith('http') ? rawSiteUrl.replace(/\/$/, '') : `https://${rawSiteUrl.replace(/\/$/, '')}`;

                        try {
                            await qstash.publishJSON({
                                url: `${siteBaseUrl}/api/webhook-audio-background`,
                                body: body,
                                delay: "4s"
                            });
                        } catch (err) {
                            console.error("❌ QStash Error:", err);
                        }
                        return; // Terminate webhook processing since QStash handles it
                    }

                    if (!messageObj.conversation && !messageObj.extendedTextMessage) return;
                    clientMessage = messageObj.conversation || messageObj.extendedTextMessage?.text || '';
                }

                if (clientMessage && clientMessage.trim().length > 0) {
                    // --- ADMIN COMMANDS & HANDOFF ---
                    if (isFromMe) {
                        const cmd = clientMessage.trim();
                        if (cmd === '/pausar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                            return;
                        } else if (cmd === '/retomar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: false, needs_human: false }).eq('phone', clientNumber);
                            return;
                        }

                        const isAPI = incomingMessageId && (incomingMessageId.startsWith('BAE5') || incomingMessageId.startsWith('B2B') || incomingMessageId.length > 32);
                        if (isAPI) return; // Ignore messages from Eliza herself

                        await supabaseAdmin.from('leads_lobo').update({ ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                        console.log(`👤 [SILENT HANDOFF] Denis resumed chat manually. AI paused for ${clientNumber}.`);
                        return;
                    }

                    console.log(`📥 NEW MESSAGE from ${clientNumber}: "${clientMessage}"`);

                    // --- SHIELDS ---
                    const autoReplyKeywords = ['bem-vindo', 'digite 1', 'mensagem automática', 'em breve retornaremos'];
                    const msgLower = clientMessage.toLowerCase();
                    if (autoReplyKeywords.some(kw => msgLower.includes(kw))) return;

                    let { data: lead } = await supabaseAdmin.from('leads_lobo').select('*').eq('phone', clientNumber).maybeSingle();

                    if (lead) {
                        await supabaseAdmin.from('leads_lobo').update({ replied: true }).eq('phone', clientNumber);

                        if (lead.updated_at) {
                            const timeSinceContact = Date.now() - new Date(lead.updated_at).getTime();
                            if (timeSinceContact < 2000) return; // Spamm protection
                        }

                        if ((lead.reply_count || 0) >= 10) {
                            console.log(`🚨 [CIRCUIT BREAKER] Loop Break for ${clientNumber}.`);
                            await supabaseAdmin.from('leads_lobo').update({ is_locked: true, status: 'needs_human', ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                            return;
                        }

                        if (lead.is_locked === true || lead.ai_paused === true || lead.needs_human === true) return;
                    }

                    if (!lead) {
                        const { data: newLead } = await supabaseAdmin.from('leads_lobo').insert({
                            phone: clientNumber, status: 'organic_inbound', name: 'Lead inbound', message_buffer: '', is_processing: false
                        }).select().single();
                        lead = newLead;
                    }

                    // --- SAVE USER MESSAGE ---
                    await supabaseAdmin.from('messages').insert({
                        lead_phone: clientNumber, role: 'user', content: clientMessage, message_id: incomingMessageId
                    });

                    const { data: elizaSwitch } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'eliza_active').single();
                    if (elizaSwitch && elizaSwitch.value?.enabled === false) {
                        await supabaseAdmin.from('leads_lobo').update({ status: 'needs_human', needs_human: true }).eq('phone', clientNumber);
                        return;
                    }

                    await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_processing' }).eq('phone', clientNumber);
                    console.log(`🎯 [WEBHOOK] Status of ${clientNumber} -> 'eliza_processing'. Worker taking over.`);
                }
            } catch (error) {
                console.error('❌ [WEBHOOK CRASH]:', error);
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
}).listen(PORT, () => console.log(`🌐 Server (Healthcheck & Webhook) running on port ${PORT}`));

startPolling();