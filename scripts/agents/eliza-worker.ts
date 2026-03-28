import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import http from 'http';

/**
 * ELIZA WORKER - MVP LOBO VERSION
 * Target Model: gemini-3.1-flash-preview
 */

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

const MODEL_NAME = "gemini-3.1-flash-preview";

// ==============================================================
// 🧠 LÓGICA DE PROCESSAMENTO (DECISOR DE FECHAMENTO)
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    console.log(`\n🚀 [ELIZA LOBO] Processando: ${clientNumber}`);

    try {
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // 1. Puxar histórico curto (Cegueira seletiva para evitar loops)
        const { data: rawHistory } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: false })
            .limit(5);

        const chatHistory = rawHistory ? rawHistory.reverse() : [];
        const transcript = chatHistory.map(m => `${m.role === 'assistant' ? 'Eliza' : 'Client'}: ${m.content}`).join('\n');

        // 2. Prompt "Fissurado" no Fechamento
        const systemPrompt = `# IDENTITY
You are Eliza, a results-obsessed Tech Assistant to Denis at meatende.ai.
Tone: Wolf of Wall Street. Professional, energetic, and 100% focused on closing the deal NOW.

# MISSION
Your ONLY goal is to sell the "LP Express" for R$ 499. 
Review the <transcript> and determine the intent.

# INTENT RULES
- GREET: Client just said hi or hasn't committed. Action: Energetic pitch.
- BUY: Client said "yes", "sim", "quero", "pix". Action: Send PIX key 02959474031 and ask for receipt.
- PAID: Client says they paid or sent image. Action: Acknowledge and state Denis is checking.

# OUTPUT FORMAT
You MUST output ONLY a JSON object:
{
  "intent": "GREET" | "BUY" | "PAID",
  "reply": "Your energetic response in PT-BR (use '||' for bubbles)"
}

<transcript>
${transcript}
</transcript>`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const resultData = JSON.parse(response.text || "{}");
        const elizaReply = resultData.reply || "Vamos fechar essa LP agora? 🚀";
        const intent = resultData.intent || "GREET";

        // 3. Execução das Ações
        await sendWhatsAppPresence(clientNumber, 'composing');

        if (intent === "BUY") {
            await sendWhatsAppMessage(clientNumber, elizaReply, 1000);
            // Gatilho de QR Code artesanal
            await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
                method: 'POST',
                headers: { 'apikey': process.env.EVOLUTION_API_KEY!, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: clientNumber,
                    mediaMessage: {
                        mediatype: "image",
                        caption: "Aqui está o QR Code! 🐺🚀",
                        media: "https://i.imgur.com/ihpJUn7.jpeg"
                    }
                })
            });
        } else {
            await sendWhatsAppMessage(clientNumber, elizaReply, 1000);
        }

        // 4. Salvar Memória e Finalizar
        await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber,
            role: 'assistant',
            content: elizaReply,
            message_id: `eliza_${Date.now()}`
        });

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
        console.log(`✅ [SUCCESS] Ciclo completo.`);

    } catch (error: any) {
        console.error("❌ [ELIZA ERROR]:", error.message);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

// ==============================================================
// 🔄 POLLING ENGINE
// ==============================================================
async function startPolling() {
    console.log(`🔄 [${MODEL_NAME}] Worker Ativo...`);
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
        await new Promise(r => setTimeout(r, 4000));
    }
}

// ==============================================================
// 🌐 WEBHOOK SERVER (MANTENDO SUA LÓGICA ESTÁVEL)
// ==============================================================
const PORT = process.env.PORT || 8080;

http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });
        req.on('end', async () => {
            res.writeHead(200);
            res.end();
            try {
                const body = JSON.parse(bodyStr);
                const isEvolution = body.event === 'MESSAGES_UPSERT' || body.event === 'messages.upsert';
                if (!isEvolution) return;

                let dataObj = Array.isArray(body.data) ? body.data[0] : body.data;
                if (!dataObj || !dataObj.key || dataObj.key.fromMe) return;

                const clientNumber = normalizePhone(dataObj.key.remoteJid);
                const messageObj = dataObj.message;
                const clientMessage = messageObj?.conversation || messageObj?.extendedTextMessage?.text || '';

                if (clientMessage) {
                    await supabaseAdmin.from('messages').insert({
                        lead_phone: clientNumber, role: 'user', content: clientMessage, message_id: dataObj.key.id
                    });
                    await supabaseAdmin.from('leads_lobo').upsert({
                        phone: clientNumber, status: 'eliza_processing', ai_paused: false
                    }, { onConflict: 'phone' });
                }
            } catch (error) {
                console.error('❌ [WEBHOOK CRASH]:', error);
            }
        });
        return;
    }
    res.writeHead(200);
    res.end('Online');
}).listen(PORT);

startPolling();