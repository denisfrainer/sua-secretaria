import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';
import { sendWhatsAppMessage } from '@/lib/evolution/sender';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório.' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const emailMask = `${normalizedPhone}@was.app`;

    console.log(`[AUTH:OTP-REQ] Início do fluxo para final: ${normalizedPhone.slice(-4)}`);

    // 1. Validate if user exists
    console.log(`🔍 [AUTH] Looking up profile by phone:`, normalizedPhone);
    const startProfileLat = performance.now();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, phone')
      .eq('phone', normalizedPhone)
      .single();
    
    if (profileError || !profile) {
      console.error(`❌ [AUTH:OTP-REQ] Phone ${normalizedPhone} not found in profiles.`);
      return NextResponse.json({ error: 'Nenhuma conta encontrada com este número.' }, { status: 404 });
    }
    console.log(`[AUTH:OTP-REQ] Latência para checar profiles: ${(performance.now() - startProfileLat).toFixed(2)}ms`);
    
    const userId = profile.id;

    // 2. Check Rate Limit (max 3 per hour)
    const startRateLat = performance.now();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from('otp_resets')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', normalizedPhone)
      .gte('created_at', oneHourAgo);

    console.log(`[AUTH:OTP-REQ] Latência para checar rate limit: ${(performance.now() - startRateLat).toFixed(2)}ms`);

    if (countError) {
      console.error('[AUTH:OTP-REQ] Erro ao verificar rate limit:', countError);
    } else if (count !== null && count >= 3) {
      console.log(`[AUTH:OTP-REQ] Rate limit atingido para: ${normalizedPhone.slice(-4)}`);
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 1 hora.' }, { status: 429 });
    }

    // 3. Generate Code and Store
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes form now

    console.log(`[AUTH:OTP-REQ] Gerando código de 6 dígitos...`);

    const startInsertLat = performance.now();
    const { error: insertError } = await supabaseAdmin
      .from('otp_resets')
      .insert({
        phone_number: normalizedPhone,
        code: otpCode,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('[AUTH:OTP-REQ] Erro ao inserir código no Supabase:', insertError);
      return NextResponse.json({ error: 'Erro interno ao gerar o código.' }, { status: 500 });
    }
    console.log(`[AUTH:OTP-REQ] Latência para inserir OTP: ${(performance.now() - startInsertLat).toFixed(2)}ms`);

    // 4. Resolve Instance for Sending
    const { data: bConfig } = await supabaseAdmin
      .from('business_config')
      .select('instance_name')
      .eq('owner_id', userId)
      .maybeSingle();

    const targetInstance = bConfig?.instance_name || `${process.env.NEXT_PUBLIC_INSTANCE_PREFIX || 'secretaria'}-master`;

    // 5. Dispatch via Evolution API
    const message = `Seu código de acesso para a SecretarIA é: *${otpCode}*`;
    
    const startEvoLat = performance.now();
    await sendWhatsAppMessage(normalizedPhone, message, undefined, targetInstance);
    console.log(`[AUTH:OTP-REQ] Latência Evolution API (${targetInstance}): ${(performance.now() - startEvoLat).toFixed(2)}ms`);

    return NextResponse.json({ success: true, message: 'Código enviado com sucesso.' });

  } catch (error: any) {
    console.error('❌ [AUTH:OTP-REQ] Error:', error.message);
    return NextResponse.json({ error: 'Ocorreu um erro ao processar sua solicitação.' }, { status: 500 });
  }
}
