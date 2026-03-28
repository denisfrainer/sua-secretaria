import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import http from 'http';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });

// 🧠 LÓGICA MVP: ROTEADOR DE INTENÇÃO
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    try {
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // Busca apenas as últimas 3 mensagens para evitar loops de contexto
        const { data: history } = await supabaseAdmin.from('messages')
            .select('role, content').eq('lead_phone', clientNumber)
            .order('created_at', { ascending: false }).limit(3);

        const lastMsg = history?.[0]?.content || "Oi";
        const transcript = (history || []).reverse().map(m => `${m.role}: ${m.content}`).join('\n');

        const systemPrompt = `Você é um robô de vendas binário. Analise o histórico e a última mensagem.
Sua única missão é vender a LP Express por R$ 499.

REGRAS:
1. Se o cliente quer comprar (disse "sim", "quero", "pix", "valor"): responda 'BUY'.
2. Se o cliente mandou comprovante ou disse que pagou: responda 'PAID'.
3. Caso contrário: responda 'GREET'.

HISTÓRICO:
${transcript}

Responda APENAS a palavra da intenção (BUY, PAID ou GREET).`;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
        });

        const intent = (result.text || "GREET").trim().toUpperCase();
        let reply = "";
        let sendPixImage = false;

        if (intent.includes("BUY")) {
            reply = "🚀 Excelente escolha! Vamos alavancar seu negócio agora. O valor é R$ 499,00.\n\nChave PIX (celular): 02959474031\n\nEstou enviando o QR Code abaixo. Mande o comprovante aqui para Denis começar seu projeto!";
            sendPixImage = true;
        } else if (intent.includes("PAID")) {
            reply = "Recebido! Meu sistema de visão está validando o comprovante agora mesmo. 🐺";
        } else {
            reply = "Olá! Sou a Eliza da meatende.ai. Vi que você quer atrair mais clientes. Nossa LP Express custa R$ 499 e fica pronta rápido. Vamos fechar?";
        }

        // Envio do QR Code estático
        if (sendPixImage) {
            await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
                method: 'POST',
                headers: { 'apikey': process.env.EVOLUTION_API_KEY!, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: clientNumber,
                    mediaMessage: { mediatype: "image", caption: "QR Code PIX 🐺", media: "https://i.imgur.com/ihpJUn7.jpeg" }
                })
            });
        }

        await sendWhatsAppPresence(clientNumber, 'composing');
        await sendWhatsAppMessage(clientNumber, reply, 1000);

        await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber, role: 'assistant', content: reply, message_id: `eliza_${Date.now()}`
        });

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    } catch (error) {
        console.error("❌ ERRO:", error);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

// 🔄 POLLING SIMPLIFICADO
async function startPolling() {
    console.log('🔄 Eliza Ativa...');
    while (true) {
        const { data: leads } = await supabaseAdmin.from('leads_lobo')
            .select('*').eq('status', 'eliza_processing').eq('ai_paused', false).limit(1);
        if (leads && leads.length > 0) await processLead(leads[0]);
        await new Promise(r => setTimeout(r, 4000));
    }
}

// 🌐 WEBHOOK MINIMALISTA
http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            res.writeHead(200); res.end();
            const payload = JSON.parse(body);
            const data = payload.data?.[0] || payload.data;
            if (!data?.key || data.key.fromMe) return;

            const phone = normalizePhone(data.key.remoteJid);
            const msg = data.message?.conversation || data.message?.extendedTextMessage?.text || "";

            if (msg) {
                await supabaseAdmin.from('messages').insert({ lead_phone: phone, role: 'user', content: msg, message_id: data.key.id });
                await supabaseAdmin.from('leads_lobo').upsert({ phone, status: 'eliza_processing' });
            }
        });
    } else {
        res.writeHead(200); res.end('Online');
    }
}).listen(process.env.PORT || 8080);

startPolling();