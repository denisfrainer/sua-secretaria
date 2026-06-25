import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { parseISO, addMinutes, format } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profileId, date, time, clientName, clientPhone, serviceName } = body;

    if (!profileId || !date || !time || !clientName || !clientPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[API_BOOKING] Received booking request for: [${date}] at [${time}] for client: [${clientName}]`);

    // 1. Fetch business configuration and profile for refresh token
    const { data: businessConfig, error: configError } = await supabaseAdmin
      .from('business_config')
      .select('id, context_json')
      .eq('owner_id', profileId)
      .single();

    if (configError || !businessConfig) {
      return NextResponse.json({ error: 'Business configuration not found' }, { status: 404 });
    }

    // 2. Obtain Google Auth Client
    const authClient = await getGoogleAuthClient(businessConfig.id, businessConfig.context_json);
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    // 3. Prepare event details
    // Combine date and time into a single ISO string
    // date: YYYY-MM-DD, time: HH:mm
    const startDateTime = parseISO(`${date}T${time}:00`);
    const endDateTime = addMinutes(startDateTime, 45); // Default 45 minutes

    const event = {
      summary: `Agendamento: ${clientName} - ${serviceName || 'Consultoria'}`,
      description: `Telefone: ${clientPhone}`,
      start: {
        dateTime: format(startDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
        timeZone: 'America/Sao_Paulo', // Or handle dynamically based on business config
      },
      end: {
        dateTime: format(endDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
        timeZone: 'America/Sao_Paulo',
      },
      reminders: {
        useDefault: true,
      },
    };

    // 4. Insert event into Google Calendar
    console.log('[API_BOOKING] Sending to Google:', { start: event.start, end: event.end });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    console.log(`[API_BOOKING] Successfully inserted event into Google Calendar: ${response.data.id}`);

    return NextResponse.json({ 
      success: true, 
      eventId: response.data.id,
      htmlLink: response.data.htmlLink 
    });

  } catch (error: any) {
    console.error('💥 [API_BOOKING] CRITICAL ERROR:', error);
    
    // Check for specific Google API errors (like token invalidation)
    const isIntegrationError = 
      error.message.includes('not integrated') || 
      error.message.includes('invalid_grant') || 
      error.message.includes('No refresh token is set');

    if (isIntegrationError) {
      return NextResponse.json({ 
        error: 'Google Calendar selection failed or not integrated',
        integrated: false
      }, { status: 412 });
    }

    return NextResponse.json({ 
      error: 'Failed to book appointment', 
      details: error.message 
    }, { status: 500 });
  }
}
