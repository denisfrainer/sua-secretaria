import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard/agenda';

  if (!code) {
    return NextResponse.json({ error: 'OAuth code missing' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    
    // 1. Exchange OAuth code for a Supabase session
    // This is the standard way to finalize the auth flow in Supabase SSR
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ [AUTH] Exchange error:', exchangeError.message);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/login?error=auth_exchange_failed`);
    }

    if (!session || !session.user) {
      console.error('❌ [AUTH] No session established');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/login?error=no_session`);
    }

    // 2. Extract the provider_refresh_token (Google's refresh token)
    const providerRefreshToken = session.provider_refresh_token;

    if (providerRefreshToken) {
      console.log('✅ [AUTH] Google Refresh Token grabbed. Bypassing RLS to save...');

      // 3. DEFENSIVE WRITE: Check if business_config exists (Race Condition Shield)
      const { data: existingRow } = await supabaseAdmin
        .from('business_config')
        .select('id')
        .eq('owner_id', session.user.id)
        .single();

      if (existingRow) {
        // CASE A: User already exists -> UPDATE
        const { data, error } = await supabaseAdmin
          .from('business_config')
          .update({ google_refresh_token: providerRefreshToken })
          .eq('owner_id', session.user.id)
          .select();

        if (error) console.error('❌ [DB UPDATE ERROR]:', error.message);
        else console.log('✅ [DB UPDATE SUCCESS]: Token persisted for returning user.');
      } else {
        // CASE B: New Signup Race Condition -> INSERT
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
        else console.log('✅ [DB INSERT SUCCESS]: Business config created with token.');
      }

    } else {
      console.warn('⚠️ [AUTH] No provider_refresh_token found in session.');
    }

    // 4. Redirect to the intended destination (typically /dashboard/agenda)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${next}`);

  } catch (error: any) {
    console.error('❌ [AUTH] Callback exception:', error.message);
    return NextResponse.json({ error: 'OAuth callback failed' }, { status: 500 });
  }
}
