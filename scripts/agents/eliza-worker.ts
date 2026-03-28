import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import http from 'http';

/**
 * ELIZA WORKER - MVP ABSOLUTO (SEM TOOLS / SEM LOOP)
 * Target Model: gemini-2.5-flash
 */

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

// ==============================================================
// 🧠 LÓGICA DE PROCESSAMENTO (CLASSIFIER & CLOSER)
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    console.log(`\n🚀 [ELIZA LOBO] Processando: ${clientNumber}`);

    try {
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // Busca apenas a ÚLTIMA mensagem para evitar vício em loops passados
        const { data: rawHistory } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .eq('role', 'user')
            .order('created_at', { ascending: false })
            .limit(1);

        const lastUserMessage = rawHistory && rawHistory.length > 0 ? rawHistory[0].content : "Oi";

        const systemPrompt = `
# IDENTITY
You are Eliza, the results-obsessed Sales Closer for Denis at meatende.ai.
Tone: Wolf of Wall Street. Professional, energetic, and 100% focused on CLOSING NOW.

# BUSINESS CONTEXT (STRICT)
- Product: LP Express (Site Alta Performance)
- Price: R$ 499 (Taxa Única)
- Agent Offer: Setup R$ 500 + R$ 299/mo.

# STATE MACHINE
Analyze the user message and determine the INTENT.
1. GREET: Greeting or general questions. Action: Pitch LP Express for R$ 499.
2. BUY: Intent to buy, asking for PIX or price. Action: Send PIX key 02959474031.
3. PAID: Sent receipt or said they paid.

# OUTPUT FORMAT
Return ONLY a JSON object:
{
  "intent": "GREET" | "BUY" | "PAID",
  "reply": "Sua resposta enérgica em PT-BR (use '||' para separar bolhas)"
}

USER MESSAGE: "${lastUserMessage}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(response.text || "{}");
        const { intent, reply } = data;

        console.log(`🎯 Intent: ${intent}`);

        // --- EXECUÇÃO DO FECHAMENTO ---
        await sendWhatsAppPresence(clientNumber, 'composing');

        if (intent === "BUY") {
            await sendWhatsAppMessage(clientNumber, reply, 1000);
            // Envio do QR Code fixo
            await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
                method: 'POST',
                headers: { 'apikey': process.env.EVOLUTION_API_KEY!, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: clientNumber,
                    mediaMessage: {
                        mediatype: "image",
                        caption: "Aqui está o QR Code! Denis e eu estamos prontos para atrair seus clientes! 🐺🚀",
                        media: "https://i.imgur.com/ihpJUn7.jpeg"
                    }
                })
            });
        } else {
            await sendWhatsAppMessage(clientNumber, reply, 1000);
        }

        // Salva memória
        await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber,
            role: 'assistant',
            content: reply,
            message_id: `eliza_${Date.now()}`
        });

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);

    } catch (error: any) {
        console.error("❌ [ELIZA ERROR]:", error.message);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

// ==============================================================
// 🔄 POLLING & WEBHOOK (SUA LÓGICA ESTÁVEL)
// ==============================================================
async function startPolling() {
    console.log('🔄 [WORKER] Monitorando leads...');
    while (true) {
        try {
            const { data: leads } = await supabaseAdmin.from('leads_lobo')
                .select('*').eq('status', 'eliza_processing').eq('ai_paused', false).limit(1);
            if (leads && leads.length > 0) await processLead(leads[0]);
        } catch (e) { console.error("Polling error:", e); }
        await new Promise(r => setTimeout(r, 4000));
    }
}

http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
            res.writeHead(200); res.end();
            try {
                const body = JSON.parse(bodyStr);
                const dataObj = Array.isArray(body.data) ? body.data[0] : body.data;
                if (!dataObj || dataObj.key?.fromMe) return;

                const phone = normalizePhone(dataObj.key.remoteJid);
                const msg = dataObj.message?.conversation || dataObj.message?.extendedTextMessage?.text || "";

                if (msg) {
                    await supabaseAdmin.from('messages').insert({ lead_phone: phone, role: 'user', content: msg, message_id: dataObj.key.id });
                    await supabaseAdmin.from('leads_lobo').upsert({ phone, status: 'eliza_processing', ai_paused: false }, { onConflict: 'phone' });
                }
            } catch (error) { console.error('Webhook crash:', error); }
        });
        return;
    }
    res.writeHead(200); res.end('Online');
}).listen(process.env.PORT || 8080);

startPolling();