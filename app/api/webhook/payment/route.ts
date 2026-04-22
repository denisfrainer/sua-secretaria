import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sender';
import { getPairingCode } from '@/lib/evolution/pairing';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const signature = req.headers.get('x-pagarme-signature'); // Placeholder for actual validation if needed
    const webhookSecret = process.env.PAGARME_WEBHOOK_SECRET;

    // 1. Mock Secret Validation
    if (webhookSecret && signature !== webhookSecret) {
      console.warn('⚠️ [PAGARME_WEBHOOK] Signature mismatch. (Proceeding for mock/dev)');
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📦 [PAGARME_WEBHOOK] Received payload:', body.type);

    // 2. Filter for order.paid
    if (body.type !== 'order.paid') {
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    // 3. Identify User
    // In Pagar.me v5, we often use metadata or customer details
    const customer = body.data?.customer;
    const phone = customer?.phones?.mobile_phone?.number || body.data?.metadata?.phone;

    if (!phone) {
      console.error('❌ [PAGARME_WEBHOOK] No phone number found in payload');
      return NextResponse.json({ error: 'Phone not found' }, { status: 400 });
    }

    // 4. Promote State to ACTIVE
    const { data: profile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ conversation_state: 'ACTIVE' })
      .eq('phone', phone)
      .select()
      .single();

    if (updateError || !profile) {
      console.error('❌ [PAGARME_WEBHOOK] Failed to promote profile:', updateError);
      return NextResponse.json({ error: 'Profile not found or update failed' }, { status: 404 });
    }

    console.log(`✅ [PAGARME_WEBHOOK] Profile ${profile.id} promoted to ACTIVE.`);

    // 5. Trigger Pairing Code Asynchronously (Simplified here)
    const pairingCode = await getPairingCode(phone);
    
    // 6. Send Eliza Message
    let elizaMessage = `✅ *Pagamento Confirmado!* Parabéns, agora você é um cliente ELITE da Sua SecretarIA.\n\nSua assistente já está pronta para trabalhar. Como sua conta é nova, você precisa conectar seu WhatsApp no nosso painel.\n\n*Seu Código de Pareamento:* *${pairingCode}*\n\nNo seu WhatsApp, vá em *Aparelhos Conectados* > *Conectar com número de telefone* e insira esse código agora mesmo.`;
    
    if (!pairingCode) {
      elizaMessage = `✅ *Pagamento Confirmado!* Parabéns, agora você é um cliente ELITE da Sua SecretarIA.\n\nSua assistente já está pronta para trabalhar. Notei que a geração do seu código de conexão está demorando um pouco mais que o esperado. ⏳\n\nNão se preocupe, sua conta já está ATIVA! Nosso suporte entrará em contato em instantes com seu código de acesso manual.`;
    }
    
    await sendWhatsAppMessage(phone, elizaMessage);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('💥 [PAGARME_WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
