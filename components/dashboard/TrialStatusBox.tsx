'use client';

import { Bell } from 'lucide-react';
import { useMemo } from 'react';

interface TrialStatusBoxProps {
  trialEndsAt: string | null;
  planTier: string;
}

/**
 * Premium Trial Status Indicator (Railway Dark Mode Style)
 * Displays the remaining days in the trial period with a compact, minimal dark design.
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
    <div className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium bg-[#0A1911] text-[#34D399] border border-[#133020] shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
      <span className="whitespace-nowrap tracking-tight uppercase">
        {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} restantes
      </span>
    </div>
  );
}
