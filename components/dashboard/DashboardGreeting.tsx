'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
    <div className="flex flex-col gap-1">
      <motion.h1 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-3xl font-bold text-gray-950 tracking-tight"
      >
        {greeting || '...'}{userName ? `, ${userName}` : ''}
      </motion.h1>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex items-center gap-2 mt-1"
      >
        <span className="relative flex h-2.5 w-2.5">
          {isOnline && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {isOnline ? 'IA Online' : 'IA Offline'}
        </span>
        {instanceName && (
          <span className="text-[10px] text-slate-400 font-medium">[{instanceName}]</span>
        )}
      </motion.div>
    </div>
  );
}
