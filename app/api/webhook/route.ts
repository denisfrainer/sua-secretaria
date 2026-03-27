// app/api/webhook/route.ts
// SQL Command to add the column:
// ALTER TABLE leads_lobo ADD COLUMN needs_human BOOLEAN DEFAULT FALSE;

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
                        // 🛡️ TRAVA DE SEGURANÇA: Se o áudio for SEU (Denis), ignora o processamento
                        if (dataObj.key.fromMe) return NextResponse.json({ status: 'ignored' });

                        // 🔍 Check if AI is paused or needs human before triggering audio background
                        const { data: lead } = await supabaseAdmin
                            .from('leads_lobo')
                            .select('ai_paused, needs_human')
                            .eq('phone', clientNumber)
                            .maybeSingle();

                        if (lead && (lead.ai_paused === true || lead.needs_human === true)) {
                            console.log(`🛑 [SILICON TWEAK] Eliza silenciada para áudio de ${clientNumber} (AI Pausada ou Needs Human).`);
                            return NextResponse.json({ status: 'ignored', reason: 'ai_paused_or_needs_human' }, { status: 200 });
                        }

                        console.log("🎙️ [WEBHOOK] Audio detectado. Acionando Background via QStash.");

                        // ✅ O 'as any' silencia o erro do TS enquanto usamos o valor que o servidor exige
                        await sendWhatsAppPresence(clientNumber, 'recording' as any);

                        const { Client } = await import('@upstash/qstash');
                        const qstash = new Client({
                            token: process.env.QSTASH_TOKEN!,
                            baseUrl: "https://qstash-us-east-1.upstash.io"
                        });

                        // Fire and forget background trigger via QStash
                        const backgroundUrl = `${siteBaseUrl}/api/webhook-audio-background`;

                        try {
                            await qstash.publishJSON({
                                url: backgroundUrl,
                                body: body,
                                delay: "4s"
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
                            return NextResponse.json({ status: 'admin_command', command: 'pausar' }, { status: 200 });
                        } else if (cmd === '/retomar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: false, needs_human: false }).eq('phone', clientNumber);
                            return NextResponse.json({ status: 'admin_command', command: 'retomar' }, { status: 200 });
                        }

                        // 🛡️ THE SILICON TWEAK: API vs Human Detection
                        // Mensagens enviadas pela API do Evolution (Baileys) possuem IDs que começam com "BAE5" ou "B2B"
                        const isAPI = incomingMessageId && (incomingMessageId.startsWith('BAE5') || incomingMessageId.startsWith('B2B') || incomingMessageId.length > 32);

                        if (isAPI) {
                            console.log(`🤖 [WEBHOOK] Mensagem de saída da API detectada. Ignorando para não causar auto-trava.`);
                            return NextResponse.json({ status: 'ignored', reason: 'api_outbound' }, { status: 200 });
                        } else {
                            // 🛑 SILENT HANDOFF: Foi o Denis quem digitou no celular ou WhatsApp Web!
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                            console.log(`👤 [SILENT HANDOFF] Denis assumiu o chat via Evolution. IA pausada para ${clientNumber}.`);
                            return NextResponse.json({ status: 'ignored', reason: 'silent_handoff' }, { status: 200 });
                        }
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
                        await supabaseAdmin.from('leads_lobo').update({ ai_paused: false, needs_human: false }).eq('phone', clientNumber);
                        await sendWhatsAppMessage(clientNumber, "▶️ *[SISTEMA]* IA Reativada.");
                        return NextResponse.json({ status: 'admin_command', command: 'retomar' }, { status: 200 });
                    }

                    const isAPI = incomingMessageId && (incomingMessageId.startsWith('BAE5') || incomingMessageId.startsWith('B2B') || incomingMessageId.length > 32);

                    if (isAPI) {
                        return NextResponse.json({ status: 'ignored', reason: 'api_outbound' }, { status: 200 });
                    } else {
                        // 🛑 SILENT HANDOFF: Se o Denis enviou uma mensagem normal, trava a IA automaticamente
                        await supabaseAdmin.from('leads_lobo').update({ ai_paused: true, needs_human: true }).eq('phone', clientNumber);
                        console.log(`👤 [SILENT HANDOFF] Denis respondeu manualmente. IA pausada para ${clientNumber}.`);
                        return NextResponse.json({ status: 'ignored', reason: 'silent_handoff' }, { status: 200 });
                    }
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
                    .update({ is_locked: true, status: 'needs_human', ai_paused: true, needs_human: true })
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
                        .update({ is_locked: true, status: 'needs_human', ai_paused: true, needs_human: true })
                        .eq('phone', clientNumber);
                    return NextResponse.json({ status: 'locked', reason: 'cooldown_spam_detected' }, { status: 200 });
                }
            }

            // 🔒 LOCKED CHECK: If already locked, stop immediately
            if (lead && lead.is_locked === true) {
                console.log(`🔒 [CIRCUIT BREAKER] Lead ${clientNumber} está travado. Ignorando.`);
                return NextResponse.json({ status: 'ignored', reason: 'lead_locked' }, { status: 200 });
            }

            // 🛑 SILICON TWEAK DOUBLE LOCK: Human Takeover or AI Paused
            if (lead && (lead.ai_paused === true || (lead as any).needs_human === true)) {
                console.log(`🛑 [SILICON TWEAK] Humano no controle para o número: ${clientNumber} (ai_paused or needs_human)`);
                return NextResponse.json({ status: 'ignored', reason: 'human_takeover_lock' }, { status: 200 });
            }

            // 3. Create lead if new
            if (!lead) {
                console.log(`🌱 Lead novo. Criando registro como organic_inbound...`);
                const { data: newLead } = await supabaseAdmin.from('leads_lobo').insert({
                    phone: clientNumber,
                    status: 'organic_inbound',
                    name: 'Lead inbound',
                    message_buffer: '',
                    is_processing: false,
                }).select().single();

                lead = newLead;
            }

            // --- CONTINUOUS TYPING FLOW ---

            // 4. Save Message to Database IMMEDIATELY
            try {
                await supabaseAdmin.from('messages').insert({
                    lead_phone: clientNumber,
                    role: 'user',
                    content: clientMessage,
                    message_id: incomingMessageId
                });
                console.log(`✅ [WEBHOOK] Mensagem salva em 'messages'.`);
            } catch (insertErr: any) {
                console.log(`⚠️ [WEBHOOK] Falha ao salvar mensagem (possível duplicata): ${insertErr.message}`);
            }

            // 🛑 FEATURE FLAG: ELIZA KILL SWITCH (Mantido por segurança)
            const { data: elizaSwitch } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'eliza_active')
                .single();

            if (elizaSwitch && elizaSwitch.value?.enabled === false) {
                console.log(`🛑 [FEATURE FLAG] Eliza DESLIGADA. Lead ${clientNumber} setado para needs_human.`);
                await supabaseAdmin.from('leads_lobo').update({ status: 'needs_human', needs_human: true }).eq('phone', clientNumber);
                return NextResponse.json({ status: 'eliza_paused' }, { status: 200 });
            }

            // --- 🚀 O GATILHO PARA O WORKER NO RAILWAY ---
            // O Worker no Railway está vigiando leads com status 'eliza_processing'.
            // Ao mudar o status aqui, você acorda o Worker de forma assíncrona.

            try {
                await supabaseAdmin
                    .from('leads_lobo')
                    .update({ status: 'eliza_processing' })
                    .eq('phone', clientNumber);

                console.log(`🎯 [WEBHOOK] Status do lead ${clientNumber} alterado para 'eliza_processing'. O Worker no Railway vai assumir agora.`);
            } catch (updateErr) {
                console.error(`❌ [WEBHOOK] Erro ao atualizar status para eliza_processing:`, updateErr);
            }

            // Retorna 200 OK para a Evolution API imediatamente.
            return NextResponse.json({ status: 'success', handled_by: 'railway_worker' }, { status: 200 });
        }

        return NextResponse.json({ status: 'ignored_event' });
    } catch (error) {
        console.error('❌ Erro Crítico no Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}