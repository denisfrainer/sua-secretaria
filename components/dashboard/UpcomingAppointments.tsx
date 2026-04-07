'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader2, CalendarOff, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
}

export function UpcomingAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isIntegrated, setIsIntegrated] = useState(true);

  useEffect(() => {
    async function fetchUpcoming() {
      try {
        const res = await fetch('/api/agenda/today');
        if (res.status === 401 || res.status === 404) {
          setIsIntegrated(false);
          return;
        }

        const data = await res.json();
        if (data.integrated === false) {
          setIsIntegrated(false);
          return;
        }

        if (data.agenda) {
          const now = new Date();
          // Filter events that start after now and sort by start time
          const upcoming = data.agenda
            .filter((app: Appointment) => isAfter(parseISO(app.start), now))
            .sort((a: Appointment, b: Appointment) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
            .slice(0, 3);
          
          setAppointments(upcoming);
        }
      } catch (error) {
        console.error('[DASHBOARD] Error fetching upcoming appointments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUpcoming();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={24} />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carregando agenda...</p>
      </div>
    );
  }

  if (!isIntegrated) {
    return (
      <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          <CalendarOff size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-gray-900">Agenda não conectada</p>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Conecte o Google Calendar nas configurações</p>
        </div>
        <Link 
          href="/dashboard/settings"
          className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
        >
          Configurar agora
        </Link>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm p-8 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
          <CalendarCheck size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-gray-900 tracking-tight">Nenhum atendimento para hoje</p>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Sua tarde está livre!</p>
        </div>
        <Link 
          href="/dashboard/agenda"
          className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
        >
          Ver agenda completa
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-6 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest px-1">Próximos Atendimentos</h2>
          <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter">Hoje</span>
      </div>
      <div className="flex flex-col divide-y divide-black/5">
        {appointments.map((app) => (
          <div key={app.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-gray-900">{format(parseISO(app.start), 'HH:mm')}</span>
              <span className="text-gray-300">|</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
                  {app.title}
                </span>
                {app.description && (
                  <span className="text-[10px] text-gray-400 font-medium truncate max-w-[180px]">
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
        className="w-full py-4 flex items-center justify-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50/50 transition-all border-t border-black/5"
      >
        Ver agenda completa
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
