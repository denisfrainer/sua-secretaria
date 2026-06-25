import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`\n--- 📅 [${requestId}] AGENDA FETCH START ---`);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn(`[${requestId}] Unauthorized: No user session found.`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[${requestId}] Fetching integration for user:`, user.id);

    // 1. Fetch the centralized refresh token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn(`[${requestId}] Profile lookup warning:`, profileError.message);
    }

    const { data: businessConfig } = await supabaseAdmin
      .from('business_config')
      .select('id, owner_id, context_json')
      .eq('owner_id', user.id)
      .single();

    if (!businessConfig) {
      console.warn(`⚠️ [${requestId}] Business configuration not found for user ID: ${user.id}. Returning isIntegrated: false.`);
      return NextResponse.json({ 
        isIntegrated: false, 
        appointments: [],
        message: 'Business configuration not provisioned yet'
      }, { status: 200 });
    }

    const refreshToken = profile?.google_refresh_token || (businessConfig.context_json as any).google_calendar?.refresh_token;

    if (!refreshToken) {
      console.log(`[${requestId}] Google Calendar not integrated. Returning isIntegrated: false.`);
      return NextResponse.json({ isIntegrated: false, appointments: [] }, { status: 200 });
    }

    // 2. Fetch real events from Google Calendar API
    console.log(`[${requestId}] Token found. Fetching Google Calendar events...`);
    const authClient = await getGoogleAuthClient(businessConfig.id, {
      ...businessConfig.context_json,
      google_calendar: {
        ...(businessConfig.context_json as any).google_calendar,
        refresh_token: refreshToken
      }
    });
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
    console.log(`[${requestId}] Successfully fetched ${events.length} events.`);

    // Map Google events to Frontend structure
    const appointments = events.map(event => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description || '',
    }));

    console.log(`--- ✅ [${requestId}] AGENDA FETCH COMPLETE ---\n`);
    return NextResponse.json({ 
      isIntegrated: true, 
      appointments 
    }, { status: 200 });

  } catch (error: any) {
    console.error(`❌ [${requestId}] CRITICAL ERROR:`, {
      message: error.message,
      stack: error.stack
    });
    
    // Detailed integration error detection
    const isIntegrationError = 
      error.message.includes('not integrated') || 
      error.message.includes('invalid_grant') || 
      error.message.includes('No refresh token is set') ||
      error.message.includes('invalid_request') ||
      (error.code === 401);

    if (isIntegrationError) {
      console.warn(`⚠️ [${requestId}] Integration failure detected. Returning isIntegrated: false.`);
      return NextResponse.json({ isIntegrated: false, appointments: [] }, { status: 200 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch calendar events',
      details: error.message 
    }, { status: 500 });
  }
}
