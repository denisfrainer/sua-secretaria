'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader2, CalendarOff, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface Appointment {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
}

import { createClient } from '@/lib/supabase/client';

interface UpcomingAppointmentsProps {
  initialAgenda?: Appointment[];
  initialIntegrated?: boolean | null;
}

export function UpcomingAppointments({ initialAgenda = [], initialIntegrated = null }: UpcomingAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAgenda);
  const [loading, setLoading] = useState(initialAgenda.length === 0 && initialIntegrated === null);
  const [isIntegrated, setIsIntegrated] = useState<boolean | null>(initialIntegrated); 

  useEffect(() => {
    console.log('[UPCOMING_APPOINTMENTS] Initial State:', { initialIntegrated, isIntegrated });
  }, []);

  useEffect(() => {
    async function fetchUpcoming() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('[DASHBOARD] Fetch deferred: No session yet.');
          return;
        }

        const res = await fetch('/api/agenda/today');
        if (res.status === 401 || res.status === 404) {
          setIsIntegrated(false);
          return;
        }

        const data = await res.json();
        const apiIsIntegrated = data.isIntegrated ?? data.integrated; // Backward compatibility fallback
        const apiAppointments = data.appointments ?? data.agenda; // Backward compatibility fallback

        if (apiIsIntegrated === false) {
          setIsIntegrated(false);
          return;
        }

        setIsIntegrated(true); // Explicitly set to true on successful data return

        if (apiAppointments) {
          const now = new Date();
          // Filter events that start after now and sort by start time
          const upcoming = apiAppointments
            .filter((app: Appointment) => isAfter(parseISO(app.start), now))
            .sort((a: Appointment, b: Appointment) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
            .slice(0, 3);

          setAppointments(upcoming);
        }
      } catch (error) {
        console.error('[DASHBOARD] Error fetching upcoming appointments:', error);
        setIsIntegrated(false); // Stop indeterminate loading on error
      } finally {
        setLoading(false);
      }
    }

    fetchUpcoming();
  }, []);

  if (loading || isIntegrated === null) {
    return (
      <div
        className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 flex flex-col items-center justify-center gap-3 min-h-[235px]"
      >
        <Loader2 className="animate-spin text-blue-600 opacity-20" size={24} />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">Carregando agenda...</p>
      </div>
    );
  }

  if (isIntegrated === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1],
          delay: 0.1
        }}
        className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[235px]"
      >
        <div className="flex items-center justify-center">
          <img 
            src="/assets/google-calendar-logo.svg" 
            alt="Google Calendar" 
            className="w-16 h-16 object-contain"
          />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold text-gray-950">Agenda não conectada</p>
          <p className="text-base font-medium text-gray-600">Conecte o Google Calendar nas configurações</p>
        </div>
        <Link
          href="/api/auth/google"
          className="text-base font-bold text-blue-600 hover:underline"
        >
          Configurar agora
        </Link>
      </motion.div>
    );
  }

  if (appointments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1],
          delay: 0.1
        }}
        className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[235px]"
      >
        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
          <CalendarCheck size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold text-gray-950 tracking-tight">Nenhum atendimento para hoje</p>
          <p className="text-base font-medium text-gray-600">Sua tarde está livre!</p>
        </div>
        <Link
          href="/dashboard/agenda"
          className="text-base font-bold text-blue-600 hover:underline"
        >
          Ver agenda completa
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
        delay: 0.1
      }}
      className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden min-h-[235px]"
    >
      <div className="p-6 pb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-950 px-1">Próximos atendimentos</h2>
        <span className="bg-blue-50 text-blue-600 text-base font-bold px-3 py-1 rounded-full">Hoje</span>
      </div>
      <div className="flex flex-col divide-y divide-black/5">
        {appointments.map((app) => (
          <div key={app.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-gray-950">{format(parseISO(app.start), 'HH:mm')}</span>
              <span className="text-gray-200">|</span>
              <div className="flex flex-col">
                <span className="text-base font-bold text-gray-950 group-hover:text-blue-600 transition-colors">
                  {app.title}
                </span>
                {app.description && (
                  <span className="text-base text-gray-600 font-medium truncate max-w-[180px]">
                    {app.description}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/agenda"
        className="w-full py-4 flex items-center justify-center gap-2 text-base font-bold text-blue-600 hover:bg-blue-50/50 transition-all border-t border-black/5"
      >
        Ver agenda completa
        <ChevronRight size={18} />
      </Link>
    </motion.div>
  );
}
