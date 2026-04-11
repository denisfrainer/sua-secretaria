'use client';

import { Bell } from 'lucide-react';
import { useMemo } from 'react';

interface TrialStatusBoxProps {
  trialEndsAt: string | null;
  planTier: string;
}

/**
 * Premium Trial Status Indicator (Railway Style)
 * Displays the remaining days in the trial period with a compact, minimal design.
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
    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#ecfdf5] border border-[#10b981]/20 rounded-lg shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="relative">
        <Bell size={14} className="text-[#10b981]" />
      </div>
      <span className="text-[11px] font-bold text-[#065f46] whitespace-nowrap tracking-tight">
        {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} restantes
      </span>
    </div>
  );
}
