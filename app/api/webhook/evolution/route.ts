import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event || body.type;
    const dataObj = (Array.isArray(body.data) ? body.data[0] : body.data) || body;
    const instanceName = body.instance || dataObj.instanceName || body.instanceName || dataObj.instance;
    
    // 1. Connection Lifecycle
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = dataObj.state || body.state || dataObj.status || body.status;
      if (state === "open" && instanceName) {
        await supabaseAdmin
          .from('business_config')
          .update({ status: 'CONNECTED', updated_at: new Date().toISOString() })
          .eq('instance_name', instanceName);
      }
      return NextResponse.json({ success: true });
    }

    // 2. Message Processing (The Rollback Logic)
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      let remoteJid = dataObj?.key?.remoteJid || dataObj?.remoteJid || "";
      if (dataObj?.key?.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net')) {
          remoteJid = String(dataObj.key.remoteJidAlt);
      }

      if (!remoteJid.endsWith('@s.whatsapp.net')) {
          return NextResponse.json({ status: 'ignored' });
      }

      const rawNumber = remoteJid.split('@')[0];
      const phone = normalizePhone(rawNumber);
      const isFromMe = dataObj.key?.fromMe === true;

      const messageObj = dataObj.message || {};
      const text = messageObj.conversation || messageObj.extendedTextMessage?.text || "";
      const isAudio = !!messageObj.audioMessage;
      const isImage = !!messageObj.imageMessage;

      if (!text && !isAudio && !isImage) {
        return NextResponse.json({ success: true, message: 'No processable content' });
      }

      console.log(`📡 [WEBHOOK] Inbound: ${phone} | fromMe: ${isFromMe} | Text: ${!!text}`);

      // 3. PERSIST MESSAGE (Context History)
      let content = text;
      if (isAudio) content = "[AUDIO]";
      else if (isImage) content = "[IMAGE]";

      await supabaseAdmin.from('messages').upsert({
        lead_phone: phone,
        role: isFromMe ? 'assistant' : 'user',
        content: content,
        message_id: dataObj.key.id || Math.random().toString(36).substring(7),
        instance_name: instanceName,
        created_at: new Date().toISOString()
      }, { onConflict: 'message_id' });

      // 4. ANTI-LOOP & WORKER SIGNAL
      if (isFromMe) {
          return NextResponse.json({ success: true, message: 'Outbound logged' });
      }

      // Rollback logic: Populate leads_lobo
      const { data: bConfig } = await supabaseAdmin
        .from('business_config')
        .select('owner_id')
        .eq('instance_name', instanceName)
        .maybeSingle();

      const { error: upsertError } = await supabaseAdmin
        .from('leads_lobo')
        .upsert({
          phone: phone,
          status: 'eliza_processing',
          instance_name: instanceName,
          owner_id: bConfig?.owner_id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'phone' });

      if (upsertError) {
        console.error(`❌ [WEBHOOK:UPSERT_ERROR]`, upsertError.message);
      }

      console.log(`✅ [WEBHOOK:SUCCESS] Lead ${phone} queued for Eliza Worker in leads_lobo`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error: any) {
    console.error('❌ [WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
