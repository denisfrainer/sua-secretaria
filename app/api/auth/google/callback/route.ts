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

      // 3. PERSISTENCE: Bypass RLS using supabaseAdmin (Service Role)
      // This guarantees the save happens even if the session hasn't fully propagated to the DB level for RLS
      const { data, error: dbError } = await supabaseAdmin
        .from('business_config')
        .update({ google_refresh_token: providerRefreshToken })
        .eq('owner_id', session.user.id)
        .select();

      if (dbError) {
        console.error('❌ [DB ERROR] Failed to save token:', dbError.message);
      } else if (!data || data.length === 0) {
        console.warn('⚠️ [DB WARNING] Token NOT saved: No record found in business_config for owner_id:', session.user.id);
      } else {
        console.log('✅ [DB] Token successfully saved and verified for user:', session.user.id);
        console.log('➡️ [DB UPDATE RESULT]:', JSON.stringify(data[0], null, 2));
      }
    } else {
      console.warn('⚠️ [AUTH] No provider_refresh_token found in session. Ensure "prompt=consent" and "access_type=offline" are used.');
    }

    // 4. Redirect to the intended destination (typically /dashboard/agenda)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${next}`);

  } catch (error: any) {
    console.error('❌ [AUTH] Callback exception:', error.message);
    return NextResponse.json({ error: 'OAuth callback failed' }, { status: 500 });
  }
}
