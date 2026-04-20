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
  isValid,
  isSameDay
} from 'date-fns';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');
  const dateStr = searchParams.get('date');
  const duration = parseInt(searchParams.get('duration') || '30');

  if (!profileId || !dateStr) {
    return NextResponse.json({ error: 'Missing profileId or date' }, { status: 400 });
  }

  const requestedDate = parseISO(dateStr);
  if (!isValid(requestedDate)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
  }

  const today = startOfDay(new Date());
  const isToday = isSameDay(requestedDate, today);
  
  // Timezone hack for Brazil (GMT-3). 
  // Standardizing 'now' to match the user's Brazil context even if server is UTC.
  const now = new Date(new Date().getTime() - (3 * 60 * 60 * 1000)); 

  console.log('[BOOKING_FLOW] API hit. Fetching availability for profile:', profileId);
  console.log(`[API_AVAILABILITY] Fetching profile: [${profileId}] | Date: [${dateStr}] | isToday: ${isToday} | ServerTime: ${new Date().toISOString()} | BR_Time: ${now.toISOString()}`);

  try {
    // 1. Fetch profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token')
      .eq('id', profileId)
      .single();

    if (profileError) {
      console.warn(`[API_AVAILABILITY] Profile fetch error: ${profileError.message}`);
    }

    // 2. Fetch business configuration with defensive check for enable_smart_scarcity
    let businessConfigRes = await supabaseAdmin
      .from('business_config')
      .select('id, context_json, enable_smart_scarcity')
      .eq('owner_id', profileId)
      .single();

    // GRACEFUL DEGRADATION: If column does not exist (migration pending), fallback to restricted select
    if (businessConfigRes.error && (businessConfigRes.error.code === '42703' || businessConfigRes.error.message.includes('column "enable_smart_scarcity" does not exist'))) {
      console.warn(`[API_AVAILABILITY] Missing column 'enable_smart_scarcity' detected. Falling back...`);
      businessConfigRes = await supabaseAdmin
        .from('business_config')
        .select('id, context_json')
        .eq('owner_id', profileId)
        .single();
      
      if (businessConfigRes.data) {
        (businessConfigRes.data as any).enable_smart_scarcity = false; // Forced fallback
      }
    }

    if (businessConfigRes.error || !businessConfigRes.data) {
      console.error('[API_AVAILABILITY] Business config not found:', businessConfigRes.error);
      return NextResponse.json({ error: 'Business configuration not found' }, { status: 404 });
    }

    const refreshToken = profileData?.google_refresh_token;
    const businessConfig = businessConfigRes.data;
    const contextJson = businessConfig.context_json as any;
    const operatingHours = contextJson?.operating_hours;
    const isScarcityEnabled = (businessConfig as any).enable_smart_scarcity || false;

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

    // Failsafe: Default Working Hours (Silicon Valley Standard)
    if (!hours) {
      console.warn(`[ENGINE_DEBUG] No hours found for day ${dayOfWeek}. Using fallback 09:00-18:00`);
      hours = { open: '09:00', close: '18:00', is_closed: false };
    }

    if (hours.is_closed) {
      console.log(`[ENGINE_DEBUG] Business is closed on day ${dayOfWeek}`);
      return NextResponse.json({ availableSlots: [] });
    }

    const { open, close } = hours;
    console.log(`[ENGINE_DEBUG] Working hours: ${open} to ${close}`);

    // 3. Generate slots based on operating hours and duration
    const slots: string[] = [];
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);

    let currentSlot = new Date(requestedDate);
    currentSlot.setHours(openH, openM, 0, 0);

    const endTime = new Date(requestedDate);
    endTime.setHours(closeH, closeM, 0, 0);

    while (isBefore(currentSlot, endTime)) {
      const slotEnd = addMinutes(currentSlot, duration);
      
      // Slot must start and end within operating hours
      if (isBefore(slotEnd, endTime) || format(slotEnd, 'HH:mm') === format(endTime, 'HH:mm')) {
        
        // If today, block past slots
        let isPast = false;
        if (isToday) {
          // Use the adjusted 'now' for BR time
          isPast = isBefore(currentSlot, now);
        }

        if (!isPast) {
          slots.push(format(currentSlot, 'HH:mm'));
        }
      }
      
      currentSlot = addMinutes(currentSlot, duration);
    }
    
    console.log(`[ENGINE_DEBUG] Slots generated before Google overlap filter:`, slots);

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

        console.log('[BOOKING_FLOW] Google FreeBusy response status:', freeBusyRes.status);

        const busy = freeBusyRes.data.calendars?.primary?.busy || [];
        busyIntervals = busy.map((b: any) => ({
          start: b.start as string,
          end: b.end as string,
        }));
      } catch (err: any) {
        console.error('[API_AVAILABILITY] Google FreeBusy query failed:', err.message);
      }
    }

    // 5. Filter slots against busy intervals
    let availableSlots = slots.filter(slotTime => {
      const [slotH, slotM] = slotTime.split(':').map(Number);
      const slotStart = new Date(requestedDate);
      slotStart.setHours(slotH, slotM, 0, 0);
      
      const slotEnd = addMinutes(slotStart, duration);

      const isBusy = busyIntervals.some(interval => {
        const busyStart = new Date(interval.start);
        const busyEnd = new Date(interval.end);
        return isBefore(slotStart, busyEnd) && isBefore(busyStart, slotEnd);
      });

      return !isBusy;
    });

    // 6. Smart Scarcity Guardrail Approach
    if (isScarcityEnabled && availableSlots.length > 3) {
      // 1. Define strict limits: Hide max 40% of slots, but always keep at least 3 slots visible.
      const hideCount = Math.floor(availableSlots.length * 0.4);
      
      // 2. Simple deterministic seed based on the date string (e.g., '2026-04-10' -> sum of char codes)
      const dateSeed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

      // 3. Select which indexes to remove deterministically
      const indexesToRemove = new Set<number>();
      let step = 0;
      
      while (indexesToRemove.size < hideCount) {
        // Predictable jumping through the array based on the seed
        const targetIndex = (dateSeed + step * 7) % availableSlots.length;
        indexesToRemove.add(targetIndex);
        step++;

        // Failsafe to prevent infinite loop (though mathematically unlikely with % length)
        if (step > 100) break;
      }

      // 4. Apply the filter
      const initialCount = availableSlots.length;
      availableSlots = availableSlots.filter((_, index) => !indexesToRemove.has(index));

      console.log(`[ENGINE_DEBUG] Smart Scarcity Guardrail: ${initialCount} -> ${availableSlots.length} slots kept.`);
    }

    console.log('[BOOKING_FLOW] Slots remaining after Smart Scarcity:', availableSlots.length);
    console.log(`[ENGINE_DEBUG] Final available slots:`, availableSlots);
    return NextResponse.json({ availableSlots });

  } catch (error: any) {
    console.error('💥 [API_AVAILABILITY] CRITICAL ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
