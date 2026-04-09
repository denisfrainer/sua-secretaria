import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Default to dashboard, but ensure we strip any auth-related query params
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    try {
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('[AUTH_CALLBACK_ERROR] PKCE Exchange failed:', exchangeError.message);
        return NextResponse.redirect(new URL('/login?error=exchange_failed', origin));
      }

      if (session?.user) {
        console.log('✅ [AUTH CALLBACK] Session established. Provisioning handled by DB Trigger.');

        // 1. PROVIDER TOKEN PERSISTENCE (Only if present)
        // Note: The database trigger creates the profile, we only update the refresh token here
        // as it is only available during the OAuth handshake.
        const providerRefreshToken = session.provider_refresh_token;
        if (providerRefreshToken) {
          console.log('🔑 [AUTH CALLBACK] Capturing Google Refresh Token...');
          await supabaseAdmin
            .from('profiles')
            .update({ google_refresh_token: providerRefreshToken })
            .eq('id', session.user.id);
        }
      }

      // CRITICAL: We redirect to a clean URL without the ?code parameter.
      return NextResponse.redirect(new URL(next, origin));

    } catch (err: any) {
      console.error('💥 [AUTH CALLBACK] Unexpected error:', err.message);
    }
  }

  // Fallback if no code or error caught
  return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
}
