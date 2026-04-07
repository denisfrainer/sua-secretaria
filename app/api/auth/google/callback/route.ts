import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'OAuth code missing' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('[GCAL_SYNC] Google OAuth tokens received');

    // Get current user session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[GCAL_SYNC] Unauthorized: No user session found during callback');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/login`);
    }

    // Check if business_config exists
    const { data: businessConfig } = await supabaseAdmin
      .from('business_config')
      .select('id, context_json')
      .eq('owner_id', user.id)
      .single();

    if (!businessConfig) {
      console.error('[GCAL_SYNC] Business config not found for user:', user.id);
      return NextResponse.json({ error: 'Business configuration not found' }, { status: 404 });
    }

    // Save tokens and explicitly persist the refresh_token in the dedicated column
    const { error: updateError } = await supabaseAdmin
      .from('business_config')
      .update({ 
        google_refresh_token: tokens.refresh_token || (businessConfig.context_json as any).google_calendar?.refresh_token,
        context_json: {
          ...businessConfig.context_json,
          google_calendar: {
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date,
            updated_at: new Date().toISOString(),
          }
        }
      })
      .eq('id', businessConfig.id);

    if (updateError) {
      console.error('[GCAL_SYNC] Error saving tokens to Supabase:', updateError);
      return NextResponse.json({ error: 'Failed to save calendar integration' }, { status: 500 });
    }

    console.log('[GCAL_SYNC] Google Calendar integrated successfully for user:', user.id);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings?status=google_success`);

  } catch (error) {
    console.error('[GCAL_SYNC] OAuth callback error:', error);
    return NextResponse.json({ error: 'OAuth callback failed' }, { status: 500 });
  }
}
