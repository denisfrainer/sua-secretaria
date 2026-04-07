'use client';

import React from 'react';
import { format, isSameDay, startOfToday } from 'date-fns';
import { User, Clock, CheckCircle2, AlertCircle, Plus, Phone, Ban } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock Booked Slots based on the screenshot
const MOCK_BOOKED = [
  { time: '09:00', client: 'Maria', service: 'Buço', status: 'confirmed' },
  { time: '10:30', client: 'Ana', service: 'Axila', status: 'confirmed' },
  { time: '14:00', client: 'Juliana', service: 'Virilha', status: 'confirmed' },
];

export function TimeSlotList({ date, onSlotClick, loading }: { date: Date; onSlotClick: (slot: any) => void; loading: boolean }) {
  const today = startOfToday();
  const isTodaySelected = isSameDay(date, today);

  // Generate slots from 08:00 to 18:00 in 30min intervals
  const slots = Array.from({ length: 21 }).map((_, i) => {
    const totalMinutes = 8 * 60 + i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Check if booked
    const booked = MOCK_BOOKED.find(b => b.time === timeStr && isTodaySelected);
    return {
      time: timeStr,
      booked: booked || null,
      type: booked ? 'booked' : 'free',
      isPast: isTodaySelected && totalMinutes < (new Date().getHours() * 60 + new Date().getMinutes()),
    };
  });

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-gray-400">
        <Clock className="animate-pulse" size={48} />
        <p className="text-sm font-bold uppercase tracking-widest">Sincronizando Agenda...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-black/5">
      {slots.map((slot, i) => {
        const isBooked = !!slot.booked;
        
        return (
          <motion.div
            key={slot.time}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => onSlotClick(slot)}
            className={`group p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-gray-50/50 ${
              slot.isPast && !isBooked ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {/* Time Indicator */}
            <div className="w-12 text-center flex flex-col">
              <span className={`text-sm font-black tracking-tight ${isBooked ? 'text-gray-900' : 'text-gray-400'}`}>
                {slot.time}
              </span>
              <div className={`mt-1 h-0.5 w-full rounded-full transition-colors ${isBooked ? 'bg-blue-600' : 'bg-transparent group-hover:bg-gray-200'}`} />
            </div>

            {/* Content Card */}
            {isBooked ? (
              <div className="flex-1 bg-white p-3.5 rounded-2xl border border-black/5 shadow-sm shadow-black/5 flex items-center justify-between group-hover:border-blue-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <User size={18} className="text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 leading-tight">
                      {slot.booked?.client}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {slot.booked?.service}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500" />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between group-hover:px-2 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-dashed border-gray-200 group-hover:border-blue-200 group-hover:bg-blue-50/30 transition-all">
                    <Plus size={16} className="text-gray-300 group-hover:text-blue-400" />
                  </div>
                  <span className="text-sm font-bold text-gray-300 group-hover:text-gray-400">
                    Livre
                  </span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-black/10">
                    Agendar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
