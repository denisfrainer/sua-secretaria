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
    const cookieStore = cookies();
    
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
        console.log('✅ [AUTH CALLBACK] Session established. Persisting Identity/Config...');

        // 1. IDENTITY PERSISTENCE (Profiles)
        const profileData = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || '',
          updated_at: new Date().toISOString(),
          google_refresh_token: session.provider_refresh_token || null
        };

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });

        if (profileError) console.error('❌ [PROFILES ERROR]:', profileError.message);

        // 2. BUSINESS CONFIG Gating
        const { data: configData } = await supabaseAdmin
          .from('business_config')
          .select('id')
          .eq('owner_id', session.user.id)
          .maybeSingle();

        if (!configData) {
          console.log('🆕 [DB] New user detected. Creating initial business_config...');
          
          const defaultContext = {
            business_info: { name: 'Meu Studio', address: '', parking: '', handoff_phone: '' },
            operating_hours: {
              weekdays: { open: '09:00', close: '18:00', is_closed: false },
              saturday: { open: '09:00', close: '13:00', is_closed: false },
              sunday: { open: '09:00', close: '18:00', is_closed: true },
              observations: ''
            },
            services: [],
            scheduling_rules: [],
            restrictions: [],
            tone_of_voice: { base_style: 'Profissional', custom_instructions: '' },
            payment_info: { pix_type: '', pix_key: '', owner_name: '' },
            booking_policies: { minimum_advance_notice: '2 horas', buffer_time_minutes: '15' },
            faq: [],
            updated_at: new Date().toISOString()
          };

          await supabaseAdmin
            .from('business_config')
            .insert({ 
              owner_id: session.user.id, 
              context_json: defaultContext
            });
        }
      }

      // CRITICAL: We redirect to a clean URL without the ?code parameter.
      // This prevents the client-side Supabase library from triggering a duplicate PKCE exchange.
      return NextResponse.redirect(new URL(next, origin));

    } catch (err: any) {
      console.error('💥 [AUTH CALLBACK] Unexpected error:', err.message);
    }
  }

  // Fallback if no code or error caught
  return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
}
