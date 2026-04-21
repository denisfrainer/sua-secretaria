import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';

// JSON Schema for Onboarding Extraction
// (Move this to worker or keep here for shared use)

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body.data || body;
    const key = data.key;
    if (!key) return NextResponse.json({ success: true, message: 'No key found' });

    // 1. ATOMIC IDENTITY LOCK
    const rawPhone = key.remoteJid.replace('@s.whatsapp.net', '');
    const phone = normalizePhone(rawPhone);
    const messageText = data.message?.conversation || 
                       data.message?.extendedTextMessage?.text || "";

    if (!messageText && !data.message?.imageMessage) {
      return NextResponse.json({ success: true, message: 'Empty message ignored' });
    }

    console.log(`📡 [WEBHOOK] Inbound: ${phone} | State: Locking Profile...`);

    // 2. ATOMIC UPSERT (Guarantees UUID exists)
    const { data: user, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        phone,
        worker_status: 'eliza_processing',
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone' })
      .select()
      .single();

    if (upsertError || !user) {
      console.error('💥 [WEBHOOK:UPSERT_ERROR]', upsertError);
      throw new Error('Failed to lock profile identity');
    }

    console.log(`✅ [WEBHOOK:IDENTITY] Profile secured: ${user.id} | Status: eliza_processing`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ [WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}



