import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { normalizePhone } from '../../lib/utils/phone';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import http from 'http';

/**
 * ELIZA WORKER - FINAL PRODUCTION VERSION (SDK @google/genai)
 * Target Model: gemini-2.5-flash
 */

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
    console.error("⚠️ [CALENDAR] Aviso: GOOGLE_CREDENTIALS não configurado ou inválido no .env");
}
const calendar = google.calendar({ version: 'v3', auth: calendarAuth });

// ==============================================================
// 🔧 FUNCTION DECLARATIONS (Tools)
// ==============================================================
const functionDeclarations: any[] = [
    {
        name: 'save_lead_data',
        description: 'Saves lead info (name, company, pain point) to the database.',
        parameters: {
            type: 'OBJECT',
            properties: {
                phone: { type: 'STRING' },
                name: { type: 'STRING' },
                company: { type: 'STRING' },
                pain_point: { type: 'STRING' },
            },
            required: ['phone'],
        },
    },
    {
        name: 'notify_human_specialist',
        description: 'Alerts Denis when the lead is ready to buy or needs technical help.',
        parameters: {
            type: 'OBJECT',
            properties: {
                urgency_level: { type: 'STRING' },
                summary: { type: 'STRING' },
            },
            required: ['urgency_level', 'summary'],
        },
    },
    {
        name: 'check_calendar_availability',
        description: 'Verifica os horários ocupados na agenda para uma data específica.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date: { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
            },
            required: ['date'],
        },
    },
    {
        name: 'schedule_appointment',
        description: 'Agenda um compromisso na agenda do cliente.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date: { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
                time: { type: 'STRING', description: 'Hora no formato HH:MM' },
                client_name: { type: 'STRING', description: 'Nome do lead' },
                summary: { type: 'STRING', description: 'Assunto ou tipo de serviço' }
            },
            required: ['date', 'time', 'client_name'],
        },
    },
    {
        name: 'generatePagarmePix',
        description: 'Usa esta função quando o lead decidir comprar o produto Tier 1 (LP Express). Gera o PIX Copia e Cola.',
        parameters: {
            type: 'OBJECT',
            properties: {
                product_id: { type: 'STRING', description: "Sempre 'LP_EXPRESS'" },
                lead_email: { type: 'STRING', description: 'O e-mail do lead' },
                lead_name: { type: 'STRING', description: 'O nome do lead' }
            },
            required: ['product_id', 'lead_email', 'lead_name'],
        },
    },
    {
        name: 'verifyPagarmeOrder',
        description: 'Verifica se o lead já pagou o PIX gerado.',
        parameters: {
            type: 'OBJECT',
            properties: {
                order_id: { type: 'STRING', description: 'O ID do pedido gerado (ex: or_1234)' }
            },
            required: ['order_id'],
        },
    },
    {
        name: 'schedule_and_charge_deposit',
        description: 'Agenda a reunião no Google Calendar e imediatamente gera um PIX de 50% de depósito do serviço (Tier 2 ou Tier 3) para confirmar a reserva.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date: { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
                time: { type: 'STRING', description: 'Hora no formato HH:MM' },
                client_name: { type: 'STRING', description: 'Nome do lead' },
                client_email: { type: 'STRING', description: 'E-mail do lead' },
                service_tier: { type: 'STRING', description: 'O tipo de serviço', enum: ['TIER_2', 'TIER_3'] }
            },
            required: ['date', 'time', 'client_name', 'client_email', 'service_tier'],
        },
    }
];

