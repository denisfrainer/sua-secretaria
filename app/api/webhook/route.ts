// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../../lib/whatsapp/sender';
import { GoogleGenAI, Type } from '@google/genai';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { generatePrompt } from '../../../lib/agent/prompt';
import { normalizePhone } from '../../../lib/utils/phone';
import path from 'path';
import fs from 'fs';

// ==============================================================
// 📡 WEBHOOK HANDLER
// ==============================================================
export async function POST(req: Request) {
    let processingPhone = null; // Para cleanup no finally

    // QStash requires absolute HTTPS URLs
    const rawSiteUrl = process.env.WOLF_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'wolfagent.netlify.app';
    const siteBaseUrl = rawSiteUrl.startsWith('http')
        ? rawSiteUrl.replace(/\/$/, '')
        : `https://${rawSiteUrl.replace(/\/$/, '')}`;

    // 🔴 GLOBAL KILL SWITCH CHECK
    const { data: killSwitchData } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'global_kill_switch')
        .single();

    if (killSwitchData && killSwitchData.value?.enabled === false) {
        console.log(`[KILL SWITCH] System disabled. Execution blocked.`);
        return NextResponse.json({ status: 'system_paused' }, { status: 200 });
    }

    try {
        const body = await req.json();
        console.log("FULL EVOLUTION BODY:", JSON.stringify(body, null, 2));

        // 1. Filtro e Extração de Mensagem (Evolution API v2 e fallback antigo)
        let clientNumber = null;
        let clientMessage = null;
        let incomingMessageId = null;
        let isValidMessage = false;

        const isEvolution = body.event === 'MESSAGES_UPSERT' || body.event === 'messages.upsert';

        if (isEvolution) {
            let dataObj = body.data;
            // Evolution API v2 sometimes sends data as an array.
            if (Array.isArray(body.data)) {
                dataObj = body.data[0];
            }

            const remoteJid = dataObj?.key?.remoteJid || '';
            if (remoteJid.endsWith('@g.us')) {
                console.log('🔇 [WEBHOOK] Grupo ignorado:', remoteJid);
                return new NextResponse('Ignore Group', { status: 200 });
            }

            if (dataObj?.key) {
                const isFromMe = dataObj.key.fromMe === true;

                // Ensure clientNumber is extracted from the correct field prioritizing the real phone number (remoteJidAlt vs LID)
                const rawJid = (dataObj.key.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net'))
                    ? String(dataObj.key.remoteJidAlt)
                    : String(dataObj.key.remoteJid);

                clientNumber = normalizePhone(rawJid);
                incomingMessageId = dataObj.key.id;

                const messageObj = dataObj.message;
                if (messageObj) {
                    if (messageObj.audioMessage) {
                        console.log("🎙️ [WEBHOOK] Audio detectado. Acionando Background via QStash.");

                        await sendWhatsAppPresence(clientNumber, 'recording_audio');

                        const { Client } = await import('@upstash/qstash');
                        const qstash = new Client({
                            token: process.env.QSTASH_TOKEN!,
                            baseUrl: "https://qstash-us-east-1.upstash.io"
                        });

                        // Fire and forget background trigger via QStash
                        const backgroundUrl = `${siteBaseUrl}/api/webhook-audio-background`;
                        
                        const qstashAudioDelaySec = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
                        try {
                            await qstash.publishJSON({
                                url: backgroundUrl,
                                body: body,
                                delay: qstashAudioDelaySec
                            });
                        } catch (err) {
                            console.error("❌ Erro ao invocar Background Function de Áudio no QStash:", err);
                            await sendWhatsAppPresence(clientNumber, 'available');
                        }

                        return NextResponse.json({ status: 'queued_or_failed' }, { status: 200 });
                    }

                    if (!messageObj.conversation && !messageObj.extendedTextMessage) {
                        console.log('🔇 [WEBHOOK] Mídia/Áudio ignorado.');
                        return NextResponse.json({ status: 'ignored', reason: 'media_not_supported' }, { status: 200 });
                    }
                    clientMessage = messageObj.conversation || messageObj.extendedTextMessage?.text || '';
                }

                if (clientMessage && clientMessage.trim().length > 0) {
                    if (isFromMe) {
                        const cmd = clientMessage.trim();
                        if (cmd === '/pausar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                            await sendWhatsAppMessage(clientNumber, "🛑 *[SISTEMA]* IA Pausada pelo Admin.");
                            return NextResponse.json({ status: 'admin_command', command: 'pausar' }, { status: 200 });
                        } else if (cmd === '/retomar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: false }).eq('phone', clientNumber);
                            await sendWhatsAppMessage(clientNumber, "▶️ *[SISTEMA]* IA Reativada.");
                            return NextResponse.json({ status: 'admin_command', command: 'retomar' }, { status: 200 });
                        }

                        // Ignore other fromMe messages early
                        return NextResponse.json({ status: 'ignored', reason: 'fromMe_not_command' }, { status: 200 });
                    }

                    isValidMessage = true;
                }
            }
        } else if (body.isGroup === false && body.text && body.text.message) {
            const isFromMe = body.fromMe === true;
            clientNumber = normalizePhone(body.phone || '');
            incomingMessageId = body.id || `msg_${Date.now()}`;
            clientMessage = body.text.message;
            if (clientMessage && clientMessage.trim().length > 0) {
                if (isFromMe) {
                    const cmd = clientMessage.trim();
                    if (cmd === '/pausar') {
                        await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                        await sendWhatsAppMessage(clientNumber, "🛑 *[SISTEMA]* IA Pausada pelo Admin.");
                        return NextResponse.json({ status: 'admin_command', command: 'pausar' }, { status: 200 });
                    } else if (cmd === '/retomar') {
                        await supabaseAdmin.from('leads_lobo').update({ ai_paused: false }).eq('phone', clientNumber);
                        await sendWhatsAppMessage(clientNumber, "▶️ *[SISTEMA]* IA Reativada.");
                        return NextResponse.json({ status: 'admin_command', command: 'retomar' }, { status: 200 });
                    }

                    return NextResponse.json({ status: 'ignored', reason: 'fromMe_not_command' }, { status: 200 });
                }

                isValidMessage = true;
            }
        }

        if (isValidMessage && clientNumber && clientMessage) {
            console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);

            // 🛡️ [SHIELD] Step 2: Keyword Blacklist (common Brazilian auto-reply phrases)
            const autoReplyKeywords = [
                'bem-vindo', 'bem vindo', 'horário de atendimento', 'neste momento não',
                'digite 1', 'menu principal', 'mensagem automática', 'em breve retornaremos',
                'agradece o contato', 'assistente virtual', 'escolha uma opção',
                'opção inválida', 'digite o número', 'selecione uma'
            ];
            const msgLower = clientMessage.toLowerCase();
            if (autoReplyKeywords.some(kw => msgLower.includes(kw))) {
                console.log(`🛡️ [SHIELD] Auto-reply detected (Keywords) from ${clientNumber}: "${clientMessage}". Ignoring.`);
                return NextResponse.json({ status: 'ignored', reason: 'auto_reply_keyword' }, { status: 200 });
            }

            // --- DEBOUNCER / BATCHING LOGIC START ---

            // 2. Fetch Lead
            let { data: lead, error: leadError } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('phone', clientNumber)
                .maybeSingle();

            if (leadError) {
                console.error('❌ Erro ao buscar lead no Supabase:', leadError);
            }

            // 🛡️ FRIENDLY FIRE PROTECTION: Mark as replied so Ghost Hunter ignores them
            if (lead) {
                await supabaseAdmin
                    .from('leads_lobo')
                    .update({ replied: true })
                    .eq('phone', clientNumber);
                console.log(`✅ [WEBHOOK] Lead ${clientNumber} respondeu. Marcado para ignorar no Ghost Hunter.`);
            }

            // 🛡️ [SHIELD] Step 1: Speed Trap (reply arrived too fast = auto-reply)
            if (lead?.updated_at) {
                const timeSinceContact = Date.now() - new Date(lead.updated_at).getTime();
                if (timeSinceContact < 15000) {
                    console.log(`🛡️ [SHIELD] Auto-reply detected (Too fast: ${Math.round(timeSinceContact)}ms < 15s) from ${clientNumber}. Ignoring.`);
                    return NextResponse.json({ status: 'ignored', reason: 'auto_reply_speed_trap', delta_ms: timeSinceContact }, { status: 200 });
                }
            }

            // 🚨 CIRCUIT BREAKER: Lock if reply_count >= 10 (AI Loop War Prevention)
            if (lead && (lead.reply_count || 0) >= 10) {
                console.log(`🚨 [CIRCUIT BREAKER] Bot Loop detectado para lead ${clientNumber}. Travando conversa.`);
                await supabaseAdmin
                    .from('leads_lobo')
                    .update({ is_locked: true, status: 'needs_human', ai_paused: true })
                    .eq('phone', clientNumber);
                return NextResponse.json({ status: 'locked', reason: 'circuit_breaker_reply_limit' }, { status: 200 });
            }

            // ⏱️ COOLDOWN: 5+ messages in under 2 minutes = auto-lock (Anti-Spam)
            if (lead) {
                const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
                const { count } = await supabaseAdmin
                    .from('chat_history')
                    .select('*', { count: 'exact', head: true })
                    .eq('whatsapp_number', clientNumber)
                    .eq('role', 'user')
                    .gte('created_at', twoMinAgo);

                if ((count || 0) >= 5) {
                    console.log(`🚨 [CIRCUIT BREAKER] Spam detectado de ${clientNumber}: ${count} msgs em 2min. Travando.`);
                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ is_locked: true, status: 'needs_human', ai_paused: true })
                        .eq('phone', clientNumber);
                    return NextResponse.json({ status: 'locked', reason: 'cooldown_spam_detected' }, { status: 200 });
                }
            }

            // 🔒 LOCKED CHECK: If already locked, stop immediately
            if (lead && lead.is_locked === true) {
                console.log(`🔒 [CIRCUIT BREAKER] Lead ${clientNumber} está travado. Ignorando.`);
                return NextResponse.json({ status: 'ignored', reason: 'lead_locked' }, { status: 200 });
            }

            // Kill Switch: Human Takeover
            if (lead && (lead as any).ai_paused === true) {
                console.log(`🛑 [KILL SWITCH ATIVO] Humano no controle para o número: ${clientNumber}`);
                return NextResponse.json({ status: 'ignored', reason: 'human_takeover' }, { status: 200 });
            }

            // 3. Create lead if new
            if (!lead) {
                console.log(`🌱 Lead novo. Criando registro como organico_inbound...`);
                const { data: newLead } = await supabaseAdmin.from('leads_lobo').insert({
                    phone: clientNumber,
                    status: 'organico_inbound',
                    name: 'Lead inbound',
                    message_buffer: '',
                    is_processing: false,
                }).select().single();

                lead = newLead;
            }

            // --- SERVERLESS DEBOUNCE LOGIC ---

            // 4. Save Message to Database IMMEDIATELY
            await supabaseAdmin.from('chat_history').insert({
                whatsapp_number: clientNumber,
                role: 'user',
                content: clientMessage,
                message_id: incomingMessageId
            });

            // 5. The 3-Second Holding Pattern
            console.log(`🕒 [DEBOUNCE] Aguardando 3s por possíveis mensagens seguidas de ${clientNumber}...`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 6. The "Survival" Check
            const { data: latestMsg } = await supabaseAdmin
                .from('chat_history')
                .select('message_id')
                .eq('whatsapp_number', clientNumber)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // Compare local incomingMessageId with latest message_id in DB
            if (latestMsg && latestMsg.message_id !== incomingMessageId) {
                console.log(`🛡️ [DEBOUNCE] Newer message detected. Aborting execution for msg: ${incomingMessageId}`);
                return NextResponse.json({ status: "ignored_replaced_by_newer" });
            }

            console.log(`🚀 [DEBOUNCE] Sobrevivente: ${incomingMessageId}. Processando resposta conjunta...`);

            // --- GODSPEED UNIFICATION (Pre-Flight Context) ---
            let leadContext = '';

            if (lead) {
                if (lead.status === 'contacted') {
                    leadContext = `\n\n[CONTEXTO DO LEAD]:
Atenção: Você está falando com ${lead.name || 'o cliente'}. Nosso sistema automatizado acabou de enviar uma isca perguntando se eles usam IA no atendimento. Continue a conversa a partir dessa premissa, qualificando a dor deles de forma natural.
Empresa/Nicho: ${lead.niche || 'Não informada'}.
Dor Principal: ${lead.main_pain || 'Não informada'}.`;

                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ status: 'talking' })
                        .eq('phone', clientNumber);
                    console.log(`🔄 Status do lead atualizado para 'talking'`);
                } else {
                    leadContext = `\n\n[CONTEXTO DO LEAD]:
Você está falando com ${lead.name || 'o cliente'}.
O status atual dele na base é: ${lead.status}.
Empresa/Nicho: ${lead.niche || 'Não informada'}.
Dor Principal: ${lead.main_pain || 'Não informada'}.
${lead.status === 'pending' ? 'Este lead veio de uma prospecção ativa via Lobo. Use isso a seu favor.' : ''}`;
                }
            }

            if (lead?.status === 'organico_inbound') {
                leadContext = `\n\n[CONTEXTO DO LEAD]: Este é um lead orgânico inbound novo. Ele acabou de mandar mensagem. Colete o Nome, Empresa e Dor para salvar usando a tool.`;
            }

            // 7. Busca o cérebro do Agente no Banco de Dados
            const { data: config, error: configError } = await supabaseAdmin
                .from('agent_configs')
                .select('*, organizations(name)')
                .limit(1)
                .single();

            if (configError || !config) {
                console.log('🚨 ERRO: Agente não encontrado no banco de dados.');
                return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
            }

            // --- QSTASH ASYNC QUEUEING ---
            console.log(`🚀 [QSTASH] Enfileirando mensagem de ${clientNumber} para processamento assíncrono no eliza-worker...`);

            // Ativa o "typing..." imediatamente pro lead já ver
            await sendWhatsAppPresence(clientNumber, 'composing');

            const { Client } = await import('@upstash/qstash');
            const qstash = new Client({
                token: process.env.QSTASH_TOKEN!,
                baseUrl: "https://qstash-us-east-1.upstash.io"
            });

            try {
                const qstashDelaySec = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
                await qstash.publishJSON({
                    url: `${siteBaseUrl}/api/eliza-worker`,
                    body: {
                        clientNumber,
                        clientMessage,
                        incomingMessageId,
                        leadContext
                    },
                    delay: qstashDelaySec // Aguarda com jitter
                });
            } catch (err) {
                console.error("❌ Erro ao publicar texto para o eliza-worker no QStash:", err);
                await sendWhatsAppPresence(clientNumber, 'available');
            }

            return NextResponse.json({ status: 'queued_or_failed' }, { status: 200 });
        }

        return NextResponse.json({ status: 'ignored_event' });
    } catch (error) {
        console.error('❌ Erro Crítico no Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        // --- CLEANUP ---
        // Debounce doesn't use locks anymore, so no cleanup is needed here immediately.
    }
}