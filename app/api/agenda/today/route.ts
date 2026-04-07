import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch business_config
  const { data: businessConfig } = await supabase
    .from('business_config')
    .select('id, context_json')
    .eq('owner_id', user.id)
    .single();

  if (!businessConfig || !(businessConfig.context_json as any).google_calendar) {
    return NextResponse.json({ error: 'Google Calendar not integrated' }, { status: 400 });
  }

  try {
    console.log('[GCAL_SYNC] Fetching today\'s agenda for user:', user.id);
    const authClient = await getGoogleAuthClient(businessConfig.id, businessConfig.context_json);
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const now = new Date();
    const timeMin = startOfDay(now).toISOString();
    const timeMax = endOfDay(now).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log(`[GCAL_SYNC] Successfully fetched ${events.length} events from Google Calendar`);

    // Map Google events to Frontend structure
    const agenda = events.map(event => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description || '',
    }));

    return NextResponse.json({ agenda });

  } catch (error: any) {
    console.error('[GCAL_SYNC] Error fetching today\'s agenda:', error.message);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}
