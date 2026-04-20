import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const requestUrl = new URL(request.url);

  // 1. Generate CSRF Security State
  const state = crypto.randomBytes(32).toString('hex');
  cookieStore.set('oauth_state', state, {
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    path: '/', 
    sameSite: 'lax', 
    maxAge: 60 * 10 // 10 minutes
  });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('❌ [OAUTH:LOGIN] Missing GOOGLE_CLIENT_ID environment variable');
    return NextResponse.redirect(new URL('/dashboard?error=missing_client_id', requestUrl.origin));
  }

  // 2. Dynamic Redirect URI (Kill Hardcoded Legacy Domains)
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? requestUrl.origin 
    : (process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin);

  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  
  console.log('🚀 [OAUTH:LOGIN] Initiating sync flow. Redirect URI:', redirectUri);

  // 3. Construct Authorization URL with Offline Access
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    // Requesting broad calendar scopes to ensure Eliza can read and write
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',
    state: state,
    access_type: 'offline', // Mandatory to receive refresh_token
    prompt: 'consent'       // Mandatory to ensure refresh_token is sent every time during testing
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
