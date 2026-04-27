// app/api/webhook/evolution/route.ts
// ====================================================================
// 🌐 EVOLUTION API WEBHOOK HANDLER (Next.js App Router)
// Ported from the legacy agent's proven http.createServer handler.
// This is the INGESTION POINT for all WhatsApp events.
// ====================================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';

export const maxDuration = 30;

export async function POST(req: Request) {
    // ============================================================
    // 🔬 UNIVERSAL RAW LOG — Fires for EVERY POST, no exceptions.
    // ============================================================
    let body: any;
    try {
        body = await req.json();
    } catch {
        console.error('❌ [WEBHOOK] Failed to parse JSON body.');
        return NextResponse.json({ status: 'error', reason: 'invalid_json' }, { status: 400 });
    }

    const rawEvent = body?.event || body?.type || body?.apiType || 'UNKNOWN';
    const rawInstance = body?.instance || body?.instanceName || 'UNKNOWN';
    const rawDataKeys = body?.data ? Object.keys(body.data) : [];
    console.log(`\n📡 [WEBHOOK_RAW] Event: "${rawEvent}" | Instance: "${rawInstance}" | Data Keys: [${rawDataKeys.join(', ')}]`);
    console.log(`📡 [WEBHOOK_RAW] Full Body:`, JSON.stringify(body, null, 2));

    try {
        const url = new URL(req.url);
        const tenantId = url.searchParams.get('tenantId');

        // 1. BULLETPROOF EVENT NORMALIZATION (handles v1 + v2)
        //    v1: "MESSAGES_UPSERT", "CONNECTION_UPDATE"
        //    v2: "messages.upsert", "connection.update"
        const eventRaw = String(body.event || body.type || body.apiType || '');
        const eventNormalized = eventRaw.toUpperCase().replace(/\./g, '_');

        const isMessageEvent = eventNormalized === 'MESSAGES_UPSERT';
        const isConnectionEvent = eventNormalized === 'CONNECTION_UPDATE';

        const instanceName = body.instance || body.instanceName || body.data?.instance || url.searchParams.get('instance') || '';

        console.log(`🏷️ [WEBHOOK] Normalized: "${eventNormalized}" | Instance: "${instanceName}" | Tenant: "${tenantId}"`);

        if (!isMessageEvent && !isConnectionEvent) {
            console.log(`🔇 [WEBHOOK] Dropped irrelevant event: "${eventRaw}"`);
            return NextResponse.json({ status: 'ignored', reason: 'irrelevant_event' });
        }

        // ================================================================
        // 🔌 CONNECTION UPDATE HANDLER
        // ================================================================
        if (isConnectionEvent) {
            const dataObj = (Array.isArray(body.data) ? body.data[0] : body.data) || body;

            // Deep state extraction — covers every known Evolution API shape
            const candidates = [
                dataObj?.state, dataObj?.connection, dataObj?.status,
                body?.status, dataObj?.instance?.state,
            ];
            const rawState = candidates.find((c: any) => typeof c === 'string' && c.length > 0) || 'unknown';
            const normalizedState = rawState.toLowerCase().trim();

            console.log(`🔌 [CONNECTION] State: "${rawState}" → "${normalizedState}" | Instance: "${instanceName}"`);

            const CONNECTED_STATES = ['open', 'connected'];
            const DISCONNECTED_STATES = ['close', 'disconnected', 'refused', 'logout'];
            const isOpen = CONNECTED_STATES.includes(normalizedState);
            const isClosed = DISCONNECTED_STATES.includes(normalizedState);

            if (!isOpen && !isClosed) {
                console.log(`🔇 [CONNECTION] Unclassified state: "${rawState}" — no action.`);
                return NextResponse.json({ success: true });
            }

            const newStatus = isOpen ? 'CONNECTED' : 'DISCONNECTED';

            // DUAL-PATH DB LOOKUP: instance_name first, tenantId fallback
            let config: any = null;
            const { data: byInstance } = await supabaseAdmin
                .from('business_config')
                .select('id, context_json, owner_id')
                .eq('instance_name', instanceName)
                .maybeSingle();
            config = byInstance;

            if (!config && tenantId) {
                const { data: byTenant } = await supabaseAdmin
                    .from('business_config')
                    .select('id, context_json, owner_id')
                    .eq('owner_id', tenantId)
                    .maybeSingle();
                config = byTenant;
            }

            if (config) {
                const currentContext = (config.context_json && typeof config.context_json === 'object')
                    ? config.context_json : {};
                const updatedContext = { ...currentContext, connection_status: newStatus };

                await supabaseAdmin
                    .from('business_config')
                    .update({
                        status: newStatus,
                        context_json: updatedContext,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', config.id);

                console.log(`✅ [CONNECTION] ${instanceName} → ${newStatus}`);
            } else {
                console.warn(`⚠️ [CONNECTION] No business_config for instance="${instanceName}". Event dropped.`);
            }

            return NextResponse.json({ success: true });
        }

        // ================================================================
        // 💬 MESSAGE PROCESSING (MESSAGES_UPSERT)
        // ================================================================

        // Normalize data object (handles v1, v2, and array-wrapped payloads)
        let dataObj = Array.isArray(body.data) ? body.data[0] : body.data;
        if (!dataObj) {
            console.warn('⚠️ [WEBHOOK] No data object found. Dropping.');
            return NextResponse.json({ status: 'ignored', reason: 'no_data' });
        }

        // The message can be the dataObj itself, or inside a 'messages' array
        const msgItem = (dataObj.messages && Array.isArray(dataObj.messages))
            ? dataObj.messages[0]
            : dataObj;

        if (!msgItem || !msgItem.key) {
            console.warn(`⚠️ [WEBHOOK] No 'key' found in msgItem. Dropping.`);
            return NextResponse.json({ status: 'ignored', reason: 'no_key' });
        }

        // JID extraction
        let remoteJid = msgItem.key.remoteJid || '';
        if (msgItem.key.remoteJidAlt && String(msgItem.key.remoteJidAlt).includes('@s.whatsapp.net')) {
            remoteJid = String(msgItem.key.remoteJidAlt);
        }

        // Drop group messages
        if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) {
            console.warn(`⚠️ [WEBHOOK] Invalid remoteJid: "${remoteJid}". Dropping (group or broadcast).`);
            return NextResponse.json({ status: 'ignored', reason: 'invalid_jid' });
        }

        const rawNumber = remoteJid.split('@')[0];
        const phone = normalizePhone(rawNumber);
        const isFromMe = msgItem.key.fromMe === true;

        // Exhaustive text extraction (covers all Evolution API message types)
        const messageObj = msgItem.message || {};
        const text = messageObj.conversation
            || messageObj.extendedTextMessage?.text
            || messageObj.imageMessage?.caption
            || messageObj.videoMessage?.caption
            || messageObj.buttonsResponseMessage?.selectedDisplayText
            || messageObj.listResponseMessage?.title
            || messageObj.templateButtonReplyMessage?.selectedDisplayText
            || '';
        const isAudio = !!messageObj.audioMessage;
        const isImage = !!messageObj.imageMessage;
        const isVideo = !!messageObj.videoMessage;
        const isDocument = !!messageObj.documentMessage;

        console.log(`💬 [WEBHOOK] Phone: ${phone} | fromMe: ${isFromMe} | Text: "${text.substring(0, 80)}" | Audio: ${isAudio} | Image: ${isImage}`);

        if (!text && !isAudio && !isImage && !isVideo && !isDocument) {
            console.log(`⏭️ [WEBHOOK] No processable content (sticker/reaction/etc). Skipping.`);
            return NextResponse.json({ success: true, message: 'No processable content' });
        }

        // 5. PERSIST MESSAGE
        let content = text;
        if (isAudio) content = '[AUDIO]';
        else if (isImage) content = '[IMAGE]';
        else if (isVideo) content = '[VIDEO]';
        else if (isDocument) content = '[DOCUMENT]';

        const messageId = msgItem.key.id || `gen_${Math.random().toString(36).substring(7)}`;

        const { error: msgError } = await supabaseAdmin.from('messages').upsert({
            lead_phone: phone,
            role: isFromMe ? 'assistant' : 'user',
            content: content,
            message_id: messageId,
            instance_name: instanceName,
            created_at: new Date().toISOString()
        }, { onConflict: 'message_id' });

        if (msgError) {
            console.error(`❌ [WEBHOOK] Message persist error:`, msgError.message);
        } else {
            console.log(`💾 [WEBHOOK] Message persisted: ${messageId}`);
        }

        // 6. ANTI-LOOP: Drop outbound (fromMe) messages after logging
        if (isFromMe) {
            console.log(`🔄 [WEBHOOK] Outbound message logged. Skipping worker signal.`);
            return NextResponse.json({ success: true, message: 'Outbound logged' });
        }

        // 7. Resolve Owner & Queue for Eliza
        let activeOwnerId = tenantId;
        if (!activeOwnerId && instanceName) {
            const { data: bConfig } = await supabaseAdmin
                .from('business_config')
                .select('owner_id')
                .eq('instance_name', instanceName)
                .maybeSingle();
            activeOwnerId = bConfig?.owner_id;
        }

        if (!activeOwnerId) {
            console.error(`❌ [WEBHOOK] Could not resolve owner_id for instance: ${instanceName}. Lead NOT queued.`);
            return NextResponse.json({ success: false, reason: 'no_owner_id' });
        }

        // 8. AUTO-UNPAUSE (Legacy behavior restoration)
        // If lead was previously paused/handed-off, a new inbound message means
        // the human interaction is over — unpause and let AI resume.
        const { data: existingLead } = await supabaseAdmin
            .from('leads_lobo')
            .select('id, ai_paused, needs_human, is_locked')
            .eq('phone', phone)
            .maybeSingle();

        if (existingLead?.is_locked === true) {
            console.log(`🔒 [WEBHOOK] Lead is_locked=true. Ignoring message from ${phone}.`);
            return NextResponse.json({ success: true, message: 'Lead locked' });
        }

        if (existingLead && (existingLead.ai_paused === true || existingLead.needs_human === true)) {
            console.log(`🔓 [WEBHOOK] Lead was paused. New inbound — unpausing for AI.`);
            await supabaseAdmin.from('leads_lobo').update({
                ai_paused: false,
                needs_human: false
            }).eq('id', existingLead.id);
        }

        // 9. UPSERT LEAD → Queue for polling engine
        const { data: upsertData, error: upsertError } = await supabaseAdmin
            .from('leads_lobo')
            .upsert({
                phone: phone,
                status: 'eliza_processing',
                instance_name: instanceName,
                owner_id: activeOwnerId,
                ai_paused: false,
                needs_human: false,
                updated_at: new Date().toISOString()
            }, { onConflict: 'phone' })
            .select();

        if (upsertError) {
            // Race condition guard (legacy pattern)
            if (upsertError.code === '23505' || upsertError.message.includes('duplicate key')) {
                console.warn(`⚠️ [WEBHOOK RACE] Duplicate key for ${phone}. Falling back to update.`);
                await supabaseAdmin.from('leads_lobo').update({
                    status: 'eliza_processing',
                    instance_name: instanceName,
                    ai_paused: false,
                    needs_human: false,
                    updated_at: new Date().toISOString()
                }).eq('phone', phone);
            } else {
                console.error('❌ [DB INSERT ERROR - leads_lobo]:', upsertError);
            }
        } else {
            console.log(`✅ [WEBHOOK:SUCCESS] Lead ${phone} queued for Eliza Worker. Data:`, upsertData);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('❌ [WEBHOOK ERROR]:', error.stack || error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
