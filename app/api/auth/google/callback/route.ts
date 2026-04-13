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

  // Handle Google OAuth errors (e.g., user denied)
  if (error) {
    console.error('[GOOGLE_OAUTH_ERROR]', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;
  const storedNonce = cookieStore.get('oauth_nonce')?.value;

  // Validate state to prevent CSRF attacks
  if (!storedState || state !== storedState) {
    console.error('[GOOGLE_OAUTH_ERROR] State mismatch');
    const response = NextResponse.redirect(new URL('/login?error=invalid_state', requestUrl.origin));
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_nonce');
    return response;
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('[GOOGLE_OAUTH_ERROR] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return NextResponse.redirect(new URL('/login?error=server_configuration', requestUrl.origin));
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://meatendeai.netlify.app';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange the Authorization Code for an ID Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[GOOGLE_OAUTH_ERROR] Token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', requestUrl.origin));
    }

    const { id_token, access_token } = tokenData;

    if (!id_token) {
      console.error('[GOOGLE_OAUTH_ERROR] No ID token received');
      return NextResponse.redirect(new URL('/login?error=no_id_token', requestUrl.origin));
    }

    // 2. Initialize Supabase SSR Client natively to prevent Netlify cookie dropping
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                const { domain: _domain, ...safeOptions } = options;
                console.log(`[AUTH_CALLBACK] Setting Supabase cookie: ${name}`);
                cookieStore.set({ name, value, ...safeOptions });
              });
            } catch (error) {
              console.warn('[AUTH_CALLBACK] Warning: Unable to run setAll inside this context.', error);
            }
          },
        },
      }
    );

    // 3. Authenticate with Supabase using signInWithIdToken
    const { data: { session }, error: signInError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: id_token,
      access_token: access_token, // Optional but useful if provided
      nonce: storedNonce, // Protects against replay attacks
    });

    if (signInError || !session?.user) {
      console.error('[SUPABASE_AUTH_ERROR] signInWithIdToken failed:', signInError);
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(signInError?.message || 'auth_failed')}`, requestUrl.origin));
    }

    console.log('[AUTH_CALLBACK] Login successful with Google ID Token.');

    // 4. Clean up the security cookies securely via cookieStore
    try {
      console.log('[AUTH_CALLBACK] Cleaning up security cookies.');
      cookieStore.delete('oauth_state');
      cookieStore.delete('oauth_nonce');
    } catch (e) {
      console.warn('[AUTH_CALLBACK] Could not delete security cookies:', e);
    }

    // 5. 🛡️ GUARANTEE BUSINESS CONFIG EXISTS (Ported from old callback)
    const { data: existingConfig } = await supabaseAdmin
      .from('business_config')
      .select('id')
      .eq('owner_id', session.user.id)
      .maybeSingle();

    if (!existingConfig) {
      console.log(`[AUTH_CALLBACK] Creating default config for ${session.user.id}`);
      await supabaseAdmin.from('business_config').insert({
        owner_id: session.user.id,
        plan_tier: 'FREE',
        instance_name: null,
        context_json: {
          is_ai_enabled: true,
          connection_status: 'DISCONNECTED',
          business_info: { name: '', address: '', parking: '', handoff_phone: '' },
          operating_hours: {
            weekdays: { open: "09:00", close: "18:00", is_closed: false },
            saturday: { open: "09:00", close: "13:00", is_closed: false },
            sunday: { open: "00:00", close: "00:00", is_closed: true },
            observations: ""
          },
          services: [],
          updated_at: new Date().toISOString()
        }
      });
    }

    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));

  } catch (err) {
    console.error('[AUTH_CALLBACK] Unexpected server error:', err);
    return NextResponse.redirect(new URL('/login?error=internal_server_error', requestUrl.origin));
  }
}
