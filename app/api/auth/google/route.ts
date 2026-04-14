import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const requestUrl = new URL(request.url);
  
  // Generate a random state and raw nonce to prevent CSRF and replay attacks
  const state = crypto.randomBytes(32).toString('hex');
  const rawNonce = crypto.randomBytes(32).toString('base64url'); // Using base64url is recommended for nonces
  
  // Supabase's signInWithIdToken hashes the incoming nonce.
  // We must pass the hashed nonce to Google so the ID token's claim matches the hash.
  const hashedNonce = crypto.createHash('sha256').update(rawNonce).digest('hex');
  
  // Store state and RAW nonce in HTTP-only cookies
  cookieStore.set('oauth_state', state, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    path: '/', 
    sameSite: 'lax',
    maxAge: 60 * 10 // 10 minutes
  });
  
  cookieStore.set('oauth_nonce', rawNonce, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    path: '/', 
    sameSite: 'lax',
    maxAge: 60 * 10 
  });

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('[GOOGLE_AUTH] Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID');
    return NextResponse.redirect(new URL('/login?error=server_configuration', requestUrl.origin));
  }

  // Construct the redirect URI using a strict base URL to avoid Netlify deploy preview mismatches
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://suasecretaria.netlify.app';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // Build the authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    nonce: hashedNonce,
    prompt: 'select_account',
  });

  const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authorizationUrl);
}
