import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
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

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && session?.user) {
      console.log('[AUTH_CALLBACK] Code exchanged successfully.');

      // Persist Google Refresh Token if available (for future calendar syncs)
      const providerRefreshToken = session.provider_refresh_token;
      if (providerRefreshToken) {
        console.log('[AUTH_CALLBACK] Capturing Google Refresh Token...');
        await supabaseAdmin
          .from('profiles')
          .update({ google_refresh_token: providerRefreshToken })
          .eq('id', session.user.id);
      }

      // Return NextResponse.redirect to ensure cookies are attached to the browser response.
      return NextResponse.redirect(new URL(next, origin));
    }
    
    console.error('[AUTH_CALLBACK_ERROR] Exchange failed:', error?.message);
  }

  // Fallback to error page if something went wrong
  return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
}
