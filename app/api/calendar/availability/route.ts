import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { 
  parseISO, 
  startOfDay, 
  endOfDay, 
  addMinutes, 
  isBefore, 
  format, 
  getDay,
  parse,
  isValid
} from 'date-fns';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');
  const dateStr = searchParams.get('date');

  if (!profileId || !dateStr) {
    return NextResponse.json({ error: 'Missing profileId or date' }, { status: 400 });
  }

  const requestedDate = parseISO(dateStr);
  if (!isValid(requestedDate)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
  }

  console.log(`[API_AVAILABILITY] Fetching for profile: [${profileId}] on date: [${dateStr}]`);

  try {
    // 1. Fetch profile and business configuration
    const [profileRes, configRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('google_refresh_token')
        .eq('id', profileId)
        .single(),
      supabaseAdmin
        .from('business_config')
        .select('id, context_json')
        .eq('owner_id', profileId)
        .single()
    ]);

    if (configRes.error || !configRes.data) {
      console.error('[API_AVAILABILITY] Business config not found:', configRes.error);
      return NextResponse.json({ error: 'Business configuration not found' }, { status: 404 });
    }

    const refreshToken = profileRes.data?.google_refresh_token;
    const businessConfig = configRes.data;
    const contextJson = businessConfig.context_json as any;
    const operatingHours = contextJson?.operating_hours;

    console.log(`[API_AVAILABILITY] Google token found: ${!!refreshToken}`);

    // 2. Determine day of the week and operating hours
    const dayOfWeek = getDay(requestedDate); // 0 (Sunday) to 6 (Saturday)
    let hours = null;

    if (dayOfWeek === 0) {
      hours = operatingHours?.sunday;
    } else if (dayOfWeek === 6) {
      hours = operatingHours?.saturday;
    } else {
      hours = operatingHours?.weekdays;
    }

    if (!hours || hours.is_closed) {
      return NextResponse.json({ availableSlots: [] });
    }

    const { open, close } = hours;

    // 3. Generate initial slots based on operating hours
    const slots: string[] = [];
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);

    let currentSlot = new Date(requestedDate);
    currentSlot.setHours(openH, openM, 0, 0);

    const endTime = new Date(requestedDate);
    endTime.setHours(closeH, closeM, 0, 0);

    while (isBefore(currentSlot, endTime)) {
      slots.push(format(currentSlot, 'HH:mm'));
      currentSlot = addMinutes(currentSlot, 30);
    }

    // 4. Google API Integration (FreeBusy)
    let busyIntervals: { start: string; end: string }[] = [];

    if (refreshToken) {
      try {
        const authClient = await getGoogleAuthClient(businessConfig.id, contextJson);
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const timeMin = startOfDay(requestedDate).toISOString();
        const timeMax = endOfDay(requestedDate).toISOString();

        const freeBusyRes = await calendar.freebusy.query({
          requestBody: {
            timeMin,
            timeMax,
            items: [{ id: 'primary' }],
          },
        });

        const busy = freeBusyRes.data.calendars?.primary?.busy || [];
        busyIntervals = busy.map((b: any) => ({
          start: b.start as string,
          end: b.end as string,
        }));

        console.log(`[API_AVAILABILITY] Busy intervals found: ${busyIntervals.length}`);
      } catch (err: any) {
        console.error('[API_AVAILABILITY] Google FreeBusy query failed:', err.message);
        // Graceful fallback to slots based only on operating hours
      }
    }

    // 5. Filter slots against busy intervals
    const availableSlots = slots.filter(slotTime => {
      const [slotH, slotM] = slotTime.split(':').map(Number);
      const slotStart = new Date(requestedDate);
      slotStart.setHours(slotH, slotM, 0, 0);
      
      const slotEnd = addMinutes(slotStart, 30);

      // Check if slot overlaps with ANY busy interval
      const isBusy = busyIntervals.some(interval => {
        const busyStart = new Date(interval.start);
        const busyEnd = new Date(interval.end);

        // Overlap condition: (slotStart < busyEnd) AND (slotEnd > busyStart)
        return isBefore(slotStart, busyEnd) && isBefore(busyStart, slotEnd);
      });

      return !isBusy;
    });

    return NextResponse.json({ availableSlots });

  } catch (error: any) {
    console.error('💥 [API_AVAILABILITY] CRITICAL ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
