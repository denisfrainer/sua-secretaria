'use client';

import React from 'react';
import { format, isSameMinute, startOfHour, addMinutes, isToday, isAfter, setHours, setMinutes } from 'date-fns';
import { motion } from 'framer-motion';
import { User, Lock, Plus, Clock } from 'lucide-react';
import { Appointment } from '@/hooks/useAppointments';

interface CalendarGridProps {
  selectedDate: Date;
  appointments: Appointment[];
  selectedSlots: Date[];
  onSlotClick: (slot: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  selectedAppointmentId?: string | null;
}

export function CalendarGrid({ 
  selectedDate, 
  appointments, 
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
        const currentHour = now.getHours();
        // User example: 14:35 -> show from 15:00
        // So we show slots where hour >= currentHour + 1 (or just after now)
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

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="w-full bg-[#ffffff] overflow-hidden">
      <div className="flex flex-col relative">
        
        {filteredSlots.map((slot) => {
          const appointment = getAppointmentForSlot(slot);
          const selected = isSelected(slot);
          const isBlocked = appointment?.status === 'BLOCKED';
          const isHourStart = slot.getMinutes() === 0;

          return (
            <div key={slot.toISOString()} className="flex group min-h-[60px] relative border-t border-gray-100 first:border-0">
              {/* Time Column */}
              <div className="w-16 flex flex-col items-center justify-start pt-[-10px]">
                <span className="text-[12px] font-bold text-gray-400 mt-[-10px] bg-[#ffffff] px-1 z-10">
                  {format(slot, 'HH:mm')}
                </span>
              </div>

              {/* Grid Line (Google style) */}
              <div className="flex-1 relative">
                <div 
                  className="absolute inset-0 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => appointment ? onAppointmentClick(appointment) : onSlotClick(slot)}
                />
                
                {appointment ? (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(appointment);
                    }}
                    className={`
                      absolute inset-1 rounded-xl p-3 flex flex-col justify-start z-10 cursor-pointer transition-all border-l-4
                      ${selectedAppointmentId === appointment.id ? 'ring-4 ring-blue-500/30 scale-[1.02] z-20' : ''}
                      ${isBlocked 
                        ? 'bg-gray-50 border-gray-200 text-gray-400' 
                        : 'bg-[#039be5] border-[#0288d1] text-white shadow-sm hover:shadow-md'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-black truncate">
                        {isBlocked ? 'Bloqueado' : appointment.client_name}
                      </span>
                      {!isBlocked && <span className="text-[11px] font-bold opacity-80">{format(new Date(appointment.start_time), 'HH:mm')}</span>}
                    </div>
                    {appointment.notes && !isBlocked && (
                      <p className="text-[11px] font-bold opacity-90 mt-1 line-clamp-1 leading-tight">
                        {appointment.notes}
                      </p>
                    )}
                  </motion.div>
                ) : selected && (
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
