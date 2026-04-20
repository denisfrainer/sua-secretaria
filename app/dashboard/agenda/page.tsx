import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { LegacyAgendaView } from '@/components/dashboard/LegacyAgendaView';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
        <div className="flex justify-center p-12">
            <p className="text-gray-500">Acesso negado. Por favor, faça login.</p>
        </div>
    );
  }

  // Fetch all appointments for the next 30 days to populate the reel/timeline
  const { data: appointments, error } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('owner_id', user.id)
    .gte('appointment_date', new Date().toISOString().split('T')[0])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
  }

  return (
    <LegacyAgendaView initialAppointments={appointments || []} />
  );
}
