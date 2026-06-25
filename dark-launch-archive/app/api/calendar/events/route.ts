import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date'); // Expecting YYYY-MM-DD
  
  const requestId = Math.random().toString(36).substring(7);
  console.log(`\n--- 📅 [${requestId}] GOOGLE CALENDAR FETCH START ---`);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn(`[${requestId}] Unauthorized: No user session found.`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetDate = dateParam ? parseISO(dateParam) : new Date();
    console.log(`[${requestId}] Fetching events for date:`, targetDate.toISOString());

    // 1. Fetch the centralized refresh token
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token')
      .eq('id', user.id)
      .single();

    const { data: businessConfig } = await supabaseAdmin
      .from('business_config')
      .select('id, owner_id, context_json')
      .eq('owner_id', user.id)
      .single();

    if (!businessConfig) {
      return NextResponse.json({ isIntegrated: false, events: [] });
    }

    const refreshToken = profile?.google_refresh_token || (businessConfig.context_json as any).google_calendar?.refresh_token;

    if (!refreshToken) {
      console.log(`[${requestId}] No refresh token found.`);
      return NextResponse.json({ isIntegrated: false, events: [] });
    }

    // 2. Auth with Google
    const authClient = await getGoogleAuthClient(businessConfig.id, businessConfig.context_json);
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const timeMin = startOfDay(targetDate).toISOString();
    const timeMax = endOfDay(targetDate).toISOString();

    console.log(`[${requestId}] Requesting Google API: timeMin=${timeMin}, timeMax=${timeMax}`);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const items = response.data.items || [];
    console.log(`[${requestId}] Google API returned ${items.length} items.`);

    // 3. Map to clean JSON structure
    const events = items.map(event => ({
      id: event.id,
      title: event.summary || '(Sem título)',
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      description: event.description || '',
      isGoogleEvent: true
    }));

    console.log(`--- ✅ [${requestId}] GOOGLE CALENDAR FETCH COMPLETE ---\n`);
    return NextResponse.json({ 
      isIntegrated: true, 
      events 
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] FETCH ERROR:`, error.message);
    return NextResponse.json({ isIntegrated: false, events: [], error: error.message }, { status: 200 });
  }
}
