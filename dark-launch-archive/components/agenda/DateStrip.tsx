'use client';

import React, { useRef, useEffect } from 'react';
import { format, addDays, isSameDay, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

export function DateStrip({ selectedDate, onDateChange }: { selectedDate: Date; onDateChange: (date: Date) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = startOfToday();
  
  // Generate next 14 days
  const dates = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  const isToday = isSameDay(selectedDate, today);
  const isTomorrow = isSameDay(selectedDate, addDays(today, 1));

  return (
    <div className="flex flex-col gap-3">
      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDateChange(today)}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            isToday ? 'bg-black text-white' : 'bg-white border border-black/5 text-gray-400 hover:text-black'
          }`}
        >
          Hoje
        </button>
        <button
          onClick={() => onDateChange(addDays(today, 1))}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            isTomorrow ? 'bg-black text-white' : 'bg-white border border-black/5 text-gray-400 hover:text-black'
          }`}
        >
          Amanhã
        </button>
      </div>

      {/* Scrollable Strip */}
      <div 
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 -mx-4 px-4 mask-fade-edges"
      >
        {dates.map((date) => {
          const selected = isSameDay(date, selectedDate);
          return (
            <motion.button
              key={date.toISOString()}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDateChange(date)}
              className={`flex flex-col items-center justify-center min-w-[64px] h-[84px] rounded-[1.5rem] transition-all relative ${
                selected 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white border border-black/5 text-gray-400 hover:bg-gray-50'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">
                {format(date, 'eee', { locale: ptBR })}
              </span>
              <span className="text-xl font-black tracking-tight mt-0.5">
                {format(date, 'd')}
              </span>
              {selected && (
                <motion.div 
                  layoutId="date-dot"
                  className="absolute bottom-2 w-1 h-1 rounded-full bg-white"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
