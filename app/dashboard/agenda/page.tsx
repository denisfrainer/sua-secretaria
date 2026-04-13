import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Calendar, Clock, User, Phone } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  // Fetch native appointments natively mapped to the user
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

  // Define types matches Supabase
  type Appointment = {
    id: string;
    client_name: string;
    lead_phone: string;
    service_type: string;
    start_time: string;
    end_time: string;
    appointment_date: string;
    status: string;
  };

  // Group by date
  const grouped: Record<string, Appointment[]> = {};
  appointments?.forEach((app: Appointment) => {
    if (!grouped[app.appointment_date]) grouped[app.appointment_date] = [];
    grouped[app.appointment_date].push(app);
  });

  return (
      <div className="w-full max-w-2xl px-6 py-8 mx-auto flex flex-col gap-8 animate-in fade-in duration-700 pb-24">
         {/* Header */}
         <div className="flex flex-col gap-1 mb-2">
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Sua Agenda</h1>
            <p className="text-sm text-gray-500 font-medium">Controle seus atendimentos agendados pela Eliza.</p>
         </div>

         {/* Feed */}
         {Object.keys(grouped).length === 0 ? (
            <div className="w-full p-10 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-center bg-gray-50/50">
               <div className="h-16 w-16 bg-blue-50 text-blue-600 flex items-center justify-center rounded-full mb-2 shadow-sm">
                   <Calendar strokeWidth={2.5} size={28} />
               </div>
               <p className="text-gray-900 font-black text-lg tracking-tight">Sua agenda está livre</p>
               <p className="text-sm text-gray-500 max-w-[250px]">Nenhum agendamento foi encontrado para os próximos dias.</p>
            </div>
         ) : (
            Object.keys(grouped).map(dateStr => {
               const dateObj = parseISO(dateStr);
               let dateLabel = format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });
               if (isToday(dateObj)) dateLabel = 'Hoje, ' + format(dateObj, "d 'de' MMMM", { locale: ptBR });
               else if (isTomorrow(dateObj)) dateLabel = 'Amanhã, ' + format(dateObj, "d 'de' MMMM", { locale: ptBR });

               return (
                  <div key={dateStr} className="flex flex-col gap-5">
                     <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest pl-2">
                        {dateLabel}
                     </h2>
                     <div className="flex flex-col gap-4">
                        {grouped[dateStr].map(app => (
                           <div key={app.id} className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 shadow-sm rounded-[1.5rem] p-6 flex flex-col gap-4">
                              <div className="flex justify-between items-start">
                                 <div className="flex flex-col gap-1">
                                    <h3 className="font-bold text-gray-900 text-xl tracking-tight leading-none">{app.client_name}</h3>
                                    <span className="text-sm text-gray-500 font-medium">{app.service_type || 'Serviço Padrão'}</span>
                                 </div>
                                 <div className="bg-blue-50 text-blue-700 font-black px-4 py-2 rounded-full text-sm flex items-center gap-2">
                                    <Clock strokeWidth={2.5} size={15} className="opacity-70" />
                                    {format(new Date(app.start_time), 'HH:mm')}
                                 </div>
                              </div>
                              <div className="h-px w-full bg-gray-50/80 my-1" />
                              <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                                 <div className="flex items-center gap-1.5 hover:text-gray-600 transition-colors">
                                    <Phone size={14} strokeWidth={2.5} />
                                    {app.lead_phone}
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                    <User size={14} strokeWidth={2.5} />
                                    Status: <span className="text-emerald-700 uppercase tracking-widest text-[10px] font-black bg-emerald-50 px-2 py-0.5 rounded-full ml-1">{app.status}</span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               );
            })
         )}
      </div>
  );
}
