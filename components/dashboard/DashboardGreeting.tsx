'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AiToggle } from './AiToggle';

interface DashboardGreetingProps {
  userName: string;
  isConnected?: boolean;
}

export function DashboardGreeting({ userName, isConnected = false }: DashboardGreetingProps) {
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
    <div className="flex items-center justify-between">
      <motion.h1
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-3xl font-bold text-gray-950 tracking-tight"
      >
        {greeting || '...'}{userName ? `,\n${userName}` : ''}
      </motion.h1>

      {isConnected === true && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex flex-col items-center gap-1"
        >
          <AiToggle />
        </motion.div>
      )}
    </div>
  );
}
