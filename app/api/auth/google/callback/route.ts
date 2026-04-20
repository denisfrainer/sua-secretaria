import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');

  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;

  // 1. Validate Google OAuth Errors
  if (error) {
    console.error('💥 [OAUTH:CALLBACK] Google reported an error:', error);
    return NextResponse.redirect(new URL(`/dashboard?error=${error}`, requestUrl.origin));
  }

  // 2. Validate Security State (CSRF)
  if (!storedState || state !== storedState) {
    console.error('💥 [OAUTH:CALLBACK] State mismatch or expired. Stored:', storedState, 'Received:', state);
    return NextResponse.redirect(new URL('/dashboard?error=invalid_state', requestUrl.origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // STRICT URL RESOLUTION: Prevents Netlify Deploy Previews from hijacking the redirect URI
  const baseUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : (process.env.NEXT_PUBLIC_SITE_URL || 'https://sua-secretaria.netlify.app');
    
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    console.log('🔗 [OAUTH:CALLBACK] Exchanging code for tokens...');
    
    // 3. Exchange Code for Tokens Natively (Bypassing Supabase managed flow)
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

    console.log('🔑 [OAUTH:CALLBACK] Refresh Token received:', !!tokenData.refresh_token);

    // 4. Identify the Authenticated User (WhatsApp OTP session)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options })
            );
          },
        },
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ [OAUTH:CALLBACK] No active Supabase session found.');
      return NextResponse.redirect(new URL('/login?error=unauthorized_sync', requestUrl.origin));
    }

    console.log('👤 [OAUTH:CALLBACK] Linking token to user:', user.id);

    // 5. Persist Refresh Token to profiles table
    if (tokenData.refresh_token) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          google_refresh_token: tokenData.refresh_token,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('💥 [OAUTH:CALLBACK] Failed to save token to database:', updateError);
        throw updateError;
      }
      console.log('✅ [OAUTH:CALLBACK] Token successfully persisted to profile.');
    } else {
      console.warn('⚠️ [OAUTH:CALLBACK] No refresh token returned. Did user already consent?');
    }

    // Cleanup state cookie
    cookieStore.delete('oauth_state');

    // Return to dashboard with success signal
    return NextResponse.redirect(new URL('/dashboard?sync=success', requestUrl.origin));

  } catch (err: any) {
    console.error('💥 [OAUTH:CALLBACK] Unexpected error:', err.message);
    return NextResponse.redirect(new URL(`/dashboard?error=sync_failed&message=${encodeURIComponent(err.message)}`, requestUrl.origin));
  }
}
