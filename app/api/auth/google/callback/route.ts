import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyOnboardingToken } from '@/lib/auth/jwt';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sender';
import { getPairingCode } from '@/lib/evolution/pairing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');

  // 1. Validate Google OAuth Errors
  if (error) {
    console.error('💥 [OAUTH:CALLBACK] Google reported an error:', error);
    return NextResponse.redirect(new URL(`/dashboard?error=${error}`, requestUrl.origin));
  }

  // 2. Validate JWT State (Headless Identification)
  if (!state) {
    console.error('💥 [OAUTH:CALLBACK] No state provided.');
    return NextResponse.redirect(new URL('/login?error=invalid_state', requestUrl.origin));
  }

  const profileId = await verifyOnboardingToken(state);
  if (!profileId) {
    console.error('💥 [OAUTH:CALLBACK] Invalid or expired JWT state.');
    return NextResponse.redirect(new URL('/login?error=expired_state', requestUrl.origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const baseUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : (process.env.NEXT_PUBLIC_SITE_URL || 'https://sua-secretaria.netlify.app');
    
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    console.log(`🔗 [OAUTH:CALLBACK] Exchanging code for profile: ${profileId}`);
    
    // 3. Exchange Code for Tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: code!,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('💥 [OAUTH:CALLBACK] Token exchange failed:', tokenData);
      throw new Error(tokenData.error_description || 'Token exchange failed');
    }

    if (!tokenData.refresh_token) {
      console.warn('⚠️ [OAUTH:CALLBACK] No refresh token returned. User might need to re-consent.');
    }

    // 4. Fetch Profile to get phone number
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', profileId)
      .single();

    if (!profile || !profile.phone) {
      throw new Error('Profile or phone not found for token update');
    }

    // 5. Persist Refresh Token & Transition State
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        google_refresh_token: tokenData.refresh_token || undefined,
        conversation_state: 'PAYWALL',
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (updateError) {
      console.error('💥 [OAUTH:CALLBACK] DB update failed:', updateError);
      throw updateError;
    }

    console.log(`✅ [AUTH_SYNC] Refresh token captured for user: ${profileId}`);

    // 6. TRIGGER ELIZA - Headless pairing and payment link
    const pairingCode = await getPairingCode(profile.phone);
    const checkoutLink = "https://suasecretaria.com.br/precos";
    
    const elizaMessage = `🎯 *Agenda Conectada com Sucesso!*\n\nAgora só falta o passo final para sua assistente começar a trabalhar no seu número oficial.\n\nFiz o seguinte:\n1. Gerei seu código de pareamento: *${pairingCode || 'GERANDO...'}*\n2. Liberei o acesso ao seu painel.\n\n*O que fazer agora?*\nNo seu WhatsApp, vá em *Aparelhos Conectados* > *Conectar com número de telefone* e insira o código acima.\n\nPara ativar o plano e começar hoje mesmo: ${checkoutLink}`;
    
    await sendWhatsAppMessage(profile.phone, elizaMessage);

    // 7. Success Redirect
    return NextResponse.redirect(new URL('/auth/success', requestUrl.origin));

  } catch (err: any) {
    console.error('💥 [OAUTH:CALLBACK] Unexpected error:', err.message);
    return NextResponse.redirect(new URL(`/dashboard?error=sync_failed&message=${encodeURIComponent(err.message)}`, requestUrl.origin));
  }
}

