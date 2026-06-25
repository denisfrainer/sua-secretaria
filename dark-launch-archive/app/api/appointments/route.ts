import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { parseISO, addMinutes, format } from 'date-fns';

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`\n--- 📅 [${requestId}] APPOINTMENT SUBMISSION START ---`);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      appointment_date, 
      start_time, 
      end_time, 
      client_name, 
      lead_phone, 
      service_type, 
      status, 
      notes,
      id // for updates
    } = payload;

    // --- Server-Side Duration Validation ---
    let validated_end_time = end_time;
    if (start_time && end_time) {
      const startMs = new Date(start_time).getTime();
      const endMs = new Date(end_time).getTime();
      const diffMinutes = Math.round((endMs - startMs) / 60000);
      
      if (![30, 60, 90, 120].includes(diffMinutes)) {
        console.warn(`[${requestId}] Invalid duration ${diffMinutes}m detected. Enforcing fallback to 30m.`);
        validated_end_time = new Date(startMs + 30 * 60000).toISOString();
      }
    } else if (start_time && !end_time) {
      validated_end_time = new Date(new Date(start_time).getTime() + 30 * 60000).toISOString();
    }
    // ---------------------------------------

    // 0. Pre-flight: If this is an UPDATE, fetch the old record to get google_event_id
    let oldGoogleEventId: string | null = null;
    if (id) {
      const { data: existingRecord } = await supabaseAdmin
        .from('appointments')
        .select('google_event_id')
        .eq('id', id)
        .single();
      oldGoogleEventId = existingRecord?.google_event_id || null;
      console.log(`[${requestId}] 0. UPDATE detected. Old Google Event ID: ${oldGoogleEventId || 'None'}`);
    }

    // 1. DB Write
    console.log(`[${requestId}] 1. DB Write Attempt...`);
    
    // Create a clean payload with only valid columns
    const dbPayload: Record<string, any> = {
      appointment_date,
      start_time,
      end_time: validated_end_time,
      client_name,
      lead_phone,
      service_type,
      status,
      notes,
      owner_id: user.id
    };

    // If ID is provided, it's an update, so include it for upsert
    if (id) {
      dbPayload.id = id;
      // Clear the old google_event_id since we'll create a new event
      dbPayload.google_event_id = null;
    }

    const { data: dbResult, error: dbError } = await supabaseAdmin
      .from('appointments')
      .upsert(dbPayload)
      .select()
      .single();

    if (dbError) {
      console.error(`[${requestId}] DB Error:`, dbError);
      throw dbError;
    }
    console.log(`[${requestId}] 1. DB Write Success:`, !!dbResult);

    // 2. Google Calendar Sync
    console.log(`[${requestId}] 2. Checking Google Token...`);
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token')
      .eq('id', user.id)
      .single();

    const { data: businessConfig } = await supabaseAdmin
      .from('business_config')
      .select('id, context_json')
      .eq('owner_id', user.id)
      .single();

    const refreshToken = userProfile?.google_refresh_token || (businessConfig?.context_json as any)?.google_calendar?.refresh_token;

    console.log(`[${requestId}] 2. Google Token Available:`, !!refreshToken);

    if (refreshToken && businessConfig) {
      try {
        const authClient = await getGoogleAuthClient(businessConfig.id, businessConfig.context_json);
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        // --- STEP A: Delete the OLD orphaned Google event if this is a reschedule ---
        if (oldGoogleEventId) {
          console.log(`[${requestId}] 3a. 🔄 GCAL UPDATE SYNC — Deleting orphaned event: ${oldGoogleEventId}`);
          try {
            const deleteResponse = await calendar.events.delete({
              calendarId: 'primary',
              eventId: oldGoogleEventId,
            });
            console.log(`[${requestId}] 3b. Old Google Event Deleted. Status:`, deleteResponse.status);
          } catch (delErr: any) {
            // 404/410 means the event was already gone — not a real error
            console.warn(`[${requestId}] 3b. Old event cleanup failed (non-critical):`, delErr.message);
          }
        }

        // --- STEP B: Create a NEW Google Calendar event with the updated times ---
        console.log(`[${requestId}] 3c. Creating new Google Calendar event...`);
        const start = parseISO(start_time);
        
        // Dynamic duration: resolve from service catalog, fallback 30min
        let resolvedEnd: Date;
        if (validated_end_time) {
          resolvedEnd = parseISO(validated_end_time);
        } else {
          const servicesList = (businessConfig.context_json as any)?.services || [];
          const matchedService = servicesList.find((s: any) => s.name === service_type);
          const durationMin = matchedService?.duration || 30;
          console.log(`[${requestId}] 3c. Duration resolved: ${durationMin}min for "${service_type}"`);
          resolvedEnd = addMinutes(start, durationMin);
        }

        const isBlockEvent = service_type === 'Bloqueio' || client_name === 'Horário Bloqueado';

        const event: any = {
          summary: isBlockEvent ? 'Horário Bloqueado' : `📅 ${client_name} - ${service_type || 'Agendamento'}`,
          description: isBlockEvent ? 'Bloqueio manual na agenda.' : `Cliente: ${client_name}\nTelefone: ${lead_phone}\nNotas: ${notes || ''}`,
          start: {
            dateTime: start.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: resolvedEnd.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
        };

        if (isBlockEvent) {
          event.transparency = 'opaque';
        }

        const googleResponse = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });

        const gEventId = googleResponse.data.id;
        console.log(`[${requestId}] 4. Google API Response Status:`, googleResponse.status);
        console.log(`[${requestId}] 5. New Google Event ID:`, gEventId);

        // Update DB with the new Google Event ID
        if (gEventId) {
          await supabaseAdmin
            .from('appointments')
            .update({ google_event_id: gEventId })
            .eq('id', dbResult.id);
          console.log(`[${requestId}] 6. DB Updated with new Google Event ID`);
        }
      } catch (gcalError: any) {
        console.warn(`[${requestId}] ⚠️ Google Sync Failed (Non-critical):`, gcalError.message);
        // We don't fail the whole request if Google sync fails, but we log it
      }
    }

    console.log(`--- ✅ [${requestId}] APPOINTMENT SUBMISSION COMPLETE ---\n`);
    return NextResponse.json({ success: true, data: dbResult });

  } catch (error: any) {
    console.error(`💥 [${requestId}] CRITICAL ERROR:`, error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error', 
      details: error 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const requestId = Math.random().toString(36).substring(7);

  console.log(`\n--- 🗑️ SYNC AUDIT (DELETE) [${requestId}] ---`);
  console.log(`1. Target Appointment ID: ${id}`);

  if (!id) {
    return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch the appointment to get the google_event_id before deleting
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !appointment) {
      console.error(`[${requestId}] Appointment not found:`, fetchError);
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const gEventId = appointment.google_event_id;
    console.log(`2. Target Google Event ID: ${gEventId || 'None'}`);

    // 2. Google Calendar Sync Delete
    if (gEventId) {
      try {
        console.log(`3. Triggering Google API Delete for event: ${gEventId}...`);
        
        const { data: businessConfig } = await supabaseAdmin
          .from('business_config')
          .select('id, context_json')
          .eq('owner_id', user.id)
          .single();

        if (businessConfig) {
          const authClient = await getGoogleAuthClient(businessConfig.id, businessConfig.context_json);
          const calendar = google.calendar({ version: 'v3', auth: authClient });

          const googleResponse = await calendar.events.delete({
            calendarId: 'primary',
            eventId: gEventId,
          });

          console.log(`4. Google API Response Status:`, googleResponse.status);
        }
      } catch (gcalError: any) {
        console.warn(`[${requestId}] ⚠️ Google Delete Sync Failed (Non-critical):`, gcalError.message);
      }
    }

    // 3. DB Delete
    const { error: deleteError, status: deleteStatus } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`5. DB Delete Success: ${deleteStatus === 204}`);
    console.log(`--- ✅ [${requestId}] SYNC DELETE COMPLETE ---\n`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(`💥 [${requestId}] CRITICAL DELETE ERROR:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
