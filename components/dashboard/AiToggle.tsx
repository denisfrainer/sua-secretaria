'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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

    setEnabled(newState);
    setLoading(true);

    try {
      const res = await fetch('/api/dashboard/system-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState }),
      });

      if (!res.ok) throw new Error('Failed to update');
      
      const data = await res.json();
      setEnabled(data.enabled);
    } catch (error) {
      console.error('[AI_TOGGLE] Toggle error:', error);
      setEnabled(previousState);
    } finally {
      setLoading(false);
    }
  };

  // Skeleton while loading initial state
  if (enabled === null) {
    return <div className="w-[52px] h-[30px] bg-slate-100 rounded-full animate-pulse" />;
  }

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={enabled}
      initial={false}
      animate={{ 
        backgroundColor: enabled ? '#34C759' : '#FF3B30',
        opacity: loading ? 0.6 : 1
      }}
      onClick={toggleAi}
      className={`relative w-[52px] h-[30px] rounded-full shrink-0 shadow-inner ${loading ? 'cursor-wait' : 'cursor-pointer'}`}
    >
      <motion.span 
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`
          absolute top-[2px] left-[2px] w-[26px] h-[26px] rounded-full bg-white shadow-md flex items-center justify-center
          ${enabled ? 'translate-x-[22px]' : 'translate-x-0'}
        `} 
      >
        {loading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
      </motion.span>
    </motion.button>
  );
}
