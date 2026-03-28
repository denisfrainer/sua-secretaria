import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import http from 'http';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });
const MODEL_NAME = "gemini-2.5-flash"; // Use 1.5-flash para estabilidade ou o 3.1 se já tiver acesso liberado

// ==============================================================
// 🧠 LÓGICA DE PROCESSAMENTO (CLASSIFICADOR LOBO)
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;

    try {
        // 1. Marca como analisando para não processar em dobro
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // 2. Busca histórico ultra-curto (Cegueira Seletiva anti-loop)
        const { data: history } = await supabaseAdmin.from('messages')
            .select('role, content').eq('lead_phone', clientNumber)
            .order('created_at', { ascending: false }).limit(3);

        const chatLog = (history || []).reverse().map(m => `${m.role}: ${m.content}`).join('\n');

        const systemPrompt = `Você é um classificador de intenções ultra-rápido.
Analise o histórico abaixo e decida o próximo passo para vender a LP Express por R$ 499.

REGRAS:
- Se o cliente quer comprar/pix/valor: responda JSON { "intent": "BUY", "reply": "TEXTO_COM_PIX" }
- Se o cliente mandou comprovante: responda JSON { "intent": "PAID", "reply": "TEXTO_VALIDANDO" }
- Caso contrário: responda JSON { "intent": "GREET", "reply": "PITCH_DE_VENDAS" }

HISTÓRICO:
${chatLog}

Responda APENAS o JSON.`;

        const result = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const { intent, reply } = JSON.parse(result.text || "{}");

        // 3. Execução do Fechamento
        if (intent === "BUY") {
            // Manda o texto do PIX
            await sendWhatsAppMessage(clientNumber, reply + " || Chave: 02959474031", 1000);

            // Manda a Imagem do QR Code (Ajuste a URL se necessário)
            await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
                method: 'POST',
                headers: { 'apikey': process.env.EVOLUTION_API_KEY!, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: clientNumber,
                    mediaMessage: {
                        mediatype: "image",
                        caption: "QR Code para seu pagamento! 🐺🚀",
                        media: "https://i.imgur.com/ihpJUn7.jpeg"
                    }
                })
            });
        } else {
            await sendWhatsAppMessage(clientNumber, reply, 1000);
        }

        // 4. Salva memória e finaliza ciclo
        await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber, role: 'assistant', content: reply, message_id: `eliza_${Date.now()}`
        });

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);

    } catch (error) {
        console.error("❌ Erro no ProcessLead:", error);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

// ==============================================================
// 👂 WEBHOOK ROBUSTO (O GATILHO)
// ==============================================================
const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
            res.writeHead(200); res.end();
            try {
                const payload = JSON.parse(body);
                // Captura mensagens tanto de upsert quanto de events
                const data = payload.data?.[0] || payload.data;
                if (!data?.key || data.key.fromMe) return;

                const rawJid = data.key.remoteJid;
                const phone = normalizePhone(rawJid);
                const msg = data.message?.conversation || data.message?.extendedTextMessage?.text || "";

                if (msg) {
                    console.log(`📥 [MSG] ${phone}: ${msg}`);
                    // Salva a mensagem do usuário
                    await supabaseAdmin.from('messages').insert({
                        lead_phone: phone, role: 'user', content: msg, message_id: data.key.id
                    });
                    // Ativa o processamento pelo Worker
                    await supabaseAdmin.from('leads_lobo').upsert({
                        phone, status: 'eliza_processing', ai_paused: false
                    });
                }
            } catch (e) { console.error("Erro Webhook:", e); }
        });
    } else {
        res.writeHead(200); res.end('Eliza Online');
    }
});

// ==============================================================
// 🔄 MOTOR DE POLLING
// ==============================================================
async function startPolling() {
    console.log('🔄 Eliza Ativa e Monitorando...');
    while (true) {
        try {
            const { data: leads } = await supabaseAdmin.from('leads_lobo')
                .select('*').eq('status', 'eliza_processing').eq('ai_paused', false).limit(1);

            if (leads && leads.length > 0) {
                await processLead(leads[0]);
            }
        } catch (e) { console.error("Erro Polling:", e); }
        await new Promise(r => setTimeout(r, 4000));
    }
}

server.listen(process.env.PORT || 8080);
startPolling();