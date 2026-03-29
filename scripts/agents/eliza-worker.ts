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
2. User wants to buy, asks for PIX or price: Intent = BUY. Reply = 'Excelente! Garanta a sua LP Express pelo nosso checkout seguro da Kiwify: https://pay.kiwify.com.br/C4hT4th \\n\\nMe avise assim que concluir o pagamento! 🚀🐺'
3. User says hello or general talk: Intent = GREET. Reply = 'Olá! LP Express por R$ 499. Vamos fechar?'

OUTPUT ONLY A VALID JSON EXCLUSIVELY:
{ "intent": "GREET" | "BUY" | "PAID", "reply": "TEXT" }`;

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
    // Normaliza a URL para evitar 404 por causa de "/" no final ou query params
    const fullUrl = req.url || '';
    const path = fullUrl.split('?')[0].replace(/\/$/, '');

    // 1. HEALTHCHECK
    if (req.method === 'GET' && (path === '' || path === '/')) {
        res.writeHead(200);
        res.end('Eliza Worker Online');
        return;
    }

    // 2. WEBHOOK EVOLUTION (WhatsApp)
    if (req.method === 'POST' && path === '/webhook') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
            try {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'received' }));

                const body = JSON.parse(bodyStr);
                
                // 1. Extração de Mensagem (Evolution API)
                let dataObj = body.data;
                if (Array.isArray(body.data)) dataObj = body.data[0];
                
                if (!dataObj?.key || !dataObj.message) return; // Not a message event

                const rawJid = (dataObj.key.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net'))
                    ? String(dataObj.key.remoteJidAlt)
                    : String(dataObj.key.remoteJid);
                    
                const clientNumber = normalizePhone(rawJid);
                
                const messageType = Object.keys(dataObj.message)[0];
                let textContent = "";
                
                if (messageType === 'conversation') {
                    textContent = dataObj.message.conversation;
                } else if (messageType === 'extendedTextMessage') {
                    textContent = dataObj.message.extendedTextMessage?.text;
                }
                
                if (!textContent) return; // Ignora mídia sem texto aqui
                
                console.log(`📥 [EVOLUTION WEBHOOK] Nova mensagem de ${clientNumber}: "${textContent}"`);

                // 2. Salva na tabela messages
                await supabaseAdmin.from('messages').insert({
                    lead_phone: clientNumber,
                    role: 'user',
                    content: textContent,
                    message_id: dataObj.key.id
                });
                
                // 3. Atualiza status para reativar o Polling
                await supabaseAdmin.from('leads_lobo')
                    .update({ status: 'eliza_processing' })
                    .eq('phone', clientNumber);
                    
            } catch (e) { console.error("Erro Webhook Evolution:", e); }
        });
        return;
    }

    // 3. WEBHOOK KIWIFY (Pagamentos)
    if (req.method === 'POST' && path === '/webhook-kiwify') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
            // Responde 200 imediatamente para a Kiwify
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');

            try {
                const body = JSON.parse(bodyStr);
                console.log(`📥 [KIWIFY] Payload recebido. Status: ${body.order_status}`);

                const orderStatus = body.order_status;
                const customerMobile = body.Customer?.mobile;

                if ((orderStatus === 'approved' || orderStatus === 'paid') && customerMobile) {
                    // 1. Limpeza agressiva: mantém APENAS números
                    // Kiwify pode mandar +55 11 99999-9999 -> vira 5511999999999
                    const clientNumber = String(customerMobile).replace(/\D/g, '');

                    console.log(`💰 [KIWIFY] Processando pagamento para o número limpo: ${clientNumber}`);

                    // 2. Atualiza Supabase (leads_lobo e leads)
                    // Usamos o número limpo aqui também para bater com o banco
                    await supabaseAdmin.from('leads_lobo').update({
                        status: 'paid',
                        ai_paused: true,
                        needs_human: true
                    }).eq('phone', clientNumber);

                    await supabaseAdmin.from('leads').update({
                        status: 'paid',
                        ai_paused: true,
                        needs_human: true
                    }).eq('phone', clientNumber);

                    // 3. Envio para Evolution
                    const message = "Obrigado pela compra! Estou notificando o Denis imediatamente... 🐺🚀";

                    try {
                        // Forçamos o envio apenas com os dígitos, sem o sufixo @s.whatsapp.net
                        await sendWhatsAppMessage(clientNumber, message, 2500);
                        console.log(`✅ [KIWIFY] Mensagem enviada com sucesso para ${clientNumber}`);
                    } catch (sendError) {
                        console.error(`❌ [KIWIFY] Erro ao disparar WhatsApp:`, sendError);
                    }
                }
            } catch (e) { console.error("Erro Webhook Kiwify:", e); }
        });
        return;
    }

    // Se chegar aqui, é 404 real
    res.writeHead(404);
    res.end();
}).listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

startPolling();