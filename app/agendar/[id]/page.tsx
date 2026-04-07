import { supabaseAdmin } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';

export default async function PublicSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Resolve params asynchronously to support newer Next.js versions
  const resolvedParams = await params;
  const profileId = resolvedParams?.id;

  console.log('[PUBLIC_SCHEDULING] Accessing booking page for ID:', profileId);

  if (!profileId || profileId === 'undefined') {
    console.error('[PUBLIC_SCHEDULING] Invalid ID parameter');
    notFound();
  }
  
  // 2. Query '*' to prevent crashes from missing specific columns
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error || !profile) {
    console.error('[PUBLIC_SCHEDULING] Profile not found:', error);
    notFound();
  }

  // 3. Fallback dynamically depending on what columns actually exist
  const displayName = profile.business_name || profile.full_name || 'Nossa Empresa';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100 max-w-md w-full animate-in fade-in zoom-in duration-700">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/5">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
            {displayName}
          </h1>
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
              Página de Agendamento
            </span>
          </div>
        </div>

        <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100/50 mb-8">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 italic">
            Status do Lançamento:
          </p>
          <p className="text-base font-bold text-gray-600">
            A agenda online estará disponível em breve.
          </p>
        </div>

        <div className="text-[11px] font-black text-gray-300 uppercase tracking-widest pt-4 border-t border-gray-100">
          Powered by Meatende.ai
        </div>
      </div>
    </div>
  );
}
