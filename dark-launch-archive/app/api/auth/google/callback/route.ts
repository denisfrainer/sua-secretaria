import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyOnboardingToken } from '@/lib/auth/jwt';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('\n--- 🛡️ GOOGLE CALLBACK START ---');
  
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');

  console.log('1. Authorization code received:', !!code);
  console.log('2. State token received:', !!state);
  console.log('3. Error from Google:', error || 'none');

  // 1. Validate Google OAuth Errors
  if (error) {
    console.error('💥 [OAUTH:CALLBACK] Google reported an error:', error);
    return NextResponse.redirect(new URL(`/dashboard/settings/integrations?error=${error}`, requestUrl.origin));
  }

  // ================================================================
  // 2. IDENTIFY THE USER
  //    Two strategies: JWT state (headless/onboarding) or Supabase session (dashboard)
  // ================================================================
  let profileId: string | null = null;

  if (state) {
    // Strategy A: JWT-encoded state from headless/onboarding flows
    profileId = await verifyOnboardingToken(state);
    console.log('4a. JWT state decoded profileId:', profileId || 'FAILED');
  }

  if (!profileId) {
    // Strategy B: Active Supabase session from dashboard flow
    // The /api/auth/google route uses cookie-based CSRF state, NOT a JWT state.
    // When initiated from the dashboard, the user has an active session.
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        profileId = user.id;
        console.log('4b. Supabase session profileId:', profileId);
      }
    } catch (e) {
      console.warn('4b. Supabase session lookup failed:', e);
    }
  }

  if (!profileId) {
    console.error('💥 [OAUTH:CALLBACK] Could not identify user from state or session.');
    return NextResponse.redirect(new URL('/login?error=invalid_state', requestUrl.origin));
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
    
    console.log('5. Token exchange HTTP status:', tokenResponse.status);
    console.log('6. Refresh Token extracted:', !!tokenData.refresh_token);
    console.log('7. Access Token extracted:', !!tokenData.access_token);
    
    if (!tokenResponse.ok) {
      console.error('💥 [OAUTH:CALLBACK] Token exchange failed:', tokenData);
      throw new Error(tokenData.error_description || 'Token exchange failed');
    }

    if (!tokenData.refresh_token) {
      console.warn('⚠️ [OAUTH:CALLBACK] No refresh token returned. User might need to re-consent with prompt=consent.');
    }

    // ================================================================
    // 4. PERSIST REFRESH TOKEN TO PROFILES TABLE
    //    BUG FIX: `undefined` is silently dropped by Supabase .update().
    //    We must use `null` coalescing, never `|| undefined`.
    // ================================================================
    const refreshTokenValue = tokenData.refresh_token || null;

    console.log('8. Value to write to DB (google_refresh_token):', refreshTokenValue ? `${refreshTokenValue.substring(0, 10)}...` : 'NULL - WILL NOT UPDATE');

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    // Only write the token if we actually received one.
    // If Google didn't send a refresh_token (re-auth without prompt=consent),
    // we must NOT overwrite the existing one with null.
    if (refreshTokenValue) {
      updatePayload.google_refresh_token = refreshTokenValue;
    }

    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', profileId)
      .select('id, google_refresh_token')
      .single();

    if (updateError) {
      console.error('💥 [OAUTH:CALLBACK] DB update failed:', updateError);
      throw updateError;
    }

    console.log('9. DB write confirmed. google_refresh_token is now:', updateResult?.google_refresh_token ? 'SET' : 'STILL NULL');

    // ================================================================
    // 5. ALSO PERSIST TO BUSINESS_CONFIG (Dual-Write for Eliza Worker)
    // ================================================================
    const { data: bConfig } = await supabaseAdmin
      .from('business_config')
      .select('id, context_json')
      .eq('owner_id', profileId)
      .maybeSingle();

    if (bConfig) {
      const existingContext = bConfig.context_json || {};
      await supabaseAdmin
        .from('business_config')
        .update({
          context_json: {
            ...existingContext,
            google_calendar: {
              ...(existingContext.google_calendar || {}),
              refresh_token: refreshTokenValue || existingContext.google_calendar?.refresh_token,
              access_token: tokenData.access_token,
              expiry_date: tokenData.expires_in
                ? Date.now() + tokenData.expires_in * 1000
                : undefined,
              updated_at: new Date().toISOString(),
            },
          },
        })
        .eq('id', bConfig.id);

      console.log('10. business_config context_json updated with calendar tokens.');
    } else {
      console.warn('⚠️ [OAUTH:CALLBACK] Business configuration not found for user ID:', profileId, '— Skipping context_json write. This is OK for first-time users.');
    }

    console.log(`✅ [OAUTH:CALLBACK] Complete. Redirecting to integrations page.`);
    console.log('--- 🛡️ GOOGLE CALLBACK END ---\n');

    // 6. Success Redirect — back to integrations page so user sees the green status
    return NextResponse.redirect(new URL('/dashboard/settings/integrations?success=google_connected', requestUrl.origin));

  } catch (err: any) {
    console.error('💥 [OAUTH:CALLBACK] Unexpected error:', err.message);
    console.log('--- 🛡️ GOOGLE CALLBACK END (ERROR) ---\n');
    return NextResponse.redirect(new URL(`/dashboard/settings/integrations?error=sync_failed&message=${encodeURIComponent(err.message)}`, requestUrl.origin));
  }
}
