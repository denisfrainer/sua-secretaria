'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ChevronLeft, ChevronRight, Calendar, Loader2, ArrowLeft } from 'lucide-react';
import { DateStrip } from '../../../components/agenda/DateStrip';
import { TimeSlotList } from '../../../components/agenda/TimeSlotList';
import { AgendaDrawer } from '../../../components/agenda/AgendaDrawer';
import { AgendaSettingsModal } from '../../../components/agenda/AgendaSettingsModal';
import { NewAppointmentDrawer } from '../../../components/agenda/NewAppointmentDrawer';
import { AgendaEmptyState } from '../../../components/agenda/AgendaEmptyState';
import Link from 'next/link';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [isIntegrated, setIsIntegrated] = useState(true);

  const [agenda, setAgenda] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAgenda() {
      // Only fetch from API if today is selected
      const today = new Date();
      if (!isSameDay(selectedDate, today)) {
        setLoading(false);
        setAgenda([]);
        return;
      }

      console.log('📡 [AGENDA] Fetching real-time Google Calendar agenda...');
      setLoading(true);
      try {
        const res = await fetch('/api/agenda/today');
        
        if (res.status === 404 || res.status === 401) {
          setIsIntegrated(false);
          setLoading(false);
          return;
        }

        const data = await res.json();
        console.log('📡 [AGENDA] API Response:', { integrated: data.integrated, eventsCount: data.agenda?.length });

        if (data.integrated === false) {
          console.warn('⚠️ [AGENDA] Calendar not integrated according to API');
          setIsIntegrated(false);
          setAgenda([]);
        } else {
          setAgenda(data.agenda || []);
          setIsIntegrated(true);
        }
      } catch (error) {
        console.error('[AGENDA] Failed to fetch agenda:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAgenda();
  }, [selectedDate]);

  useEffect(() => {
    async function fetchServices() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: configData } = await supabase
        .from('business_config')
        .select('context_json')
        .eq('owner_id', user.id)
        .single();

      if (configData?.context_json) {
        setServices((configData.context_json as any).services || []);
      }
    }

    fetchServices();
  }, []);

  const handleSlotClick = (slot: any) => {
    console.log('🖱️ [AGENDA] Slot clicked:', slot.time);
    setSelectedSlot(slot);
    setIsDrawerOpen(true);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="w-full max-w-4xl px-4 py-8 flex flex-col gap-6 mx-auto animate-in fade-in duration-500 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Voltar ao Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Agenda</h1>
            <p className="text-gray-500 font-medium capitalize">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-white border border-black/5 rounded-2xl shadow-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Date Navigation Strip */}
      {isIntegrated && (
        <DateStrip 
          selectedDate={selectedDate} 
          onDateChange={handleDateChange} 
        />
      )}

      {/* Main Schedule Area / Empty State */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {!isIntegrated ? (
          <AgendaEmptyState />
        ) : (
          <>
            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" />
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Horários do Dia</span>
              </div>
              {loading && <Loader2 className="animate-spin text-blue-600" size={16} />}
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-400px)] scrollbar-hide">
              <TimeSlotList 
                date={selectedDate} 
                loading={loading}
                agenda={agenda}
                onSlotClick={handleSlotClick} 
              />
            </div>
          </>
        )}
      </div>

      {/* Drawers & Modals */}
      {isIntegrated && (
        <>
          <AgendaDrawer 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)} 
            slot={selectedSlot} 
            onNewBooking={() => {
              setIsDrawerOpen(false);
              setIsBookingOpen(true);
            }}
          />

          <NewAppointmentDrawer
            isOpen={isBookingOpen}
            onClose={() => setIsBookingOpen(false)}
            selectedTime={selectedSlot?.time || ''}
            services={services}
            onSuccess={() => {
              // Trigger refresh
              setSelectedDate(new Date(selectedDate));
            }}
          />

          <AgendaSettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
          />
        </>
      )}
    </div>
  );
}
