import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    
    // 1. Core Identification
    const event = body.event || body.type;
    const instanceName = body.instance || body.instanceName || searchParams.get('instance');
    const tenantId = searchParams.get('tenantId');

    // 2. Normalize Data Object (Handle v1/v2 variations)
    // dataObj should be the container of the message or the message itself
    const dataObj = (Array.isArray(body.data) ? body.data[0] : body.data) || body;

    // 3. Connection Lifecycle
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = dataObj.state || body.state || dataObj.status || body.status;
      if (state === "open" && instanceName) {
        console.log(`🔌 [WEBHOOK] Connection OPEN for instance: ${instanceName}`);
        await supabaseAdmin
          .from('business_config')
          .update({ status: 'CONNECTED', updated_at: new Date().toISOString() })
          .eq('instance_name', instanceName);
      }
      return NextResponse.json({ success: true });
    }

    // 4. Message Processing (The Rollback Logic)
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      // msgItem is the actual message object (contains key, message, etc.)
      const msgItem = dataObj?.messages?.[0] || dataObj;

      if (!msgItem?.key) {
        console.warn(`⚠️ [WEBHOOK] No message key found in payload`, JSON.stringify(dataObj).substring(0, 200));
        return NextResponse.json({ status: 'ignored', reason: 'no_key' });
      }

      let remoteJid = msgItem.key.remoteJid || "";
      if (msgItem.key.remoteJidAlt && String(msgItem.key.remoteJidAlt).includes('@s.whatsapp.net')) {
        remoteJid = String(msgItem.key.remoteJidAlt);
      }

      if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) {
        console.log(`[WEBHOOK BLOCK] Ignorado - Formato JID Inválido:`, remoteJid);
        return NextResponse.json({ status: 'ignored' });
      }

      const rawNumber = remoteJid.split('@')[0];
      const phone = normalizePhone(rawNumber);
      const isFromMe = msgItem.key.fromMe === true;

      const messageObj = msgItem.message || {};
      const text = messageObj.conversation || messageObj.extendedTextMessage?.text || "";
      const isAudio = !!messageObj.audioMessage;
      const isImage = !!messageObj.imageMessage;

      if (!text && !isAudio && !isImage) {
        return NextResponse.json({ success: true, message: 'No processable content' });
      }

      console.log(`📡 [WEBHOOK] Inbound: ${phone} | fromMe: ${isFromMe} | Instance: ${instanceName}`);

      // 5. PERSIST MESSAGE (Context History)
      let content = text;
      if (isAudio) content = "[AUDIO]";
      else if (isImage) content = "[IMAGE]";

      const messageId = msgItem.key.id || `gen_${Math.random().toString(36).substring(7)}`;

      await supabaseAdmin.from('messages').upsert({
        lead_phone: phone,
        role: isFromMe ? 'assistant' : 'user',
        content: content,
        message_id: messageId,
        instance_name: instanceName,
        created_at: new Date().toISOString()
      }, { onConflict: 'message_id' });

      // 6. ANTI-LOOP & WORKER SIGNAL
      if (isFromMe) {
        return NextResponse.json({ success: true, message: 'Outbound logged' });
      }

      // Rollback logic: Populate leads_lobo
      // Try to find owner_id if not in query params
      let activeOwnerId = tenantId;
      if (!activeOwnerId && instanceName) {
        const { data: bConfig } = await supabaseAdmin
          .from('business_config')
          .select('owner_id')
          .eq('instance_name', instanceName)
          .maybeSingle();
        activeOwnerId = bConfig?.owner_id;
      }

      const { error: upsertError } = await supabaseAdmin
        .from('leads_lobo')
        .upsert({
          phone: phone,
          status: 'eliza_processing',
          instance_name: instanceName,
          owner_id: activeOwnerId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'phone' });

      if (upsertError) {
        console.error(`❌ [WEBHOOK:UPSERT_ERROR]`, upsertError.message);
      } else {
        console.log(`✅ [WEBHOOK:SUCCESS] Lead ${phone} queued for Eliza Worker in leads_lobo`);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error: any) {
    console.error('❌ [WEBHOOK ERROR]:', error.stack || error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}

