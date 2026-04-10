'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
}

export function DashboardToast({ message, type = 'success', isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-md"
        >
          <div className={`
            flex items-center gap-4 p-4 rounded-[1.5rem] shadow-2xl border
            ${type === 'success' 
              ? 'bg-white border-emerald-100 text-emerald-900' 
              : 'bg-white border-red-100 text-red-900'}
          `}>
             <div className={`
               w-10 h-10 rounded-xl flex items-center justify-center shrink-0
               ${type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}
             `}>
               {type === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
             </div>
             
             <div className="flex-1">
               <p className="text-sm font-bold tracking-tight leading-tight">
                 {message}
               </p>
             </div>

             <button 
               onClick={onClose}
               className="p-1 hover:bg-black/5 rounded-lg transition-colors text-gray-400"
             >
               <X size={18} />
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