async function executeToolCall(name: string, args: any, clientPhone: string): Promise<any> {
    console.log(`🔧 [TOOL EXECUTION]: ${name}`);
    if (name === 'save_lead_data') {
        await supabaseAdmin.from('leads_lobo').update({
            name: args.name,
            niche: args.company,
            main_pain: args.pain_point
        }).eq('phone', clientPhone);
        return { status: 'success' };
    }
    if (name === 'notify_human_specialist') {
        await supabaseAdmin.from('leads_lobo').update({ status: 'hot_lead' }).eq('phone', clientPhone);
        return { status: 'success', notification: 'Denis has been alerted.' };
    }
    if (name === 'schedule_and_charge_deposit') {
        console.log(`💸 [PIX/CALENDAR] Iniciando schedule_and_charge_deposit para ${args.client_name}`);
        try {
            // 1. Calcular o valor do depósito (50%)
            const amountCents = args.service_tier === 'TIER_3' ? 150000 : 50000;

            // 2. Gerar PIX no Pagar.me
            const pagarmePayload = {
                items: [{ amount: amountCents, description: `Depósito Inicial - ${args.service_tier}`, quantity: 1 }],
                customer: { name: args.client_name, email: args.client_email, type: 'individual', document: '00000000000' },
                payments: [{ payment_method: 'pix', pix: { expires_in: 86400 } }]
            };
            
            const pagarmeRes = await fetch('https://api.pagar.me/core/v5/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(process.env.PAGARME_SECRET_KEY + ':').toString('base64')}`
                },
                body: JSON.stringify(pagarmePayload)
            });
            const pagarmeData = await pagarmeRes.json();
            
            if (!pagarmeRes.ok) {
                console.error("❌ [PAGARME] Erro ao gerar PIX:", pagarmeData);
                return { status: "error", message: "Falha ao gerar o PIX. Avise que ocorreu um erro." };
            }
            
            const pixData = pagarmeData.charges?.[0]?.last_transaction?.qr_code;
            const orderId = pagarmeData.id;

            // 3. Agendar no Google Calendar
            const startTime = new Date(`${args.date}T${args.time}:00-03:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hora
            
            await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: `[PENDING PIX] Escopo ${args.client_name}`,
                    description: `Tier: ${args.service_tier}\nEmail: ${args.client_email}\nOrderID: ${orderId}\nTelefone: ${clientPhone}`,
                    start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                    end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
                }
            });
            
            console.log(`✅ [PIX/CALENDAR] Sucesso! Evento criado e PIX ${orderId} gerado.`);
            return {
                status: 'success',
                message: 'Horário reservado com sucesso e PIX gerado.',
                pix_qr_code: pixData,
                order_id: orderId,
                instructions: 'Apresente a chave PIX Copia e Cola ao lead e reforce que a reunião E a reserva de agenda só estão 100% garantidas após o pagamento.'
            };
        } catch (err: any) {
            console.error("❌ [PIX/CALENDAR] Exceção:", err.message);
            return { status: "error", message: err.message };
        }
    }

    if (name === 'verifyPagarmeOrder') {
        console.log(`🔍 [PAGARME] Verificando pedido ${args.order_id}`);
        try {
            const pagarmeRes = await fetch(`https://api.pagar.me/core/v5/orders/${args.order_id}`, {
                method: 'GET',
                headers: { 'Authorization': `Basic ${Buffer.from(process.env.PAGARME_SECRET_KEY + ':').toString('base64')}` }
            });
            const pagarmeData = await pagarmeRes.json();
            
            if (pagarmeData.status === 'paid') {
                 console.log(`✅ [PAGARME] Pedido ${args.order_id} PAGO! Removendo tag do calendário...`);
                 try {
                     const eventsRes = await calendar.events.list({
                         calendarId: 'primary',
                         q: args.order_id,
                         timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                     });
                     if (eventsRes.data.items && eventsRes.data.items.length > 0) {
                         const event = eventsRes.data.items[0];
                         if (event.summary && event.summary.includes('[PENDING PIX]')) {
                             const newSummary = event.summary.replace('[PENDING PIX]', '[CONFIRMADO]');
                             await calendar.events.patch({
                                 calendarId: 'primary',
                                 eventId: event.id!,
                                 requestBody: { summary: newSummary }
                             });
                             console.log(`✅ [CALENDAR] Tag [PENDING PIX] removida do evento ${event.id}`);
                         }
                     }
                 } catch (calErr) {
                     console.error("❌ [CALENDAR] Erro ao atualizar remoção da tag:", calErr);
                 }

                 await supabaseAdmin.from('leads_lobo').update({ status: 'hot_lead' }).eq('phone', clientPhone);
                 return { status: 'success', payment_status: 'paid', message: 'Pagamento confirmado! Reserva garantida na agenda.' };
            } else {
                 console.log(`⏳ [PAGARME] Pedido pendente (${pagarmeData.status}).`);
                 return { status: 'pending', payment_status: pagarmeData.status, message: 'O pagamento ainda não foi identificado. Peça para o cliente avisar quando pagar.' };
            }
        } catch(err: any) {
            console.error("❌ [PAGARME] Erro na verificação:", err.message);
            return { status: 'error', message: err.message };
        }
    }

    return { status: 'error', message: 'Tool not found' };
}

