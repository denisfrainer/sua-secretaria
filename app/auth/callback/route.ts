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
    return NextResponse.redirect(`${origin}/?error=no_code`);
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

  const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  
  if (exchangeError) {
    console.error(`❌ [AUTH CALLBACK] Exchange Failed: ${exchangeError.message}`);
    return NextResponse.redirect(`${origin}/admin/login?error=exchange_failed`);
  }

  if (session?.user && session.provider_refresh_token) {
    console.log("✅ [AUTH CALLBACK] Session verified. Token grabbed. Bypassing RLS...");

    // 2. DEFENSIVE WRITE: Check if business_config exists (Race Condition Shield)
    // We use session.provider_refresh_token directly from the exchange
    const { data: existingRow } = await supabaseAdmin
      .from('business_config')
      .select('id')
      .eq('owner_id', session.user.id)
      .single();

    const providerRefreshToken = session.provider_refresh_token;

    if (existingRow) {
      // Row exists -> UPDATE
      const { error: updateError } = await supabaseAdmin
        .from('business_config')
        .update({ google_refresh_token: providerRefreshToken })
        .eq('owner_id', session.user.id);
      
      if (updateError) console.error('❌ [DB UPDATE ERROR]:', updateError.message);
      else console.log('✅ [DB UPDATE SUCCESS]: Token persisted for user:', session.user.id);
    } else {
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
          google_refresh_token: providerRefreshToken,
          context_json: defaultContext
        });

      if (insertError) console.error('❌ [DB INSERT ERROR]:', insertError.message);
      else console.log('✅ [DB INSERT SUCCESS]: Business config created for user:', session.user.id);
    }
  }

  // The browser now has the session cookies. Redirect to intended destination.
  return NextResponse.redirect(`${origin}${next}`);
}
