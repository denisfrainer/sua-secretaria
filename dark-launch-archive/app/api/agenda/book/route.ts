import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { addMinutes, parseISO, format } from 'date-fns';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { clientName, serviceName, startTime, duration } = await req.json();

    if (!clientName || !serviceName || !startTime || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch business_config
    const { data: businessConfig } = await supabase
      .from('business_config')
      .select('id, context_json')
      .eq('owner_id', user.id)
      .single();

    if (!businessConfig || !(businessConfig.context_json as any).google_calendar) {
      return NextResponse.json({ error: 'Google Calendar not integrated' }, { status: 404 });
    }

    const authClient = await getGoogleAuthClient(businessConfig.id, businessConfig.context_json);
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    // Calculate start and end time
    // startTime is format "HH:mm"
    const today = format(new Date(), 'yyyy-MM-dd');
    const startDateTime = new Date(`${today}T${startTime}:00-03:00`);
    
    // Parse duration (e.g. "60 min" or just "60")
    const durationMinutes = parseInt(duration.replace(/[^0-9]/g, '')) || 60;
    const endDateTime = addMinutes(startDateTime, durationMinutes);

    console.log(`[GCAL_BOOK] Booking ${serviceName} for ${clientName} at ${format(startDateTime, "yyyy-MM-dd'T'HH:mm:ss")}`);

    console.log('[API_BOOKING] Sending to Google:', { 
      start: { dateTime: format(startDateTime, "yyyy-MM-dd'T'HH:mm:ss"), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: format(endDateTime, "yyyy-MM-dd'T'HH:mm:ss"), timeZone: 'America/Sao_Paulo' }
    });

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `[AGENDADO] ${clientName} - ${serviceName}`,
        description: `Serviço: ${serviceName}\nCliente: ${clientName}\nDuração: ${durationMinutes}min\n(Agendamento manual via Dashboard)`,
        start: {
          dateTime: format(startDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: format(endDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
          timeZone: 'America/Sao_Paulo',
        },
      },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[GCAL_BOOK] Error booking appointment:', error.message);
    const status = error.code === 401 || error.code === 404 ? error.code : 500;
    return NextResponse.json({ 
      error: 'Failed to book appointment',
      details: error.message,
      code: status
    }, { status });
  }
}
