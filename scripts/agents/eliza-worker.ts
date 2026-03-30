import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import http from 'http';

/**
 * ELIZA WORKER - MVP CLÍNICA/ESTÉTICA (SDK @google/genai)
 * Target Model: gemini-2.5-flash
 */

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });
process.env.TZ = 'America/Sao_Paulo';

// ==============================================================
// 📅 GOOGLE CALENDAR SETUP
// ==============================================================
let calendarAuth: any;
try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
    calendarAuth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/calendar']
    });
} catch (error) {
    console.error("⚠️ [CALENDAR] Aviso: GOOGLE_CREDENTIALS não configurado.");
}
const calendar = google.calendar({ version: 'v3', auth: calendarAuth });

// ==============================================================
// 🔧 FUNCTION DECLARATIONS (Tools do MVP)
// ==============================================================
const functionDeclarations: any[] = [
    {
        name: 'check_calendar_availability',
        description: 'Verifica os horários OCUPADOS na agenda para uma data específica.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date: { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
            },
            required: ['date'],
        },
    },
    {
        name: 'schedule_appointment_and_request_pix',
        description: 'Pré-agenda um compromisso e retorna a chave PIX estática para a IA enviar à cliente.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date: { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
                time: { type: 'STRING', description: 'Hora no formato HH:MM' },
                client_name: { type: 'STRING', description: 'Nome do lead/cliente' },
                service_type: { type: 'STRING', description: 'Serviço escolhido (Ex: Unha de Gel, Depilação)' }
            },
            required: ['date', 'time', 'client_name', 'service_type'],
        },
    },
    {
        name: 'notify_human_specialist',
        description: 'Pausa a IA e chama a dona da clínica para assumir o atendimento.',
        parameters: {
            type: 'OBJECT',
            properties: { summary: { type: 'STRING' } },
            required: ['summary'],
        },
    }
];

