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
// 🐺 LOBO MVP - FIX DE CONEXÃO E LIMPEZA DE NÚMERO
async function processLead(lead: any) {
    // Garante que o número tenha apenas dígitos e no máximo 13 caracteres
    const rawNumber = lead.phone.replace(/\D/g, '');
    const clientNumber = rawNumber.length > 13 ? rawNumber.substring(0, 13) : rawNumber;

    console.log(`\n===========================================`);
    console.log(`🚀 [ELIZA LOBO] Processando: ${clientNumber}`);

    try {
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        const { data: history } = await supabaseAdmin.from('messages')
            .select('role, content').eq('lead_phone', clientNumber)
            .order('created_at', { ascending: false }).limit(3);

        const chatLog = (history || []).reverse().map(m => `${m.role}: ${m.content}`).join('\n');

        const systemPrompt = `Você é Eliza, vendedora implacável. Analise o histórico e retorne APENAS um JSON.
{ "intent": "GREET" | "BUY" | "PAID", "reply": "Sua resposta em PT-BR (use || para bolhas)" }

HISTÓRICO:
${chatLog}`;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const { intent, reply } = JSON.parse(result.text || "{}");
        console.log(`🎯 Intent: ${intent}`);

        // --- ENVIO BLINDADO ---
        await sendWhatsAppPresence(clientNumber, 'composing');

        // Rota de texto (sendText)
        await sendWhatsAppMessage(clientNumber, reply, 1000);

        if (intent === "BUY") {
            console.log(`🖼️ Enviando mídia para ${clientNumber}`);
            await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
                method: 'POST',
                headers: {
                    'apikey': process.env.EVOLUTION_API_KEY!,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number: clientNumber, // Agora está limpo
                    mediaMessage: {
                        mediatype: "image",
                        caption: "Aqui está o QR Code! Denis e eu estamos prontos! 🐺🚀",
                        media: "https://i.imgur.com/ihpJUn7.jpeg"
                    }
                })
            });
        }

        await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber, role: 'assistant', content: reply, message_id: `eliza_${Date.now()}`
        });

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);

    } catch (error: any) {
        console.error("❌ [ELIZA ERROR]:", error.message);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

// 👂 WEBHOOK CORRIGIDO (LIMPEZA NA ENTRADA)
http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            res.writeHead(200); res.end();
            try {
                const payload = JSON.parse(body);
                const data = payload.data?.[0] || payload.data;
                if (!data?.key || data.key.fromMe) return;

                // Aqui limpamos o JID para pegar só os números reais
                const rawJid = data.key.remoteJid || "";
                const phone = rawJid.split('@')[0].replace(/\D/g, '');

                const msg = data.message?.conversation || data.message?.extendedTextMessage?.text || "";

                if (msg && phone.length <= 13) {
                    console.log(`📥 [MSG] ${phone}: ${msg}`);
                    await supabaseAdmin.from('messages').insert({
                        lead_phone: phone, role: 'user', content: msg, message_id: data.key.id
                    });
                    await supabaseAdmin.from('leads_lobo').upsert({
                        phone, status: 'eliza_processing', ai_paused: false
                    }, { onConflict: 'phone' });
                }
            } catch (e) { console.error("Webhook Error:", e); }
        });
        return;
    }
    res.writeHead(200); res.end('Online');
}).listen(process.env.PORT || 8080);