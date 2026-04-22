import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppImage } from '@/lib/whatsapp/sender';
import { getPairingData } from '@/lib/evolution/pairing';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const signature = req.headers.get('x-pagarme-signature'); // Placeholder for actual validation if needed
    const webhookSecret = process.env.PAGARME_WEBHOOK_SECRET;

    // 1. Mock Secret Validation
    if (webhookSecret && signature !== webhookSecret) {
      console.warn('⚠️ [PAGARME_WEBHOOK] Signature mismatch. (Proceeding for mock/dev)');
    }

    console.log('📦 [PAGARME_WEBHOOK] Received payload:', body.type);

    // 2. Filter for order.paid
    if (body.type !== 'order.paid') {
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    // 3. Identify User
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

    // 5. Trigger Pairing Data (Step 5)
    // Now returns both pairing code, QR base64 and the Unique Instance Name
    const { pairingCode, qrBase64, instanceName } = await getPairingData(phone);
    
    console.log(`📡 [WEBHOOK] Executing multimodal delivery check (QR: ${!!qrBase64}, Code: ${!!pairingCode})`);

    // 5.1 SYNC DATABASE (business_config)
    if (instanceName) {
      console.log(`📡 [WEBHOOK] Syncing unique instance to DB (UPSERT): ${instanceName}`);
      
      const defaultContext = {
        business_info: { name: "Nova SecretarIA", description: "Configuração em andamento" },
        services: [],
        faq: []
      };

      const { error: syncError } = await supabaseAdmin
        .from('business_config')
        .upsert({ 
          owner_id: profile.id,
          instance_name: instanceName,
          status: 'CONNECTING',
          context_json: defaultContext,
          updated_at: new Date().toISOString()
        }, { onConflict: 'owner_id' });

      if (syncError) {
        console.error('❌ [WEBHOOK] [DB_SYNC_ERROR]', syncError);
      } else {
        console.log(`✅ [WEBHOOK] [DB_SYNC_SUCCESS] Instance saved to business_config for owner ${profile.id}`);
      }
    }

    // 6. MULTIMODAL DELIVERY
    
    // Case A: Image (Plan B)
    if (qrBase64) {
      try {
        await sendWhatsAppImage(
          phone, 
          qrBase64, 
          "📸 Escaneie este QR Code com outro aparelho para conectar agora."
        );
      } catch (err) {
        console.error("⚠️ [WEBHOOK] Failed to send QR Image, continuing to text.");
      }
    }

    // Small delay between image and text
    await new Promise(res => setTimeout(res, 2000));

    // Case B: Text (Plan A - Pairing Code)
    let elizaMessage = `✅ *Pagamento Confirmado!* Parabéns, agora você é um cliente ELITE da Sua SecretarIA.\n\nSua assistente já está pronta para trabalhar. Como sua conta é nova, você precisa conectar seu WhatsApp no nosso painel.\n\n` +
      `Tente o *Código de Pareamento* abaixo primeiro (mais fácil):\n` +
      `👉 *${pairingCode || 'GERANDO...'}*\n\n` +
      `*Como fazer:* WhatsApp > Aparelhos Conectados > Conectar com número.\n\n` +
      `---\n` +
      `*PLAN B:* Se o código der erro, use o *QR Code* que enviei acima!`;
    
    if (!pairingCode) {
      elizaMessage = `✅ *Pagamento Confirmado!* Parabéns, agora você é um cliente ELITE da Sua SecretarIA.\n\nNotei que a geração do seu código está demorando um pouco mais que o esperado. ⏳\n\nNão se preocupe, sua conta já está ATIVA! Nosso suporte entrará em contato em instantes com seu código de acesso manual.`;
    }
    
    await sendWhatsAppMessage(phone, elizaMessage);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('💥 [PAGARME_WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
