'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AiToggle } from './AiToggle';

interface DashboardGreetingProps {
  userName: string;
  isOnline?: boolean;
  instanceName?: string;
}

export function DashboardGreeting({ userName, isOnline, instanceName }: DashboardGreetingProps) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    function getGreeting(): string {
      const hour = parseInt(
        new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: 'numeric',
          hour12: false
        }).format(new Date())
      );

      if (hour >= 5 && hour < 12) return 'Bom dia';
      if (hour >= 12 && hour < 18) return 'Boa tarde';
      return 'Boa noite';
    }

    setGreeting(getGreeting());
  }, []);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.h1 
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-3xl font-bold text-gray-950 tracking-tight"
          >
            {greeting || '...'}{userName ? `, ${userName}` : ''}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative flex items-center justify-center translate-y-0.5"
          >
            {isOnline ? (
              <>
                <div className="absolute w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-20" />
                <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
              </>
            ) : (
              <div className="w-4 h-4 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
            )}
          </motion.div>
        </div>

        <AiToggle />
      </div>

      {instanceName && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-0.5"
        >
          IA {isOnline ? 'Active' : 'Standby'} • {instanceName}
        </motion.p>
      )}
    </div>
  );
}
