import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { normalizePhone } from '../../../../lib/utils/phone';

/**
 * WEBHOOK GATEWAY - NEXT.JS API ROUTE
 * Resolves port collisions and payload size limits.
 * Implements "Fire-and-Forget" ACK for high-speed ingestion.
 */

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    try {
        const payload = await req.json();
        
        // 1. IMMEDIATE ACK (Fire-and-Forget)
        // We return 200 OK instantly to Evolution API to prevent timeout drops.
        const response = NextResponse.json({ message: 'Webhook Ingested Successfully' }, { status: 200 });

        // 2. TRIGGER ASYNCHRONOUS BACKGROUND PROCESSING
        // We do NOT await this. It continues in the background.
        processWebhookInBackground(payload, tenantId).catch(err => {
            console.error('🔥 [BKG WEBHOOK ERROR]:', err.message, err.stack);
        });

        console.log(`✅ [GATEWAY ACK] ACK sent to Evolution API in ${Date.now() - startTime}ms`);
        return response;

    } catch (err: any) {
        console.error('🔥 [GATEWAY FATAL]:', err.message);
        // Always return 200 to Evolution API to prevent retries of invalid packets
        return NextResponse.json({ error: 'Parse Failed' }, { status: 200 });
    }
}

async function processWebhookInBackground(payload: any, tenantId: string | null) {
    // 1. Process Event Type
    const eventRaw = String(payload.event || payload.type || payload.apiType || '');
    const eventNormalized = eventRaw.toUpperCase().replace(/\./g, '_');
    
    const instanceName = payload.instance || payload.instanceName || payload.data?.instance || 'Unknown';

    // Handler: Connection State Sync
    if (eventNormalized === 'CONNECTION_UPDATE') {
        const state = payload.data?.state || payload.data?.status || payload.state;
        if (state) {
            let statusStr = String(state).toUpperCase();
            if (statusStr === 'OPEN') statusStr = 'CONNECTED';
            if (statusStr === 'CLOSE' || statusStr === 'DISCONNECTED') statusStr = 'DISCONNECTED';
            
            await supabaseAdmin.from('business_config')
                .update({ status: statusStr, updated_at: new Date().toISOString() })
                .eq('instance_name', instanceName);
            console.log(`🔄 [GATEWAY CONNECTION] Instance ${instanceName} status updated to ${statusStr}`);
        }
        return;
    }

    // Handler: Inbound Message
    if (eventNormalized !== 'MESSAGES_UPSERT') return;

    let dataObj = Array.isArray(payload.data) ? payload.data[0] : payload.data;
    if (!dataObj) return;

    const msgItem = (dataObj.messages && Array.isArray(dataObj.messages))
        ? dataObj.messages[0]
        : dataObj;

    if (!msgItem || !msgItem?.key) return;

    // Filter: Ignore fromMe (anti-loop)
    if (msgItem?.key?.fromMe === true) return;

    // Filter: JID Validation (RemoteJidAlt support)
    let remoteJid = msgItem?.key?.remoteJid || '';
    if (msgItem?.key?.remoteJidAlt && String(msgItem?.key?.remoteJidAlt).includes('@s.whatsapp.net')) {
        remoteJid = String(msgItem?.key?.remoteJidAlt);
    }

    if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) return;

    const rawNumber = remoteJid.split('@')[0];
    const clientNumber = normalizePhone(rawNumber);

    // Extraction: Robust Message Extractor
    const msgData = msgItem?.message?.ephemeralMessage?.message || msgItem?.message || payload.data?.message || payload.data || {};
    let text = msgData.conversation
        || msgData.extendedTextMessage?.text
        || msgData.imageMessage?.caption
        || msgData.videoMessage?.caption
        || msgData.buttonsResponseMessage?.selectedDisplayText
        || msgData.listResponseMessage?.title
        || msgData.templateButtonReplyMessage?.selectedDisplayText
        || '';

    const isAudio = !!msgData.audioMessage;
    const isImage = !!msgData.imageMessage;
    const isVideo = !!msgData.videoMessage;
    const isDocument = !!msgData.documentMessage;

    if (!text && !isAudio && !isImage && !isVideo && !isDocument) return;

    let content = text;
    if (isAudio) content = '[AUDIO]';
    else if (isImage) content = '[IMAGE]';
    else if (isVideo) content = '[VIDEO]';
    else if (isDocument) content = '[DOCUMENT]';

    const messageId = msgItem?.key?.id || `gen_${Math.random().toString(36).substring(7)}`;

    // DB Action: Persist Message for context
    await supabaseAdmin.from('messages').upsert({
        lead_phone: clientNumber,
        role: 'user',
        content: content,
        message_id: messageId,
        instance_name: instanceName,
        created_at: new Date().toISOString()
    }, { onConflict: 'message_id' });

    // DB Action: Resolve Owner ID
    let activeOwnerId = tenantId;
    if (!activeOwnerId && instanceName && instanceName !== 'Unknown') {
        const { data: bConfig } = await supabaseAdmin
            .from('business_config')
            .select('owner_id')
            .eq('instance_name', instanceName)
            .maybeSingle();
        activeOwnerId = bConfig?.owner_id;
    }

    if (!activeOwnerId) {
        console.error(`❌ [GATEWAY] DROP: No owner_id resolved for ${instanceName}`);
        return;
    }

    // DB Action: Queue Lead for Polling Engine
    const { error: upsertError } = await supabaseAdmin.from('leads_lobo').upsert({
        phone: clientNumber,
        owner_id: activeOwnerId,
        instance_name: instanceName,
        status: 'eliza_processing',
        name: 'Lead inbound',
        lead_source: 'inbound',
        menu_step: 0,
        ai_paused: false,
        needs_human: false,
        updated_at: new Date().toISOString()
    }, { onConflict: 'phone' });

    if (upsertError) {
        console.error('❌ [GATEWAY DB ERROR]:', upsertError.message);
    } else {
        console.log(`✅ [GATEWAY SUCCESS]: Lead ${clientNumber} queued for AI heartbeat.`);
    }
}
