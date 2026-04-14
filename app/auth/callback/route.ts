import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  
  // 1. Catch Supabase Auth Errors
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error || errorDescription) {
    console.error('[AUTH_CALLBACK_ERROR] Supabase reported an error:', { error, errorDescription });
    const loginUrl = new URL('/login', request.nextUrl.origin);
    loginUrl.searchParams.set('auth_error', error || 'signup_failed');
    if (errorDescription) loginUrl.searchParams.set('error_description', errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  // Define the base redirect target using the EXACT request origin
  const finalRedirect = new URL(next, request.nextUrl.origin);
  
  // Construct the response EARLY so we can attach cookies directly to it
  const response = NextResponse.redirect(finalRedirect);

  // 2. Process OAuth Code Exchange
  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // WARNING: We strip out the `domain` option unconditionally.
              // This allows Netlify dynamically generated subdomains (deploy previews) to accept the cookie.
              // If you force a domain like '.suasecretaria.com', previews at 'xxx--suasecretaria.netlify.app' will drop it!
              const { domain: _domain, ...safeOptions } = options;
              
              response.cookies.set({
                name,
                value,
                ...safeOptions,
              });
            });
          },
        },
      }
    );

    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!exchangeError && session?.user) {
      console.log('[AUTH_CALLBACK] Code exchanged successfully.');

      // Persist Google Refresh Token if available
      const providerRefreshToken = session.provider_refresh_token;
      if (providerRefreshToken) {
        await supabaseAdmin
          .from('profiles')
          .update({ google_refresh_token: providerRefreshToken })
          .eq('id', session.user.id);
      }

      // 🛡️ GUARANTEE BUSINESS CONFIG EXISTS
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

      // Return the response object WHICH NOW HAS THE COOKIES ATTACHED
      return response;
    }
    
    console.error('[AUTH_CALLBACK_ERROR] Exchange failed:', exchangeError?.message);
  }

  // Fallback to login error page if something fails
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.nextUrl.origin));
}
