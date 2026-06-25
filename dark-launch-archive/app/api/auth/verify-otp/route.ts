import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/utils/phone';

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Telefone e código são obrigatórios.' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const emailMask = `${normalizedPhone}@was.app`;

    console.log(`[AUTH:OTP-VERIFY] Iniciando verificação para final: ${normalizedPhone.slice(-4)}`);

    // 1. Verify OTP in database
    const startVerifyLat = performance.now();
    const { data: otpRecords, error: otpError } = await supabaseAdmin
      .from('otp_resets')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('code', code)
      .eq('used_status', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    console.log(`[AUTH:OTP-VERIFY] Latência de checagem do OTP: ${(performance.now() - startVerifyLat).toFixed(2)}ms`);

    if (otpError || !otpRecords || otpRecords.length === 0) {
      console.log(`[AUTH:OTP-VERIFY] Código inválido, expirado ou já utilizado para: ${normalizedPhone.slice(-4)}`);
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 });
    }

    const otpId = otpRecords[0].id;

    // 2. Mark code as used
    const startUpdateLat = performance.now();
    await supabaseAdmin
      .from('otp_resets')
      .update({ used_status: true })
      .eq('id', otpId);
    console.log(`[AUTH:OTP-VERIFY] Latência update OTP: ${(performance.now() - startUpdateLat).toFixed(2)}ms`);

    // 3. Get user id from profiles table by phone
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, phone')
      .eq('phone', normalizedPhone)
      .single();

    if (profileError || !profile) {
      console.error(`❌ [AUTH:OTP-VERIFY] Phone ${normalizedPhone} not found in 'profiles' table após OTP válido.`);
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    // 4. Update core user password completely automating passwordless login
    const newPassword = crypto.randomUUID();
    const startPasswordLat = performance.now();
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { 
        password: newPassword,
        email_confirm: true 
      }
    );

    if (updateAuthError) {
      console.error('[AUTH:OTP-VERIFY] Erro ao atualizar senha no backend:', updateAuthError);
      return NextResponse.json({ error: 'Erro interno na autenticação.' }, { status: 500 });
    }
    console.log(`[AUTH:OTP-VERIFY] Latência reset de senha Admin: ${(performance.now() - startPasswordLat).toFixed(2)}ms`);

    // 5. Build session via SSR client
    const supabaseClient = await createClient(); // uses next cookies
    const startSessionLat = performance.now();
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: emailMask,
      password: newPassword
    });

    if (signInError) {
      console.error('[AUTH:OTP-VERIFY] Erro ao criar sessão SSR:', signInError);
      return NextResponse.json({ error: 'Falha ao iniciar sessão.' }, { status: 500 });
    }
    console.log(`[AUTH:OTP-VERIFY] Latência criação da Sessão SSR: ${(performance.now() - startSessionLat).toFixed(2)}ms`);
    console.log(`✅ [AUTH:OTP-VERIFY] Login passwordless efetuado com sucesso para final: ${normalizedPhone.slice(-4)}`);

    return NextResponse.json({ success: true, message: 'Autenticado com sucesso.' });

  } catch (error: any) {
    console.error('❌ [AUTH:OTP-VERIFY] Error:', error.message);
    return NextResponse.json({ error: 'Ocorreu um erro ao verificar o código.' }, { status: 500 });
  }
}
