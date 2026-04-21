import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = (Array.isArray(body.data) ? body.data[0] : body.data) || body;
    const key = data.key;
    
    if (!key) return NextResponse.json({ success: true, message: 'No key found' });

    // 1. ATOMIC IDENTITY LOCK
    const rawPhone = key.remoteJid.replace('@s.whatsapp.net', '');
    const phone = normalizePhone(rawPhone);
    const isFromMe = key.fromMe === true;

    // Detect message types
    const messageObj = data.message || {};
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

    // 2. ATOMIC UPSERT (Guarantees UUID exists)
    const { data: profile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        phone,
        worker_status: 'eliza_processing',
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone' })
      .select()
      .single();

    if (upsertError || !profile) {
      console.error('💥 [WEBHOOK:UPSERT_ERROR]', upsertError);
      return NextResponse.json({ success: false, error: 'Identity lock failed' }, { status: 200 });
    }

    // 3. PERSIST MESSAGE (Context Window)
    // We save text or special placeholder for media
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
      console.warn(`⚠️ [WEBHOOK:MSG_ERROR] Could not save message:`, msgError.message);
    }

    console.log(`✅ [WEBHOOK:SUCCESS] Profile locked: ${profile.id}. Worker triggered.`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ [WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
