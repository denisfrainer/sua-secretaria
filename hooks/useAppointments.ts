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
  created_at: string;
}

export function useAppointments(selectedDate: Date) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(false);
  }, [selectedDate, supabase]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const upsertAppointment = async (payload: Partial<Appointment>) => {
    console.log("💾 Submitting to DB:", payload);
    const { data, error, status } = await supabase
      .from('appointments')
      .upsert(payload)
      .select()
      .single();

    console.log("🔄 Handshake Status:", status);
    
    if (error) {
      console.error("❌ Error upserting appointment:", error);
      throw error;
    }
    
    await fetchAppointments();
    return data;
  };

  const blockSlots = async (slots: Date[], ownerId: string) => {
    console.log("🚧 Blocking slots:", slots.length);
    const dateStr = format(slots[0], 'yyyy-MM-dd');
    
    const blocks = slots.map(slot => ({
      owner_id: ownerId,
      appointment_date: dateStr,
      start_time: slot.toISOString(),
      end_time: new Date(slot.getTime() + 30 * 60000).toISOString(), // 30 min block
      status: 'blocked' as const,
      client_name: 'Bloqueio de Agenda',
      lead_phone: '00000000000',
      service_type: 'BLOCK'
    }));

    const { error, status } = await supabase
      .from('appointments')
      .insert(blocks);

    console.log("🔄 Handshake Status (Block):", status);

    if (error) {
      console.error("❌ Error blocking slots:", error);
      throw error;
    }

    await fetchAppointments();
  };

  const deleteAppointment = async (id: string) => {
    const { error, status } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    console.log("🔄 Handshake Status (Delete):", status);

    if (error) {
      console.error("❌ Error deleting appointment:", error);
      throw error;
    }

    await fetchAppointments();
  };

  return {
    appointments,
    loading,
    upsertAppointment,
    blockSlots,
    deleteAppointment,
    refresh: fetchAppointments
  };
}