// ==============================================================
// 🧠 LEAD PROCESSING LOGIC
// ==============================================================
async function processLead(lead: any) {
    const clientNumber = lead.phone;
    console.log(`\n===========================================`);
    console.log(`🧠 [ELIZA] Processing Lead: ${clientNumber}`);

    try {
        // 1. Lock lead status
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        // 2. Load context and history
        const contextPath = path.join(process.cwd(), 'business_context.json');
        const businessContext = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf8') : '';

        const { data: rawHistory } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: true })
            .limit(20);

        let chatHistory = rawHistory || [];
        let currentMessage = "Olá";

        // CORREÇÃO DA AMNÉSIA: Remove a última mensagem do array de histórico
        // e a define como a mensagem atual que será enviada para a IA responder.
        if (chatHistory.length > 0) {
            const lastRecord = chatHistory.pop();
            if (lastRecord) currentMessage = lastRecord.content;
        }

        // 3. Initialize New Google GenAI SDK
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });

        const systemInstruction = `You are Eliza, SDR at meatende.ai. Responses must be in Natural PT-BR. Use '||' to split messages.

### THE CALENDAR HAND-OFF
Quando o lead aceitar agendar a reunião de escopo (obrigatório para Tier 2 e Tier 3), você DEVE obrigatoriamente:
1. Pedir o **e-mail** do lead imediatamente.
2. Assim que receber o e-mail, invoque a ferramenta 'schedule_and_charge_deposit'.
3. Avise o lead que o horário foi pré-reservado, apresente o PIX e deixe claro que a reunião SÓ está garantida após o pagamento deste depósito.

Context: ${businessContext}`;

        // 4. Create Chat Session (Apenas com o PASSADO)
        const chat = ai.chats.create({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations }] as any,
            },
            history: chatHistory.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            })),
        });

        console.log(`⏳ Calling Gemini API com a mensagem: "${currentMessage}"`);
        let result = await chat.sendMessage({ message: currentMessage });

        // 5. Tool Loop (Function Calling)
        let loopCount = 0;
        while (result.functionCalls && result.functionCalls.length > 0 && loopCount < 3) {
            loopCount++;
            const toolResults = [];
            for (const call of result.functionCalls) {
                const output = await executeToolCall(call.name || '', call.args, clientNumber);
                toolResults.push({ functionResponse: { name: call.name, response: output } });
            }
            result = await chat.sendMessage({ functionResponse: toolResults } as any);
        }

        const responseText = result.text || '';

        // 6. Split into bubbles with explicit typing
        const chunks = responseText.split('||')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);

        console.log('📤 Sending chunks to WhatsApp:', chunks);

        await sendWhatsAppPresence(clientNumber, 'composing');

        console.log('📤 Sending chunks to WhatsApp:', chunks);
        await sendWhatsAppPresence(clientNumber, 'composing');

        const CHARS_PER_SECOND = 15;
        let accumulatedDelayMs = 0;

        for (const chunk of chunks) {
            // Calcula o tempo de "digitação" baseado no tamanho da bolha (mínimo 2s, máximo 12s)
            const bubbleTypingTimeMs = Math.max(2000, Math.min((chunk.length / CHARS_PER_SECOND) * 1000, 12000));
            accumulatedDelayMs += bubbleTypingTimeMs;

            console.log(`⌨️ [TYPING] Bolha enviada em ${Math.round(accumulatedDelayMs / 1000)}s: "${chunk.substring(0, 30)}..."`);
            await sendWhatsAppMessage(clientNumber, chunk, accumulatedDelayMs);

            // Adiciona uma pausa humana de respiração/leitura entre bolhas múltiplas
            if (chunks.length > 1) {
                const pauseBetweenBubbles = Math.floor(Math.random() * (2500 - 1000 + 1)) + 1000;
                accumulatedDelayMs += pauseBetweenBubbles;
            }
        }

        // 7. Save and Release
        await supabaseAdmin.from('messages').insert({
            lead_phone: clientNumber,
            role: 'assistant',
            content: responseText
        });

        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
        console.log(`✅ [ELIZA] Success for ${clientNumber}`);

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
// 🌐 RAILWAY HEALTHCHECK & WEBHOOK SERVER (FULL LOGIC)
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
                // 1. Libera a Evolution API na hora (Fim do Timeout)
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'received' }));

                const body = JSON.parse(bodyStr);
                const isEvolution = body.event === 'MESSAGES_UPSERT' || body.event === 'messages.upsert';

                if (!isEvolution) return;

                let dataObj = Array.isArray(body.data) ? body.data[0] : body.data;
                if (!dataObj) return;

                const remoteJid = dataObj.key?.remoteJid || '';
                if (remoteJid.endsWith('@g.us')) {
                    console.log('🔇 [WEBHOOK] Grupo ignorado:', remoteJid);
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
                    // --- LÓGICA DE ÁUDIO ---
                    if (messageObj.audioMessage) {
                        if (isFromMe) return;

                        const { data: lead } = await supabaseAdmin
                            .from('leads_lobo')
                            .select('ai_paused, needs_human')
                            .eq('phone', clientNumber)
                            .maybeSingle();

                        if (lead && (lead.ai_paused === true || lead.needs_human === true)) {
                            console.log(`🛑 [SILICON TWEAK] Eliza silenciada para áudio de ${clientNumber}.`);
                            return;
                        }

                        console.log("🎙️ [WEBHOOK] Audio detectado. Acionando Background via QStash.");
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
                            console.error("❌ Erro no QStash:", err);
                            await sendWhatsAppPresence(clientNumber, 'available');
                        }
                        return;
                    }

                    if (!messageObj.conversation && !messageObj.extendedTextMessage) {
                        return; // Ignora outras mídias
                    }
                    clientMessage = messageObj.conversation || messageObj.extendedTextMessage?.text || '';
                }

                if (clientMessage && clientMessage.trim().length > 0) {
                    // --- LÓGICA DE ADMIN / SILENT HANDOFF ---
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
                        if (isAPI) {
                            return; // Ignora mensagens enviadas pela própria Eliza
                        } else {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                            console.log(`👤 [SILENT HANDOFF] Denis assumiu o chat. IA pausada para ${clientNumber}.`);
                            return;
                        }
                    }

                    console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);

                    // --- BLINDAGENS DE SEGURANÇA ---
                    const autoReplyKeywords = ['bem-vindo', 'digite 1', 'mensagem automática', 'em breve retornaremos'];
                    const msgLower = clientMessage.toLowerCase();
                    if (autoReplyKeywords.some(kw => msgLower.includes(kw))) {
                        console.log(`🛡️ [SHIELD] Auto-reply (Keywords). Ignorando.`);
                        return;
                    }

                    let { data: lead } = await supabaseAdmin.from('leads_lobo').select('*').eq('phone', clientNumber).maybeSingle();

                    if (lead) {
                        await supabaseAdmin.from('leads_lobo').update({ replied: true }).eq('phone', clientNumber);

                        if (lead.updated_at) {
                            const timeSinceContact = Date.now() - new Date(lead.updated_at).getTime();
                            if (timeSinceContact < 2000) {
                                console.log(`🛡️ [SHIELD] Auto-reply (Rápido demais). Ignorando.`);
                                return;
                            }
                        }

                        if ((lead.reply_count || 0) >= 10) {
                            console.log(`🚨 [CIRCUIT BREAKER] Bot Loop. Travando ${clientNumber}.`);
                            await supabaseAdmin.from('leads_lobo').update({ is_locked: true, status: 'needs_human', ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                            return;
                        }

                        if (lead.is_locked === true || lead.ai_paused === true || lead.needs_human === true) {
                            console.log(`🔒 Lead travado ou com humano. Ignorando.`);
                            return;
                        }
                    }

                    if (!lead) {
                        const { data: newLead } = await supabaseAdmin.from('leads_lobo').insert({
                            phone: clientNumber, status: 'organic_inbound', name: 'Lead inbound', message_buffer: '', is_processing: false
                        }).select().single();
                        lead = newLead;
                    }

                    // --- SALVAMENTO E GATILHO ---
                    await supabaseAdmin.from('messages').insert({
                        lead_phone: clientNumber, role: 'user', content: clientMessage, message_id: incomingMessageId
                    });

                    const { data: elizaSwitch } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'eliza_active').single();
                    if (elizaSwitch && elizaSwitch.value?.enabled === false) {
                        await supabaseAdmin.from('leads_lobo').update({ status: 'needs_human', needs_human: true }).eq('phone', clientNumber);
                        return;
                    }

                    await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_processing' }).eq('phone', clientNumber);
                    console.log(`🎯 [WEBHOOK] Status de ${clientNumber} -> 'eliza_processing'. Worker assumindo.`);
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