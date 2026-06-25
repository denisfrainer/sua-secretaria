'use client';

import React, { useState } from 'react';
import { Link as LinkIcon, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AppointmentLinkButtonProps {
  businessId: string | number;
}

export function AppointmentLinkButton({ businessId }: AppointmentLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/agendar/${businessId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <button 
      onClick={handleCopy}
      className="relative aspect-square bg-rose-400 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-lg shadow-rose-400/20 hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div 
            key="check"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 45 }}
            className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md"
          >
            <Check size={32} />
          </motion.div>
        ) : (
          <motion.div 
            key="link"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white/30 transition-all"
          >
            <LinkIcon size={32} />
          </motion.div>
        )}
      </AnimatePresence>
      
      <span className="text-sm font-black text-white uppercase tracking-wider leading-tight">
        {copied ? 'Link Copiado!' : 'Link de Agendamento'}
      </span>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-2 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full shadow-sm"
          >
            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest italic">Copiado!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
