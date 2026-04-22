import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dataObj = (Array.isArray(body.data) ? body.data[0] : body.data) || body;

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
    // We do NOT set worker_status here to prevent the worker from polling 
    // a profile before its message is persisted.
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
    // This MUST happen before reaching the Worker.
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
    // Now that the context is safe in the DB, we signal the worker.
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

  } catch (error: any) {
    console.error('❌ [WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
