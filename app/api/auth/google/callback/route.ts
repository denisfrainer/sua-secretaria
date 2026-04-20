import { NextResponse, NextRequest } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');
  const origin = requestUrl.origin;

  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;
  const storedNonce = cookieStore.get('oauth_nonce')?.value;

  // 1. Handle Google OAuth errors
  if (error) {
    console.error('💥 [CUSTOM_OAUTH] Google reported an error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', origin));
  }

  // 2. Validate State (CSRF Protection)
  if (!storedState || state !== storedState) {
    console.error('💥 [CUSTOM_OAUTH] State mismatch or expired.');
    return NextResponse.redirect(new URL('/login?error=invalid_state', origin));
  }

  try {
    // 3. Initialize Google OAuth2 Client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${origin}/api/auth/google/callback`
    );

    // 4. Exchange code for tokens natively
    const { tokens } = await oauth2Client.getToken(code);
    console.log('🔑 [CUSTOM_OAUTH] Tokens extracted. ID Token:', !!tokens.id_token, 'Refresh Token:', !!tokens.refresh_token);

    // 5. Detect Flow Path (Auth vs Integration)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // --- PATH A: INTEGRATION (User already logged in) ---
      console.log('✅ [CUSTOM_OAUTH] Integration path for user:', user.id);
      
      if (tokens.refresh_token) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            google_refresh_token: tokens.refresh_token,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
        console.log('✅ [CUSTOM_OAUTH] Integration saved successfully.');
      } else {
        console.warn('⚠️ [CUSTOM_OAUTH] No refresh token returned during integration.');
      }

      return NextResponse.redirect(new URL('/dashboard?sync=success', origin));

    } else {
      // --- PATH B: AUTHENTICATION (Login flow) ---
      console.log('🚀 [CUSTOM_OAUTH] Authentication path (Login).');

      if (!tokens.id_token) {
        throw new Error('No ID Token returned from Google for authentication.');
      }

      const { data: authData, error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.id_token,
        nonce: storedNonce, // Matches the rawNonce we stored in cookie
      });

      if (signInError) throw signInError;
      console.log('✅ [CUSTOM_OAUTH] Login successful for user:', authData.user?.id);

      // Also persist refresh token during login if it's the first time
      if (tokens.refresh_token && authData.user) {
         await supabaseAdmin
          .from('profiles')
          .update({ google_refresh_token: tokens.refresh_token })
          .eq('id', authData.user.id);
      }

      return NextResponse.redirect(new URL('/dashboard', origin));
    }

  } catch (err: any) {
    console.error('💥 [CUSTOM_OAUTH] Server Error:', err.message);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(err.message)}`, origin));
  } finally {
    // Cleanup security cookies
    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_nonce');
  }
}
