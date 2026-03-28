import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import http from 'http';

// Inicialização correta para o SDK Unificado
const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

const MODEL_NAME = "gemini-3.1-flash-preview";

// ==============================================================
// 🧠 LEAD PROCESSING LOGIC (LOBO MVP - FIXED SCOPE)
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    console.log(`\n===========================================`);
    console.log(`🚀 [ELIZA LOBO] Fissurada no Fechamento: ${clientNumber}`);

    try {
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // Busca histórico curto para evitar loops de memória
        const { data: rawHistory } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: false })
            .limit(5);

        const chatHistory = rawHistory ? rawHistory.reverse() : [];
        const transcript = chatHistory.map(m => `${m.role === 'assistant' ? 'Eliza' : 'Client'}: ${m.content}`).join('\n');

        const systemPrompt = `# IDENTITY
You are Eliza, a results-obsessed Sales Assistant for Denis at meatende.ai.
Your energy is like the Wolf of Wall Street: extremely polite, professional, but RELENTLESS in helping the client get results NOW.

# MISSION
Your ONLY goal is to close the sale of the "LP Express" for R$ 499 or the AI Agent Setup for R$ 500.
Review the <transcript> and determine the next action.

# STATE MACHINE (STRICT)
- GREET: If the client just said "hi" or hasn't committed yet. Output an energetic pitch.
- BUY: If the client said "yes", "sim", "quero", "pix", or showed intent. Output intent:BUY + the PIX key (02959474031) and instructions for the receipt.
- PAID: If the client sent an image or says they paid. Output intent:PAID.

# OUTPUT RULES
You MUST output a valid JSON ONLY:
{
  "intent": "GREET" | "BUY" | "PAID",
  "reply": "Your energetic, professional response in PT-BR (use '||' for bubbles)"
}

<transcript>
${transcript}
</transcript>`;

        console.log(`⏳ Chamando Gemini 3.1 Flash Preview...`);

        // No SDK unificado, o acesso é via ai.models.generateContent
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const resultData = JSON.parse(response.text || "{}");
        const elizaReply = resultData.reply || "Vamos fechar essa LP?";
        const intent = resultData.intent || "GREET";

        console.log(`🎯 Intent Detectada: ${intent}`);

        // --- GATILHO DE MÍDIA (PIX ARTESANAL) ---
        if (intent === "BUY") {
            console.log(`🖼️ [MEDIA] Enviando QR Code para ${clientNumber}`);
            await fetch(`${process.env.EVOLUTION_URL}/message/sendMedia/${process.env.EVOLUTION_INSTANCE}`, {
                method: 'POST',
                headers: {
                    'apikey': process.env.EVOLUTION_API_KEY!,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number: clientNumber,
                    mediaMessage: {
                        mediatype: "image",
                        caption: "Aqui está o QR Code! Denis e eu estamos prontos para começar. 🐺🚀",
                        media: "https://i.imgur.com/ihpJUn7.jpeg"
                    }
                })
            });
        }

        // --- ENVIO WHATSAPP DIRETO ---
        await sendWhatsAppPresence(clientNumber, 'composing');
        await sendWhatsAppMessage(clientNumber, elizaReply, 1500);

        // Salva memória e encerra
        await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber,
            role: 'assistant',
            content: elizaReply,
            message_id: `eliza_${Date.now()}`
        });

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
        console.log(`✅ [SUCCESS] Ciclo completo para ${clientNumber}`);

    } catch (error: any) {
        console.error("❌ [ELIZA ERROR]:", error.message);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

// ==============================================================
// 🔄 POLLING & SERVER (MANTENHA O RESTANTE IGUAL)
// ==============================================================
async function startPolling() {
    console.log(`🔄 [${MODEL_NAME}] Eliza Ativa...`);
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

const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Eliza Worker Online');
}).listen(PORT);

startPolling();