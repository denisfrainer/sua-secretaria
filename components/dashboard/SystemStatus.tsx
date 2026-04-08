'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SystemStatusProps {
  isConnected: boolean;
}

export function SystemStatus({ isConnected }: SystemStatusProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1], delay: 0.25 }}
      className="mt-4 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between px-2">
        <h3 className="text-base font-semibold text-gray-600 tracking-tight">Status do sistema</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-base font-medium text-gray-600 tracking-tight">
            {isConnected ? 'WhatsApp conectado' : 'Aguardando configuração'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