async function executeToolCall(name: string, args: any, clientPhone: string): Promise<any> {
    console.log(`🔧 [TOOL EXECUTION]: ${name} | Args:`, args);

    if (name === 'notify_human_specialist') {
        await supabaseAdmin.from('leads_lobo').update({ status: 'needs_human', ai_paused: true }).eq('phone', clientPhone);
        return { status: 'success', notification: 'A dona da clínica foi notificada e assumirá em breve.' };
    }

    if (name === 'check_calendar_availability') {
        try {
            const startOfDay = new Date(`${args.date}T00:00:00-03:00`);
            const endOfDay = new Date(`${args.date}T23:59:59-03:00`);

            const events = await calendar.events.list({
                calendarId: 'primary',
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const busySlots = (events.data.items || []).map(e => ({
                inicio: new Date(e.start?.dateTime || '').toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                fim: new Date(e.end?.dateTime || '').toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            }));

            return { status: 'success', data: args.date, horarios_ocupados: busySlots };
        } catch (error: any) {
            console.error("❌ [CALENDAR CHECK ERROR]:", error.message);
            return { status: 'error', message: 'Não foi possível checar a agenda no momento.' };
        }
    }

    if (name === 'schedule_appointment_and_request_pix') {
        try {
            const startTime = new Date(`${args.date}T${args.time}:00-03:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Assume 1 hora de serviço por padrão

            await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: `[AGUARDANDO PIX] ${args.client_name} - ${args.service_type}`,
                    description: `Telefone: ${clientPhone}\nAguardando envio do comprovante no WhatsApp.`,
                    start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                    end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                }
            });

            // CHAVE PIX ESTÁTICA DO SEU CLIENTE (Configure no Painel ou deixe fixo no MVP)
            const CHAVE_PIX_CLINICA = process.env.CHAVE_PIX_ESTATICA || "CNPJ: 00.000.000/0001-00";

            return {
                status: 'success',
                message: 'Horário pré-reservado no Google Calendar.',
                chave_pix_para_pagamento: CHAVE_PIX_CLINICA,
                instructions: 'Forneça a chave PIX acima para a cliente e diga que o horário está pré-reservado. Peça para ela enviar a FOTO DO COMPROVANTE aqui no chat para a dona da clínica confirmar a vaga em definitivo.'
            };
        } catch (err: any) {
            console.error("❌ [CALENDAR SCHEDULE ERROR]:", err.message);
            return { status: "error", message: 'Falha ao agendar o horário.' };
        }
    }

    return { status: 'error', message: 'Tool not found.' };
}

// ==============================================================
// 🧠 LEAD PROCESSING LOGIC (O Cérebro da IA)
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    console.log(`\n===========================================`);
    console.log(`🧠 [ELIZA MVP] Processing Lead: ${clientNumber}`);

    try {
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // Carrega o Banco de Dados da Clínica (Preços, Endereço, etc)
        const contextPath = path.join(process.cwd(), 'business_context.json');
        const businessContext = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf8') : 'INFORMAÇÃO: Base de dados não encontrada.';

        const { data: rawHistory } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: true })
            .limit(20);

        let chatHistory = rawHistory || [];
        let currentMessage = "Olá";
        let historyForGemini: any[] = [];

        if (chatHistory.length > 0) {
            const lastMsg = chatHistory.pop();
            currentMessage = lastMsg?.content || "Olá";
            historyForGemini = chatHistory;
        }

        const systemInstruction = `# 1. IDENTIDADE DA ASSISTENTE
Você é a Eliza, Recepcionista Virtual da clínica/salão. Seu objetivo é tirar dúvidas, apresentar serviços e agendar clientes.
RESPONDA EXCLUSIVAMENTE EM PORTUGUÊS BRASILEIRO NATURAL.

# 2. REGRAS ESTRITAS
- NUNCA invente serviços ou preços.
- NUNCA envie uma lista gigante de preços. Diagnostique o que a cliente quer primeiro.
- NUNCA use gerundismo (ex: "vou estar verificando").
- MÁXIMO DE 2 BOLHAS POR RESPOSTA. Use "||" para dividir mensagens.
- BOTÃO DE EMERGÊNCIA: Se a dúvida for complexa, envie "[HANDOFF_TRIGGERED]" e diga que a dona vai assumir.

# 3. FUNIL DE AGENDAMENTO
Passo 1: Entenda o serviço desejado.
Passo 2: Use a tool check_calendar_availability para ver horários. Ofereça opções baseadas nos 'horarios_ocupados'.
Passo 3: Quando a cliente escolher a hora, use schedule_appointment_and_request_pix.
Passo 4: Entregue a chave PIX e diga: "Para garantir esse horário exclusivo pra você, faz o PIX do sinal e me manda o comprovante aqui."

# 4. CONTEXTO DO NEGÓCIO (Horários, Preços, Endereço)
${businessContext}
`;

        const chat = ai.chats.create({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations }] as any,
                temperature: 0.3
            },
            history: historyForGemini.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            })),
        });

        console.log(`⏳ Calling Gemini API...`);
        let result = await chat.sendMessage({ message: currentMessage });

        let loopCount = 0;
        while (result.functionCalls && result.functionCalls.length > 0 && loopCount < 3) {
            loopCount++;
            const functionResponseParts: any[] = [];

            for (const call of result.functionCalls) {
                const output = await executeToolCall(call.name || '', call.args, clientNumber);
                functionResponseParts.push({
                    functionResponse: { name: call.name, response: output }
                });
            }

            result = await chat.sendMessage({ role: 'user', parts: functionResponseParts } as any);
        }

        const responseText = result.text || '';
        const chunks = responseText.split('||').map((c: string) => c.trim()).filter((c: string) => c.length > 0);

        // --- HANDOFF ---
        if (responseText.includes("[HANDOFF_TRIGGERED]")) {
            console.log(`🚨 [HANDOFF] Pausando IA para o lead: ${clientNumber}`);
            const cleanResponse = responseText.replace("[HANDOFF_TRIGGERED]", "").trim();
            chunks.length = 0;
            chunks.push(cleanResponse);
            await supabaseAdmin.from('leads_lobo').update({ needs_human: true, ai_paused: true }).eq('phone', clientNumber);
        }

        await sendWhatsAppPresence(clientNumber, 'composing');

        let accumulatedDelayMs = 0;
        for (const chunk of chunks) {
            const bubbleTypingTimeMs = Math.max(2000, Math.min((chunk.length / 15) * 1000, 10000));
            accumulatedDelayMs += bubbleTypingTimeMs;

            console.log(`⌨️ [TYPING] Bolha em ${Math.round(accumulatedDelayMs / 1000)}s: "${chunk.substring(0, 30)}..."`);
            await sendWhatsAppMessage(clientNumber, chunk, accumulatedDelayMs);

            if (chunks.length > 1) accumulatedDelayMs += Math.floor(Math.random() * 1500) + 1000;
        }

        await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber, role: 'assistant', content: responseText, message_id: `eliza_${Date.now()}`
        });

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
        console.log(`✅ [ELIZA] Atendimento concluído para ${clientNumber}`);

    } catch (error: any) {
        console.error("❌ [ELIZA ERROR]:", error.message);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

// ==============================================================
// 🔄 POLLING ENGINE
// ==============================================================
async function startPolling() {
    console.log('🔄 [WORKER] Escutando leads pendentes...');
    while (true) {
        try {
            const { data: leads } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('status', 'eliza_processing')
                .eq('ai_paused', false)
                .limit(1);

            if (leads && leads.length > 0) await processLead(leads[0]);
        } catch (e) { console.error("Polling error:", e); }
        await new Promise(r => setTimeout(r, 3000));
    }
}

// ==============================================================
// 🌐 WEBHOOK SERVER
// ==============================================================
const PORT = process.env.PORT || 8080;

http.createServer((req, res) => {
    if (req.method === 'GET') { res.writeHead(200); res.end('Eliza MVP Online'); return; }

    if (req.method === 'POST' && req.url === '/webhook') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk.toString(); });

        req.on('end', async () => {
            try {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'received' }));

                const body = JSON.parse(bodyStr);
                const isEvolution = body.event === 'MESSAGES_UPSERT' || body.event === 'messages.upsert';
                if (!isEvolution) return;

                let dataObj = Array.isArray(body.data) ? body.data[0] : body.data;
                if (!dataObj?.key || dataObj.key.remoteJid.endsWith('@g.us')) return;

                const clientNumber = normalizePhone(dataObj.key.remoteJid);
                const messageObj = dataObj.message;

                // 📸 MVP SILICON TWEAK: Se a cliente mandar FOTO do PIX, trava a IA e avisa a dona
                if (messageObj?.imageMessage) {
                    console.log(`📸 [COMPROVANTE] Imagem recebida de ${clientNumber}. Acionando Humano.`);
                    await supabaseAdmin.from('leads_lobo').update({ needs_human: true, ai_paused: true }).eq('phone', clientNumber);

                    // Salva no banco e responde automático confirmando recebimento
                    await supabaseAdmin.from('messages').insert({ lead_phone: clientNumber, role: 'user', content: "[IMAGEM ENVIADA PELO CLIENTE]", message_id: dataObj.key.id });
                    await sendWhatsAppMessage(clientNumber, "📸 Comprovante recebido! A recepção vai conferir rapidinho e confirmar sua reserva definitiva, tá bom? Só um instante.");
                    return;
                }

                const clientMessage = messageObj?.conversation || messageObj?.extendedTextMessage?.text || '';
                if (!clientMessage) return;

                // --- Lógica de Pausa Manual (Admin) ---
                if (dataObj.key.fromMe) {
                    if (clientMessage.trim() === '/pausar') await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                    if (clientMessage.trim() === '/retomar') await supabaseAdmin.from('leads_lobo').update({ ai_paused: false, needs_human: false }).eq('phone', clientNumber);
                    if (!dataObj.key.id?.startsWith('eliza_')) await supabaseAdmin.from('leads_lobo').update({ ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                    return;
                }

                // --- Inserção Simples no Banco ---
                let { data: lead } = await supabaseAdmin.from('leads_lobo').select('*').eq('phone', clientNumber).maybeSingle();
                if (lead?.is_locked || lead?.ai_paused) return; // Se estiver pausado ou travado, ignora.

                if (!lead) {
                    const { data: newLead } = await supabaseAdmin.from('leads_lobo').insert({ phone: clientNumber, status: 'organic_inbound', name: 'Lead' }).select().single();
                    lead = newLead;
                }

                await supabaseAdmin.from('messages').insert({ lead_phone: clientNumber, role: 'user', content: clientMessage, message_id: dataObj.key.id });
                await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_processing', replied: true }).eq('phone', clientNumber);

            } catch (error) { console.error('❌ [WEBHOOK CRASH]:', error); }
        });
        return;
    }
    res.writeHead(404); res.end();
}).listen(PORT, () => console.log(`🌐 Eliza MVP Webhook Server rodando na porta ${PORT}`));

startPolling();