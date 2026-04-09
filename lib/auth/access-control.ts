import { PlanTier } from '../supabase/types';

/**
 * Access levels for different features
 */
export const FEATURE_REQUIREMENTS = {
  ELIZA_AGENT: 'PRO' as PlanTier,
  OUTBOUND_PROSPECTING: 'ELITE' as PlanTier, // Wolf Agent / Sales Recovery
  WHATSAPP_CONNECT: 'PRO' as PlanTier,
  AUTO_SCHEDULING: 'PRO' as PlanTier,
};

/**
 * Validates if a tenant has the required tier for a specific feature.
 * Includes observability logging for debugging access control issues.
 */
export function checkAccess(
  tenantId: string,
  currentTier: PlanTier,
  requiredTier: PlanTier
): { granted: boolean; error?: string } {
  const tiers: PlanTier[] = ['STARTER', 'PRO', 'ELITE'];
  const currentIndex = tiers.indexOf(currentTier);
  const requiredIndex = tiers.indexOf(requiredTier);

  const isAllowed = currentIndex >= requiredIndex;

  console.log(
    `[AUTH_CHECK] Tenant: ${tenantId} | Plan: ${currentTier} | Required: ${requiredTier} | Access Granted: ${isAllowed}`
  );

  if (!isAllowed) {
    return {
      granted: false,
      error: `Feature requires ${requiredTier} plan. Current plan: ${currentTier}.`,
    };
  }

  return { granted: true };
}
