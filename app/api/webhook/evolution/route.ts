import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event = body.event || body.type; // Evolution v2 uses 'event'
    
    // 1. Safe extraction of Instance and State (handles nesting and direct properties)
    const dataObj = (Array.isArray(body.data) ? body.data[0] : body.data) || body;
    const instanceName = body.instance || dataObj.instanceName || body.instanceName || dataObj.instance;
    const state = dataObj.state || body.state || dataObj.status || body.status;

    console.log(`📡 [EVOLUTION_WEBHOOK] Event received: ${event}`);

    // --- CASE A: CONNECTION UPDATE (Handshake Lifecycle) ---
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      // 2. Fallback observability
      if (!instanceName) {
          console.error("❌ [WEBHOOK_ERROR] Instance name missing. Raw body:", JSON.stringify(body, null, 2));
          return NextResponse.json({ error: "Missing instance name" }, { status: 200 });
      }

      console.log(`📡 [CONNECTION_UPDATE] Instance: ${instanceName} | State: ${state}`);

      if (state === "open") {
        try {
          console.log(`🔓 [HANDSHAKE] Confirmed for ${instanceName}. Syncing to Supabase...`);
          
          const { error } = await supabaseAdmin
            .from('business_config')
            .update({ 
              status: 'CONNECTED',
              updated_at: new Date().toISOString()
            })
            .eq('instance_name', instanceName);

          if (error) {
            console.error("❌ [DB_SYNC_ERROR] Failed to promote instance:", error);
          } else {
            console.log(`✅ [DB_SYNC_SUCCESS] ${instanceName} is now CONNECTED.`);
          }
        } catch (innerErr: any) {
          console.error("❌ [HANDSHAKE_ERROR] Failed during promotion logic:", innerErr.message);
        }
      }
      return NextResponse.json({ success: true });
    }

    // --- CASE B: MESSAGES UPSERT (Standard Inbound) ---
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      // 1. A "Gambiarra" Oficial: Procura o número real na gaveta alternativa se o principal for um @lid
      let remoteJid = dataObj?.key?.remoteJid || dataObj?.remoteJid || "";
      if (dataObj?.key?.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net')) {
          remoteJid = String(dataObj.key.remoteJidAlt);
      }

      const rawNumber = remoteJid.split('@')[0];

      // 2. O Gatekeeper (Agora olhando para o número certo)
      if (
          !remoteJid.endsWith('@s.whatsapp.net') || 
          rawNumber.length > 13 || 
          rawNumber === '5535902353092770'
      ) {
          console.log("🛑 [GATEKEEPER] Mutant/Group Rejected:", remoteJid);
          return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 });
      }

      const key = dataObj.key;
      if (!key) return NextResponse.json({ success: true, message: 'No key found' });

      // 1. ATOMIC IDENTITY LOCK
      const rawPhone = rawNumber;
      const phone = normalizePhone(rawPhone);
      const isFromMe = key.fromMe === true;

      // Detect message types
      const messageObj = dataObj.message || {};
      const text = messageObj.conversation || messageObj.extendedTextMessage?.text || "";
      const isAudio = !!messageObj.audioMessage;
      const isImage = !!messageObj.imageMessage;

      if (isFromMe) {
        console.log(`🛡️ [WEBHOOK] Dropping self-originated message.`);
        return NextResponse.json({ success: true });
      }

      if (!text && !isAudio && !isImage) {
        return NextResponse.json({ success: true, message: 'No processable content' });
      }

      console.log(`📡 [WEBHOOK] Inbound: ${phone} | Audio: ${isAudio} | Text: ${!!text}`);

      // 2. IDENTITY UPSERT (Immutable)
      const { data: profile, error: upsertError } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          phone,
          updated_at: new Date().toISOString()
        }, { onConflict: 'phone' })
        .select()
        .single();

      if (upsertError || !profile) {
        console.error('💥 [WEBHOOK:UPSERT_ERROR]', upsertError);
        return NextResponse.json({ success: false, error: 'Identity lock failed' }, { status: 200 });
      }

      // 3. PERSIST MESSAGE (Context Persistence)
      let content = text;
      if (isAudio) content = "[AUDIO]";
      else if (isImage) content = "[IMAGE]";

      const { error: msgError } = await supabaseAdmin.from('messages').insert({
        lead_phone: phone,
        role: 'user',
        content: content,
        message_id: key.id || Math.random().toString(36).substring(7),
        created_at: new Date().toISOString()
      });

      if (msgError) {
        console.error(`❌ [WEBHOOK:MSG_ERROR] Critical failure persisting message:`, msgError.message);
        return NextResponse.json({ success: false, error: 'Message persistence failed' }, { status: 200 });
      }

      // 4. QUEUE TRIGGER (The Handover)
      const { error: triggerError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          worker_status: 'eliza_processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (triggerError) {
        console.error(`❌ [WEBHOOK:TRIGGER_ERROR] Failed to signal worker:`, triggerError.message);
      }

      console.log(`✅ [WEBHOOK:SUCCESS] Message saved. Worker signaled for Profile: ${profile.id}`);
      return NextResponse.json({ success: true });
    }

    // Default response for unhandled events
    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error: any) {
    console.error('❌ [WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
