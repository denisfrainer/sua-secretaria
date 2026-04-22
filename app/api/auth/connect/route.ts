import { NextResponse, NextRequest } from 'next/server';
import { signOnboardingToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('id');

  if (!profileId) {
    return new Response('Profile ID is required', { status: 400 });
  }

  try {
    // 1. Generate the secure JWT state (exactly as in the old generator)
    const state = await signOnboardingToken(profileId);

    // 2. Construct the Google OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sua-secretaria.netlify.app';
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';

    if (!clientId) {
      console.error('💣 [OAUTH:CONNECT] GOOGLE_CLIENT_ID missing');
      return new Response('Configuração de autenticação incompleta', { status: 500 });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log(`🔗 [OAUTH:CONNECT] Redirecting profile ${profileId} to Google`);

    // 3. Transparently redirect
    return NextResponse.redirect(googleAuthUrl);
  } catch (error: any) {
    console.error('💥 [OAUTH:CONNECT] Redirect failed:', error.message);
    return new Response('Erro ao iniciar conexão com Google', { status: 500 });
  }
}
