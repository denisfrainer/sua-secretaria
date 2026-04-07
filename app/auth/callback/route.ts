import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=no_code`);
  }

  const cookieStore = await cookies();
  
  // 1. Exchange the code for a session (This sets the local browser cookies)
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
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error(`❌ [AUTH CALLBACK] Exchange Failed: ${exchangeError.message}`);
      return NextResponse.redirect(`${origin}/admin/login?error=exchange_failed`);
    }

    if (session?.user) {
      console.log('✅ [AUTH CALLBACK] Session established. Persisting Profile Identity...');
      
      const providerRefreshToken = session.provider_refresh_token;

      if (!providerRefreshToken) {
        console.warn('⚠️ [AUTH CALLBACK] provider_refresh_token missing! Ensure Scopes include Calendar and prompt=consent.');
      } else {
        console.log('🔑 [AUTH CALLBACK] Google Refresh Token captured.');
      }

      // 2. DEFENSIVE IDENTITY WRITE (Profiles Table)
      // Only include google_refresh_token in the upsert if we actually received one
      const profileData: any = {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || '',
        updated_at: new Date().toISOString()
      };

      if (providerRefreshToken) {
        profileData.google_refresh_token = providerRefreshToken;
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) {
        console.error('❌ [PROFILES ERROR]:', profileError.message);
      } else {
        console.log('✅ [PROFILES SUCCESS]: Identity persisted for user:', session.user.id);
      }

      // 3. DEFENSIVE INSTANCE WRITE (Still needed for WhatsApp context)
      const { data: existingRow } = await supabaseAdmin
        .from('business_config')
        .select('id')
        .eq('owner_id', session.user.id)
        .single();

      if (!existingRow) {
        // New Signup -> INSERT
        console.log('🆕 [DB] New user detected. Creating business_config row...');
      
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

        const { error: insertError } = await supabaseAdmin
          .from('business_config')
          .insert({ 
            owner_id: session.user.id, 
            context_json: defaultContext
          });

        if (insertError) console.error('❌ [DB INSERT ERROR]:', insertError.message);
        else console.log('✅ [DB INSERT SUCCESS]: Business config created for user:', session.user.id);
      }
    }
  } catch (error: any) {
    console.error('💥 [AUTH CALLBACK] Unexpected error:', error.message);
  } finally {
    console.log('🏁 [AUTH CALLBACK] Finalizing request. Redirecting to:', next);
    // The browser now has the session cookies. Redirect to intended destination.
    return NextResponse.redirect(`${origin}${next}`);
  }
}
