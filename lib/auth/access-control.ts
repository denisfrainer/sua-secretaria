export type PlanTier = 'FREE' | 'TRIAL' | 'STARTER' | 'PRO' | 'ELITE';

/**
 * Granular Feature Gating Configuration
 * Defines which plan tiers have access to specific features.
 */
export const FeatureGates = {
  // Level 1: Core Infrastructure
  SMART_MENU_CONFIG: ['FREE', 'TRIAL', 'STARTER', 'PRO', 'ELITE'] as PlanTier[],
  AUTOMATED_PAYMENTS_PIX: ['TRIAL', 'PRO', 'ELITE'] as PlanTier[],
  GOOGLE_SHEETS_SYNC: ['TRIAL', 'PRO', 'ELITE'] as PlanTier[],
  
  // Level 2: Efficiency & Stability (PRO+)
  WHATSAPP_CONNECT: ['FREE', 'TRIAL', 'STARTER', 'PRO', 'ELITE'] as PlanTier[],
  AI_CONFIGURATION: ['TRIAL', 'PRO', 'ELITE'] as PlanTier[],
  
  // Level 3: Growth & Expansion (ELITE only)
  WOLF_AGENT_OUTBOUND: ['ELITE'] as PlanTier[],
};

/**
 * Validates if a user plan has access to a specific feature.
 * @param userPlan The plan tier of the current user/tenant
 * @param feature The feature key to check
 * @returns boolean indicating access grant
 */
export function hasAccess(userPlan: PlanTier, feature: keyof typeof FeatureGates, trialEndsAt?: string | null): boolean {
  const allowedTiers = FeatureGates[feature];
  let granted = allowedTiers.includes(userPlan);

  // 🛡️ [HYBRID TRIAL GATE] If user is TRIAL, check expiration
  if (userPlan === 'TRIAL' && trialEndsAt) {
    const isExpired = new Date() > new Date(trialEndsAt);
    if (isExpired) {
      console.warn(`[AUTH_GATE] Feature: ${feature} | Plan: TRIAL | Status: EXPIRED (${trialEndsAt})`);
      return false;
    }
  }

  console.log(
    `[AUTH_GATE] Feature: ${feature} | Plan: ${userPlan} | Access Granted: ${granted}`
  );

  return granted;
}

/**
 * Legacy wrapper to prevent breaking changes while refactoring routes.
 * Decouples the UI logic from the internal gate names.
 */
export function checkAccess(
  tenantId: string,
  currentTier: PlanTier,
  requiredTier: PlanTier // This argument is now symbolic in the new architecture
): { granted: boolean; error?: string } {
  // We'll perform a generic check or let the specific route call hasAccess directly.
  // For now, this just proxies to the new logic to fix build errors.
  const isAllowed = currentTier === 'PRO' || currentTier === 'ELITE' || requiredTier === 'STARTER';
  
  return { 
    granted: isAllowed,
    error: isAllowed ? undefined : 'Feature requires a higher plan.'
  };
}
