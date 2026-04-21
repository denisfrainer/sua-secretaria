import { signOnboardingToken } from '../auth/jwt';

export async function generateGoogleAuthUrl(profileId: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sua-secretaria.netlify.app';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  
  const state = await signOnboardingToken(profileId);

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
