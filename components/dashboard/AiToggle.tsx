'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function AiToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchInitialStatus() {
      try {
        const res = await fetch('/api/dashboard/system-toggle');
        const data = await res.json();
        setEnabled(data.enabled ?? true);
      } catch (error) {
        console.error('[AI_TOGGLE] Fetch error:', error);
        setEnabled(true);
      }
    }
    fetchInitialStatus();
  }, []);

  const toggleAi = async () => {
    if (enabled === null || loading) return;

    const previousState = enabled;
    const newState = !previousState;

    // Optimistic UI
    setEnabled(newState);
    setLoading(true);

    try {
      const res = await fetch('/api/dashboard/ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState }),
      });

      if (!res.ok) throw new Error('Failed to update');
      
      const data = await res.json();
      setEnabled(data.enabled);
    } catch (error) {
      console.error('[AI_TOGGLE] Toggle error:', error);
      // Rollback on error
      setEnabled(previousState);
    } finally {
      setLoading(false);
    }
  };

  if (enabled === null) return <div className="w-11 h-6 bg-slate-100 rounded-full animate-pulse" />;

  return (
    <div className="flex items-center gap-3">
      <div 
        onClick={toggleAi}
        className={`
          relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out
          ${enabled ? 'bg-emerald-500' : 'bg-slate-200'}
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <motion.div 
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      <span className={`text-[11px] font-bold uppercase tracking-wider ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
        IA {enabled ? 'Ativa' : 'Pausada'}
      </span>
    </div>
  );
}
