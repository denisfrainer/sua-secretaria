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
// 📸 VISION OCR (PIX VALIDATION)
// ==============================================================
async function analyzeReceiptWithGemini(base64Data: string, clientPhone: string) {
    console.log(`📸 [VISION] Analisando comprovante PIX de ${clientPhone}...`);
    try {
        const visionAi = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });
        const result = await visionAi.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: 'user',
                parts: [
                    { text: "Analise este comprovante PIX. Retorne ESTRITAMENTE um JSON no formato: { \"is_valid_pix\": boolean, \"amount\": number }. Para ser válido (is_valid_pix: true), o valor pago (amount) DEVE ser exatamente 0.01. Caso contrário, retorne false." },
                    { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                ]
            }],
            config: { responseMimeType: "application/json" }
        });

        const responseText = result.text || "{}";
        const cleanedJson = responseText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedJson);
    } catch (error) {
        console.error("❌ [VISION ERROR]:", error);
        return { is_valid_pix: false, amount: 0, error: "Falha visual" };
    }
}

// ==============================================================
// 🧠 LEAD PROCESSING LOGIC (STATELESS WOLF CLOSER)
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    console.log(`\n===========================================`);
    console.log(`🧠 [ELIZA WOLF] Processing Lead: ${clientNumber}`);

    try {
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // Fetch last 5 messages from user/assistant to prevent "Cegueira Seletiva" (Anti-Loop)
        const { data: rawHistory } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: false })
            .limit(5);

        let transcript = "";
        let lastMsg = "Oi";
        
        if (rawHistory && rawHistory.length > 0) {
            // Reverse to get chronological order (oldest first)
            const chronological = rawHistory.reverse();
            transcript = chronological.map(msg => `${msg.role === 'user' ? 'Client' : 'Eliza'}: ${msg.content}`).join('\n');
            const userMsgs = chronological.filter(m => m.role === 'user');
            if (userMsgs.length > 0) {
                lastMsg = userMsgs[userMsgs.length - 1].content;
            }
        } else {
            transcript = "Client: Oi";
        }

        const systemPrompt = `You are a binary Sales Engine.
Last User Message: ${lastMsg}

RULES:
1. User says they paid ('paguei', 'tá na mão', 'está aí', 'comprovante'): Intent = PAID. Reply = 'Pagamento em validação! Denis já vai conferir e iniciar seu projeto. 🚀🐺'
2. User wants to buy, asks for PIX or price: Intent = BUY. Reply = 'Excelente! O PIX é 02959474031 (celular). Manda o comprovante de R$ 0,01!'
3. User says hello or general talk: Intent = GREET. Reply = 'Olá! LP Express por R$ 499. Vamos fechar?'

OUTPUT ONLY A VALID JSON:
{ "intent": "GREET" | "BUY" | "PAID", "reply": "..." }`;

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

        // --- HANDOFF DE PAGAMENTO (TEXT INTENT) ---
        if (intent === "PAID") {
            await sendWhatsAppPresence(clientNumber, 'composing');
            await sendWhatsAppMessage(clientNumber, elizaReply, 2500);
            
            await supabaseAdmin.from('messages').insert({
                lead_phone: clientNumber, role: 'assistant', content: elizaReply, message_id: `eliza_${Date.now()}`
            });

            await supabaseAdmin.from('leads_lobo').update({ status: 'paid', ai_paused: true, needs_human: true }).eq('id', lead.id);
            console.log(`✅ [ELIZA WOLF] Lead ${clientNumber} classificado como PAID via texto. Automação finalizada.`);
            return; // Encerra o processLead permanentemente
        }

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

        // --- ENVIO SIMPLIFICADO DE MENSAGENS (PREVENÇÃO DE SPAM) ---
        // O modelo já vem com a regra de enviar frases curtas.
        console.log(`📤 Enviando resposta para ${clientNumber}: "${elizaReply}"`);
        
        await sendWhatsAppPresence(clientNumber, 'composing');
        await sendWhatsAppMessage(clientNumber, elizaReply, 2500); // Fixo de 2.5s para humanização básica

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
                    // --- 📸 DETECÇÃO DE COMPROVANTE (IMAGEM) ---
                    if (messageObj.imageMessage) {
                        if (isFromMe) return;

                        const { data: lead } = await supabaseAdmin.from('leads_lobo').select('ai_paused, needs_human, id').eq('phone', clientNumber).maybeSingle();
                        if (lead && (lead.ai_paused === true || lead.needs_human === true)) return;

                        console.log("📸 [WEBHOOK] Imagem recebida. Iniciando validador PIX (Gemini Vision)...");

                        try {
                            const baseUrl = (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "").replace(/\/$/, "");
                            const apikey = process.env.EVOLUTION_API_KEY || "";
                            // Extração segura da instância
                            const instanceName = body.instance || process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE || "";
                            
                            if (!instanceName) throw new Error("Instance name missing in webhook payload.");
                            
                            const msgId = dataObj.key.id;

                            // Tratamento do Infinite Hang (Timeout de 10s)
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 10000);

                            const evoRes = await fetch(`${baseUrl}/chat/getBase64FromMessages/${instanceName}`, {
                                method: 'POST',
                                headers: { 'apikey': apikey, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    message: { 
                                        key: { id: msgId } 
                                    } 
                                }),
                                signal: controller.signal
                            });
                            clearTimeout(timeoutId);

                            if (!evoRes.ok) throw new Error(`Evolution API Error: ${evoRes.status} ${evoRes.statusText}`);

                            const data = await evoRes.json();
                            let base64String = data.base64;

                            if (base64String && base64String.includes('base64,')) {
                                base64String = base64String.split('base64,')[1];
                            }

                            if (base64String) {
                                await sendWhatsAppPresence(clientNumber, 'composing');
                                const analysis = await analyzeReceiptWithGemini(base64String, clientNumber);

                                if (analysis.is_valid_pix && analysis.amount === 0.01) {
                                    console.log(`✅ [OCR SUCCESS] Comprovante BETA de R$${analysis.amount} validado para ${clientNumber}`);
                                    const finalReply = "Pagamento de R$ 0,01 identificado! O Denis já foi avisado e entrará em contato em instantes para iniciarmos o projeto. 🚀🐺";
                                    await sendWhatsAppMessage(clientNumber, finalReply);
                                    
                                    if (lead) {
                                        await supabaseAdmin.from('leads_lobo').update({ status: 'paid', ai_paused: true, needs_human: true }).eq('id', lead.id);
                                    }
                                } else {
                                    console.log(`❌ [OCR REJEITADO] Retornou: ${analysis.amount} | Validade: ${analysis.is_valid_pix}`);
                                    await sendWhatsAppMessage(clientNumber, "Puxa, não consegui validar esse comprovante. Para o teste beta, certifique-se de enviar EXATAMENTE R$ 0,01. 🧐 Aguarde um instante para checagem manual.");
                                    if (lead) await supabaseAdmin.from('leads_lobo').update({ status: 'needs_human', needs_human: true }).eq('id', lead.id);
                                }
                            } else {
                                throw new Error("Base64 string nula ou inválida.");
                            }
                        } catch (err: any) {
                            console.error("❌ Erro no fluxo de OCR da Imagem:", err.name === 'AbortError' ? 'Timeout ao tentar capturar imagem (Infinite Hang)' : err.message);
                        }
                        return; // O fluxo morre aqui para a mídia de imagem
                    }

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

    if (req.method === 'POST' && req.url === '/webhook-kiwify') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });

        req.on('end', async () => {
            // 5. RESPONSE: Always return 200 OK immediately Kiwify timeout prevents retry
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');

            try {
                const body = JSON.parse(bodyStr);

                // 3. LOGIC IMPLEMENTATION - Log the incoming data for Railway monitoring
                console.log(`📥 [KIWIFY RAW PAYLOAD]:\n`, JSON.stringify(body, null, 2));

                // 2. PAYLOAD PARSING
                const orderStatus = body.order_status;
                const customerMobile = body.Customer?.mobile;

                if ((orderStatus === 'approved' || orderStatus === 'paid') && customerMobile) {
                    const clientNumber = normalizePhone(String(customerMobile));
                    
                    console.log(`💰 [KIWIFY WEBHOOK] Pagamento ${orderStatus} detectado para ${clientNumber}`);
                    
                    // 3. SUPABASE UPDATE
                    // Updating 'leads' as explicitly requested
                    const { error: updateError } = await supabaseAdmin
                        .from('leads')
                        .update({ status: 'paid' })
                        .eq('phone', clientNumber);

                    // Concurrently also update 'leads_lobo' so Eliza AI engine stops acting on this lead
                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ status: 'paid', ai_paused: true, needs_human: true })
                        .eq('phone', clientNumber);

                    if (updateError) {
                        console.error('❌ [KIWIFY WEBHOOK] Erro ao atualizar Supabase (leads):', updateError);
                    } else {
                        // 4. TRIGGER WHATSAPP MESSAGE
                        const message = "Pagamento confirmado pelo sistema! O seu projeto foi ativado e o Denis já está assumindo o chat para iniciarmos o setup. 🐺🚀";
                        await sendWhatsAppPresence(clientNumber, 'composing');
                        await sendWhatsAppMessage(clientNumber, message, 2500);
                        console.log(`✅ [KIWIFY WEBHOOK] Mensagem de onboarding enviada para ${clientNumber}`);
                    }
                } else {
                    console.log(`ℹ️ [KIWIFY WEBHOOK] Evento ignorado: status=${orderStatus}, has_mobile=${!!customerMobile}`);
                }
            } catch (error) {
                console.error('❌ [KIWIFY WEBHOOK CRASH]:', error);
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
}).listen(PORT, () => console.log(`🌐 Server (Healthcheck & Webhook) running on port ${PORT}`));

startPolling();