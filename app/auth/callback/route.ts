import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  
  // 1. Catch Supabase Auth Errors (e.g., Database Trigger failures)
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error || errorDescription) {
    console.error('[AUTH_CALLBACK_ERROR] Supabase reported an error:', { error, errorDescription });
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('auth_error', error || 'signup_failed');
    if (errorDescription) loginUrl.searchParams.set('error_description', errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Process OAuth Code Exchange
  if (code) {
    const cookieStore = await cookies();
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
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (err) {
              // This can be ignored if the middleware is handling refresh
            }
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
          plan_tier: 'FREE', // Initial signup is FREE
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

      // Final redirect to next (preserving full origin to avoid relative path issues)
      return NextResponse.redirect(new URL(next, origin));
    }
    
    console.error('[AUTH_CALLBACK_ERROR] Exchange failed:', exchangeError?.message);
  }

  // Fallback to error page
  return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
}
