'use client';

import React, { useEffect, useState } from 'react';

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
      
      if (hour >= 5 && hour < 12) return 'bom dia';
      if (hour >= 12 && hour < 18) return 'boa tarde';
      return 'boa noite';
    }

    setGreeting(getGreeting());
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-black text-gray-900 tracking-tight animate-in fade-in duration-700">
        Olá, {userName}, {greeting || '...'}!
      </h1>
    </div>
  );
}
