'use client';

import { useMemo } from 'react';

interface TrialStatusBoxProps {
  trialEndsAt: string | null;
  planTier: string;
}

/**
 * Minimalist Trial Status Indicator
 * Refactored for a lighter, text-focused design.
 */
export function TrialStatusBox({ trialEndsAt, planTier }: TrialStatusBoxProps) {
  const daysLeft = useMemo(() => {
    if (planTier !== 'TRIAL') return null;
    if (!trialEndsAt) return 30; // 🛡️ Fallback for missing date

    const end = new Date(trialEndsAt);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }, [trialEndsAt, planTier]);

  // Only show for TRIAL status
  if (daysLeft === null) return null;

  return (
    <div className="inline-flex items-center px-4 py-1.5 rounded-md text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-500 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
      <span className="whitespace-nowrap tracking-tight">
        {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}
      </span>
    </div>
  );
}
