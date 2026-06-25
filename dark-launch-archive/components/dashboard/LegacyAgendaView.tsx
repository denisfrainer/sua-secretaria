'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Settings, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  User as UserIcon,
  Clock
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfDay, 
  isSameDay, 
  parseISO, 
  eachDayOfInterval,
  isToday as isTodayDate,
  isTomorrow as isTomorrowDate,
  setHours,
  setMinutes
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

import { MinimalistHeader } from './MinimalistHeader';

interface Appointment {
  id: string;
  client_name: string;
  lead_phone: string;
  service_type: string;
  start_time: string;
  end_time: string;
  appointment_date: string;
  status: string;
}

interface LegacyAgendaViewProps {
  initialAppointments: Appointment[];
}

export function LegacyAgendaView({ initialAppointments }: LegacyAgendaViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate 30 days for the reel
  const dates = eachDayOfInterval({
    start: startOfDay(new Date()),
    end: addDays(startOfDay(new Date()), 29)
  });

  // Timeline slots (e.g., 08:00 to 19:30)
  const timeSlots = Array.from({ length: 24 }).map((_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return format(setMinutes(setHours(new Date(), hour), minute), 'HH:mm');
  });

  // Filter appointments for selected day
  const dailyAppointments = appointments.filter(app => {
    const appDate = parseISO(app.appointment_date);
    return isSameDay(appDate, selectedDate);
  });

  // Helper to find appointment for a specific slot
  const findAppointment = (slot: string) => {
    return dailyAppointments.find(app => {
      const appTime = format(new Date(app.start_time), 'HH:mm');
      return appTime === slot;
    });
  };

  const isTodaySelected = isTodayDate(selectedDate);
  const isTomorrowSelected = isTomorrowDate(selectedDate);

  const formatDateLabel = (date: Date) => {
    return format(date, "EEEE, d 'De' MMMM", { locale: ptBR })
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="w-full min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-900 pb-20">
      
      {/* 1. HEADER SECTION */}
      <div className="w-full max-w-lg mx-auto px-6 pt-6">
        <MinimalistHeader title="Agenda" />

        {/* Date Label */}
        <p className="text-lg font-bold text-[#7c8db5] mb-8">
          {formatDateLabel(selectedDate)}
        </p>

        {/* HOJE / AMANHÃ Toggles */}
        <div className="flex gap-4 mb-10">
          <button 
            onClick={() => setSelectedDate(startOfDay(new Date()))}
            className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${isTodaySelected ? 'bg-black text-white' : 'bg-white text-[#bac4d1] border border-gray-100'}`}
          >
            Hoje
          </button>
          <button 
            onClick={() => setSelectedDate(addDays(startOfDay(new Date()), 1))}
            className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${isTomorrowSelected ? 'bg-black text-white' : 'bg-white text-[#bac4d1] border border-gray-100'}`}
          >
            Amanhã
          </button>
        </div>

        {/* DATE REEL */}
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth mb-6"
        >
          {dates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`
                  flex-shrink-0 w-16 h-24 flex flex-col items-center justify-center rounded-[2rem] border-2 transition-all
                  ${isSelected 
                    ? 'bg-[#1e61ff] border-[#1e61ff] text-white shadow-xl shadow-blue-500/20' 
                    : 'bg-white border-gray-100 text-[#bac4d1] hover:border-gray-200'
                  }
                `}
              >
                <span className="text-[10px] font-black uppercase tracking-tighter mb-2 opacity-80">
                  {format(date, 'eee', { locale: ptBR }).substring(0, 5)}
                </span>
                <span className="text-2xl font-black">
                  {format(date, 'd')}
                </span>
                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full mt-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TIMELINE SECTION */}
      <div className="w-full max-w-lg mx-auto px-4">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
          {/* Timeline Header */}
          <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-3">
            <CalendarIcon size={20} className="text-[#1e61ff]" />
            <h3 className="text-sm font-black uppercase tracking-widest text-[#bac4d1]">
              Horários do Dia
            </h3>
          </div>

          {/* Timeline Body */}
          <div className="flex flex-col">
            {timeSlots.map((slot) => {
              const appointment = findAppointment(slot);
              return (
                <div key={slot} className="flex px-4 items-start group">
                  {/* Left: Time Column */}
                  <div className="w-20 pt-8 pb-8 flex flex-col items-center border-r border-gray-50">
                    <span className={`text-base font-black transition-colors ${appointment ? 'text-[#1a2b4b]' : 'text-[#bac4d1]'}`}>
                      {slot}
                    </span>
                    {appointment && <div className="w-8 h-1 bg-[#1e61ff] rounded-full mt-1" />}
                  </div>

                  {/* Right: Content Column */}
                  <div className="flex-1 p-4 flex flex-col justify-center min-h-[100px]">
                    {appointment ? (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white border border-gray-100 shadow-sm rounded-3xl p-5 flex items-start gap-4 relative"
                      >
                        <div className="w-12 h-12 bg-[#eef3ff] rounded-full flex items-center justify-center shrink-0">
                          <UserIcon size={20} className="text-[#1e61ff]" />
                        </div>
                        <div className="flex-1 flex flex-col pr-6">
                          <h4 className="text-base font-black text-[#1a2b4b] leading-tight">
                            Agendamento: {appointment.client_name} – {appointment.service_type || 'Consultoria'}
                          </h4>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] mt-2">
                            TELEFONE:
                          </span>
                          <span className="text-sm font-bold text-[#bac4d1]">
                            {appointment.lead_phone}
                          </span>
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00c853]">
                          <CheckCircle2 size={20} strokeWidth={3} />
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex items-center gap-4 opacity-40 group-hover:opacity-100 transition-opacity pl-4">
                        <div className="w-10 h-10 rounded-full border-2 border-gray-100 flex items-center justify-center text-[#bac4d1] group-hover:border-blue-100 group-hover:text-blue-500 transition-all cursor-pointer">
                          <Plus size={18} />
                        </div>
                        <span className="text-sm font-black text-[#bac4d1] uppercase tracking-widest">Livre</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
