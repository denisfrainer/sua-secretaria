import { createClient } from '@/lib/supabase/server';
import { SchedulingCalendar } from '@/components/dashboard/SchedulingCalendar';

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

  return (
    <SchedulingCalendar ownerId={user.id} />
  );
}
