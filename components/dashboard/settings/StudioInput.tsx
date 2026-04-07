'use client';

import React from 'react';

interface StudioInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

export function StudioInput({
  label,
  value,
  onChange,
  placeholder,
  icon
}: StudioInputProps) {
  return (
    <div className="w-full flex flex-col gap-2 font-source">
      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full bg-white border border-black/5 rounded-2xl py-4 pr-4 transition-all
            text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 shadow-sm
            placeholder:text-gray-300 truncate
            ${icon ? 'pl-11' : 'pl-4'}
          `}
        />
      </div>
    </div>
  );
}
