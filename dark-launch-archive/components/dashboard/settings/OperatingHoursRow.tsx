'use client';

import React from 'react';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
});

interface OperatingHoursRowProps {
  label: string;
  data?: { open: string; close: string; is_closed: boolean };
  onChange: (field: 'open' | 'close' | 'is_closed', val: any) => void;
}

export function OperatingHoursRow({
  label,
  data,
  onChange
}: OperatingHoursRowProps) {
  const safeData = typeof data === 'object' && data !== null ? data : { open: '09:00', close: '18:00', is_closed: false };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
      <div className="flex flex-col gap-1">
        <span className="text-base font-bold text-gray-900">{label}</span>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {safeData.is_closed ? 'Fechado' : `${safeData.open} — ${safeData.close}`}
        </span>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto">
        <div className="flex items-center gap-3 sm:pr-6 sm:border-r border-black/5">
          <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Aberto</span>
          <button
            type="button"
            onClick={() => onChange('is_closed', !safeData.is_closed)}
            className={`
              relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none
              ${!safeData.is_closed ? 'bg-green-500' : 'bg-red-500'}
            `}
          >
            <div
              className={`
                absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200
                ${!safeData.is_closed ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        <div className={`flex items-center gap-1.5 transition-opacity duration-200 ${safeData.is_closed ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          <select
            value={safeData.open}
            onChange={(e) => onChange('open', e.target.value)}
            className="bg-gray-50 border border-black/5 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none cursor-pointer"
          >
            {TIME_OPTIONS.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
          <span className="text-gray-300 font-bold text-xs">às</span>
          <select
            value={safeData.close}
            onChange={(e) => onChange('close', e.target.value)}
            className="bg-gray-50 border border-black/5 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none cursor-pointer"
          >
            {TIME_OPTIONS.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
