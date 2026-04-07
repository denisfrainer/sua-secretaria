import { supabaseAdmin } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import SchedulingInterface from '@/components/scheduling/SchedulingInterface';

export default async function PublicSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const profileId = resolvedParams?.id;

  if (!profileId || profileId === 'undefined') {
    notFound();
  }
  
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4 md:p-8">
      <SchedulingInterface profile={profile} />
    </div>
  );
}
