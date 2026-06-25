'use client';

import React from 'react';
import { format, isSameMinute, startOfHour, addMinutes, isToday, isAfter, setHours, setMinutes } from 'date-fns';
import { motion } from 'framer-motion';
import { User, Lock, Plus, Clock, Phone, Scissors } from 'lucide-react';
import { Appointment } from '@/hooks/useAppointments';

interface CalendarGridProps {
  selectedDate: Date;
  appointments: Appointment[];
  googleEvents?: any[];
  selectedSlots: Date[];
  onSlotClick: (slot: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  selectedAppointmentId?: string | null;
}

export function CalendarGrid({ 
  selectedDate, 
  appointments, 
  googleEvents = [],
  selectedSlots, 
  onSlotClick,
  onAppointmentClick,
  selectedAppointmentId 
}: CalendarGridProps) {
  
  // Generate time slots (Google Calendar style: full day or filtered for today)
  const timeSlots = Array.from({ length: 48 }).map((_, i) => {
    const start = startOfHour(selectedDate);
    start.setHours(0, 0, 0, 0);
    return addMinutes(start, i * 30);
  });

  // Filter slots for TODAY based on current time as requested
  const filteredSlots = isToday(selectedDate) 
    ? timeSlots.filter(slot => {
        const now = new Date();
        return isAfter(slot, now);
      })
    : timeSlots.filter(slot => slot.getHours() >= 8 && slot.getHours() <= 22);

  const isSelected = (slot: Date) => {
    return selectedSlots.some(s => isSameMinute(s, slot));
  };

  const getAppointmentForSlot = (slot: Date) => {
    return appointments.find(app => {
      const appDate = new Date(app.start_time);
      return isSameMinute(appDate, slot);
    });
  };

  // Visual Mapping Logic for Google Events
  // 30 min = 60px -> 1 min = 2px
  const gridStartTime = filteredSlots[0];
  const gridEndTime = addMinutes(filteredSlots[filteredSlots.length - 1], 30);


  const renderAppointment = (appointment: Appointment) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    const isBlocked = appointment.status === 'blocked' || appointment.service_type === 'Bloqueio' || appointment.client_name === 'Horário Bloqueado';
    const selected = selectedAppointmentId === appointment.id;

    // Filter out events outside visible range
    if (end <= gridStartTime || start >= gridEndTime) return null;

    const startForCalc = start < gridStartTime ? gridStartTime : start;
    const endForCalc = end > gridEndTime ? gridEndTime : end;

    const top = (startForCalc.getTime() - gridStartTime.getTime()) / 60000 * 3;
    const height = (endForCalc.getTime() - startForCalc.getTime()) / 60000 * 3;

    return (
      <motion.div 
        key={appointment.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={(e) => {
          e.stopPropagation(); // Prevents booking over
          onAppointmentClick(appointment); // Allows opening options to UNBLOCK (delete)
        }}
        style={{ 
          top: `${top + 4}px`, 
          height: `${height - 8}px`, 
          left: '4px',
          right: '4px',
          ...(isBlocked ? {
            backgroundImage: `repeating-linear-gradient(
              45deg,
              #f3f4f6,
              #f3f4f6 10px,
              #e5e7eb 10px,
              #e5e7eb 20px
            )`
          } : {})
        }}
        className={`
          absolute z-30 rounded-xl p-3 flex flex-col justify-start cursor-pointer transition-all border-l-4 pointer-events-auto shadow-sm
          ${selected ? 'ring-4 ring-blue-500/30 scale-[1.01] z-40' : ''}
          ${isBlocked 
             ? 'border-gray-300 text-gray-500 hover:opacity-90' 
             : 'bg-[#1e61ff] border-[#1a2b4b] text-white hover:shadow-md'
          }
        `}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {isBlocked && <Lock size={12} className="shrink-0" />}
            <span className={`font-black truncate ${height < 50 ? 'text-[12px]' : 'text-[14px]'}`}>
              {isBlocked ? 'Horário Bloqueado' : appointment.client_name}
            </span>
          </div>
          {!isBlocked && height > 45 && (
            <span className="text-[12px] font-bold opacity-80 shrink-0">
              {format(start, 'HH:mm')}
            </span>
          )}
        </div>
        
        {!isBlocked && height > 60 && (
          <div className="flex flex-col mt-2 gap-1 opacity-95">
            {appointment.lead_phone && appointment.lead_phone !== '00000000000' && (
              <div className="flex items-center gap-1.5 text-[12px] font-bold tracking-tight">
                <Phone size={12} className="shrink-0 opacity-80" />
                <span className="truncate">{appointment.lead_phone}</span>
              </div>
            )}
            {appointment.service_type && (
              <div className="flex items-center gap-1.5 text-[12px] font-bold tracking-tight">
                <Scissors size={12} className="shrink-0 opacity-80" />
                <span className="truncate">{appointment.service_type}</span>
              </div>
            )}
          </div>
        )}

        {appointment.notes && !isBlocked && height > 110 && (
          <p className="text-[12px] font-medium opacity-90 mt-2 pt-2 border-t border-white/20 line-clamp-2 leading-tight">
            {appointment.notes}
          </p>
        )}
      </motion.div>
    );
  };

  return (
    <div className="w-full bg-[#ffffff] overflow-hidden">
      <div className="flex flex-col relative">
        
        {/* Absolute Container for Overlays (Supabase) */}
        <div className="absolute left-16 right-0 top-0 bottom-0 pointer-events-none z-20">
          <div className="relative w-full h-full">
            {appointments.map(renderAppointment)}
          </div>
        </div>

        {filteredSlots.map((slot) => {
          const selected = isSelected(slot);

          return (
            <div key={slot.toISOString()} className="flex group min-h-[90px] relative border-t border-gray-100 first:border-0">
              {/* Time Column */}
              <div className="w-16 flex flex-col items-center justify-start">
                <span className="text-[12px] font-bold text-gray-400 mt-[-10px] bg-[#ffffff] px-1 z-10">
                  {format(slot, 'HH:mm')}
                </span>
              </div>

              {/* Grid Line */}
              <div className="flex-1 relative">
                <div 
                  className="absolute inset-0 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSlotClick(slot)}
                />
                
                {selected && (
                  <div className="absolute inset-1 rounded-lg bg-blue-100/50 border-2 border-blue-500 z-10 flex items-center justify-center">
                    <Plus size={14} className="text-blue-500" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
