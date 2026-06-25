import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export interface Appointment {
  id: string;
  owner_id: string;
  lead_phone: string;
  client_name: string;
  service_type: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'blocked';
  notes: string | null;
  google_event_id?: string | null;
  created_at: string;
}

export function useAppointments(selectedDate: Date) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isIntegrated, setIsIntegrated] = useState(false);
  const supabase = createClient();

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    console.log("🔄 Fetching appointments for:", dateStr);
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', dateStr);

    if (error) {
      console.error("❌ Error fetching appointments:", error);
    } else {
      setAppointments(data || []);
      console.log("📍 Appointments loaded:", data?.length || 0);
    }

    // Fetch Google Events
    try {
      const response = await fetch(`/api/calendar/events?date=${dateStr}`);
      const result = await response.json();
      if (result.isIntegrated) {
        setIsIntegrated(true);
        setGoogleEvents(result.events || []);
      } else {
        setIsIntegrated(false);
        setGoogleEvents([]);
      }
    } catch (err) {
      console.error("❌ Error fetching Google events:", err);
    }

    setLoading(false);
  }, [selectedDate, supabase]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const upsertAppointment = async (payload: Partial<Appointment>) => {
    console.log("💾 Submitting to API:", payload);
    
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Error upserting appointment via API:", errorData);
      throw new Error(errorData.error || 'Failed to upsert appointment');
    }

    const result = await response.json();
    console.log("🔄 API Response:", result);
    
    await fetchAppointments();
    return result.data;
  };

  const blockSlots = async (slots: Date[], ownerId: string) => {
    console.log("🚧 Blocking slots via API:", slots.length);
    const dateStr = format(slots[0], 'yyyy-MM-dd');
    
    for (const slot of slots) {
      const payload = {
        owner_id: ownerId,
        appointment_date: dateStr,
        start_time: slot.toISOString(),
        end_time: new Date(slot.getTime() + 30 * 60000).toISOString(),
        status: 'confirmed' as const,
        client_name: 'Horário Bloqueado',
        lead_phone: '00000000000',
        service_type: 'Bloqueio'
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errData = await response.json();
        console.error("❌ Block error for slot", slot.toISOString(), errData);
      } else {
        console.log("✅ Blocked slot successfully", slot.toISOString());
      }
    }

    await fetchAppointments();
  };

  const deleteAppointment = async (id: string) => {
    console.log("🗑️ Deleting appointment via API:", id);
    
    const response = await fetch(`/api/appointments?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Error deleting appointment via API:", errorData);
      throw new Error(errorData.error || 'Failed to delete appointment');
    }

    console.log("🔄 API Delete Response: 200 OK");
    
    await fetchAppointments();
  };

  return {
    appointments,
    googleEvents,
    loading,
    isIntegrated,
    upsertAppointment,
    blockSlots,
    deleteAppointment,
    refresh: fetchAppointments
  };
}
