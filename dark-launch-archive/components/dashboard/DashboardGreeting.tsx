'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface DashboardGreetingProps {
  userName: string;
}

export function DashboardGreeting({ userName }: DashboardGreetingProps) {
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
    <motion.h1
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="text-2xl font-extrabold text-gray-950 tracking-tight"
    >
      {greeting || '...'}{userName ? `, ${userName}` : ''}
    </motion.h1>
  );
}
