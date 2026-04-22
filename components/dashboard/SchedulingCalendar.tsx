'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  format, 
  addDays, 
  startOfDay, 
  isSameDay, 
  eachDayOfInterval,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Filter,
  Search,
  TrendingUp,
  Calendar,
  X,
  Trash2,
  Lock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

import { MinimalistHeader } from './MinimalistHeader';
import { CalendarGrid } from './CalendarGrid';
import { ActionModal } from './ActionModal';
import { AppointmentOptionsModal } from './AppointmentOptionsModal';
import { useAppointments, Appointment } from '@/hooks/useAppointments';

interface SchedulingCalendarProps {
  ownerId: string;
}

export function SchedulingCalendar({ ownerId }: SchedulingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [services, setServices] = useState<{ name: string; price: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const { appointments, upsertAppointment, blockSlots, deleteAppointment } = useAppointments(selectedDate);

  useEffect(() => {
    async function fetchBusinessConfig() {
      const { data } = await supabase
        .from('business_config')
        .select('context_json')
        .eq('owner_id', ownerId)
        .maybeSingle();
      
      if (data?.context_json?.services) {
        setServices(data.context_json.services);
      }
    }
    fetchBusinessConfig();
  }, [ownerId, supabase]);

  // Selection Queue Logic
  const handleSlotClick = (slot: Date) => {
    setSelectedAppointmentId(null);
    setActiveAppointment(null);
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.getTime() === slot.getTime());
      if (exists) {
        const filtered = prev.filter(s => s.getTime() !== slot.getTime());
        console.log("📍 Slots Selected (Removed):", filtered);
        return filtered;
      }
      const newSelection = [...prev, slot];
      console.log("📍 Slots Selected (Added):", newSelection);
      return newSelection;
    });
  };

  const handleAppointmentClick = (app: Appointment) => {
    setSelectedSlots([]);
    setSelectedAppointmentId(app.id);
    setActiveAppointment(app);
    setIsOptionsModalOpen(true);
  };

  const handleConfirm = async (data: { type: 'SCHEDULE' | 'BLOCK'; name?: string; phone?: string; notes?: string; service_type?: string; startTime?: string; appointmentDate?: string }) => {
    try {
      if (activeAppointment) {
        // Edit/Update logic
        let startTimeISO = activeAppointment.start_time;
        let endTimeISO = activeAppointment.end_time;
        let appDate = activeAppointment.appointment_date;

        if (data.startTime && data.appointmentDate) {
          const [hours, minutes] = data.startTime.split(':');
          const newDate = new Date(data.appointmentDate + 'T00:00:00');
          newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          startTimeISO = newDate.toISOString();
          endTimeISO = new Date(newDate.getTime() + 60 * 60000).toISOString();
          appDate = data.appointmentDate;
        }

        await upsertAppointment({
          ...activeAppointment,
          client_name: data.name,
          lead_phone: data.phone,
          notes: data.notes,
          service_type: data.service_type,
          start_time: startTimeISO,
          end_time: endTimeISO,
          appointment_date: appDate,
          status: data.type === 'BLOCK' ? 'BLOCKED' : 'confirmed'
        });
      } else if (data.type === 'BLOCK') {
        await blockSlots(selectedSlots, ownerId);
      } else {
        // Single schedule logic
        const slot = selectedSlots[0];
        await upsertAppointment({
          owner_id: ownerId,
          appointment_date: format(slot, 'yyyy-MM-dd'),
          start_time: slot.toISOString(),
          end_time: new Date(slot.getTime() + 60 * 60000).toISOString(), // 60 min default
          client_name: data.name,
          lead_phone: data.phone,
          notes: data.notes,
          service_type: data.service_type,
          status: 'confirmed'
        });
      }
      setSelectedSlots([]);
      setActiveAppointment(null);
    } catch (e) {
      alert("Erro ao salvar agendamento. Verifique se o status 'BLOCKED' está configurado no banco.");
    }
  };

  // Generate 30 days for the reel
  const dates = eachDayOfInterval({
    start: startOfDay(new Date()),
    end: addDays(startOfDay(new Date()), 29)
  });

  const formatDateLabel = (date: Date) => {
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
      .split(' ')
      .map(word => word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
      .join(' ');
  };

  return (
    <div className="w-full min-h-screen bg-[#ffffff] flex flex-col font-sans text-gray-900 pb-32">
      
      {/* 1. HEADER & DATE SELECTION */}
      <div className="w-full max-w-lg mx-auto px-6 pt-6 sticky top-0 bg-[#ffffff]/90 backdrop-blur-md z-30 border-b border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all text-gray-500"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-medium text-gray-800">
              {format(selectedDate, 'MMMM', { locale: ptBR })}
            </h1>
            <TrendingUp size={16} className="rotate-90 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">
            {isToday(selectedDate) ? 'Hoje' : formatDateLabel(selectedDate)}
          </p>
        </div>

        {/* Date Reel */}
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
        >
          {dates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`
                  flex-shrink-0 w-12 h-16 flex flex-col items-center justify-center rounded-xl transition-all
                  ${isSelected 
                    ? 'bg-[#1a73e8] text-white' 
                    : 'text-gray-500 hover:bg-gray-100'
                  }
                `}
              >
                <span className={`text-[10px] font-bold uppercase tracking-tighter mb-1 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                  {format(date, 'eee', { locale: ptBR }).substring(0, 3)}
                </span>
                <span className={`text-lg font-medium ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                  {format(date, 'd')}
                </span>
                {isToday(date) && !isSelected && <div className="w-1 h-1 bg-[#1a73e8] rounded-full mt-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN GRID */}
      <div className="w-full max-w-lg mx-auto px-4 mt-6">
        <CalendarGrid 
          selectedDate={selectedDate}
          appointments={appointments}
          selectedSlots={selectedSlots}
          onSlotClick={handleSlotClick}
          onAppointmentClick={handleAppointmentClick}
          selectedAppointmentId={selectedAppointmentId}
        />
      </div>

      {/* 3. ACTION BAR (Floating Contextual Bar for Selection ONLY) */}
      <AnimatePresence>
        {selectedSlots.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-50"
          >
            <div className="bg-[#1a2b4b] text-white rounded-[2.5rem] p-4 shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-xl">
              {/* OPTIONS FOR NEW SELECTION */}
              <div className="flex flex-col w-full gap-4 px-2 py-2">
                  <div className="flex items-center justify-center border-b border-white/5 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">
                      {selectedSlots.length} {selectedSlots.length === 1 ? 'Horário Selecionado' : 'Horários Selecionados'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedSlots([])}
                      className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0"
                      title="Deselecionar"
                    >
                      <X size={20} />
                    </button>

                    <div className="flex flex-1 gap-2">
                      <button 
                        onClick={async () => {
                          await blockSlots(selectedSlots, ownerId);
                          setSelectedSlots([]);
                        }}
                        className="flex-1 bg-red-500 text-white h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                      >
                        <Lock size={14} />
                        Bloquear
                      </button>
                      
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex-[1.5] bg-[#1e61ff] text-white h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                      >
                        Agendar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* 4. ACTION MODAL */}
      <ActionModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveAppointment(null);
        }}
        selectedSlots={selectedSlots}
        onConfirm={handleConfirm}
        services={services}
        initialData={activeAppointment ? {
          name: activeAppointment.client_name,
          phone: activeAppointment.lead_phone,
          notes: activeAppointment.notes || '',
          service_type: activeAppointment.service_type || '',
          type: activeAppointment.status === 'BLOCKED' ? 'BLOCK' : 'SCHEDULE',
          startTime: activeAppointment.start_time,
          appointmentDate: activeAppointment.appointment_date
        } : undefined}
      />

      {/* 5. OPTIONS MODAL */}
      <AppointmentOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        clientName={activeAppointment?.client_name || ''}
        onReschedule={() => setIsModalOpen(true)}
        onCancel={async () => {
          if (activeAppointment) {
            await upsertAppointment({ ...activeAppointment, status: 'cancelled' });
            setActiveAppointment(null);
          }
        }}
        onDelete={async () => {
          if (activeAppointment) {
            await deleteAppointment(activeAppointment.id);
            setActiveAppointment(null);
          }
        }}
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
