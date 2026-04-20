import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const origin = request.nextUrl.origin;
  
  // 1. Security tokens for both Auth (Login) and Integration flows
  const state = crypto.randomBytes(32).toString('hex');
  const rawNonce = crypto.randomBytes(32).toString('base64url');
  
  // Supabase's signInWithIdToken hashes the incoming nonce.
  // We must pass the hashed nonce to Google so the ID token's claim matches the hash.
  const hashedNonce = crypto.createHash('sha256').update(rawNonce).digest('hex');
  
  // Store security identifiers in HTTP-only cookies
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

  // 2. Initialize Native Google OAuth2 Client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/google/callback`
  );

  // 3. Request broad scopes to support both Login and Calendar Integration
  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.freebusy'
  ];

  // 4. Generate URL with explicit offline access and consent
  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Mandatory for refresh_token
    prompt: 'consent',     // Forces refresh_token delivery
    scope: scopes,
    state: state,
    nonce: hashedNonce,
  });

  console.log('🚀 [CUSTOM_OAUTH] Initiating native flow from origin:', origin);
  return NextResponse.redirect(authorizationUrl);
}
