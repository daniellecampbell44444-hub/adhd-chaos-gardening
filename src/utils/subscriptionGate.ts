export type PlanTier = "free" | "pro";

export interface ProFeatureAccess {
  tier: PlanTier;
  isPro: boolean;
  canExportData: boolean;
  canUseUnlimitedZones: boolean;
  canUseBatchVault: boolean;
  canUseClimateReminders: boolean;
}

export function getFeatureAccess(hasActiveProEntitlement: boolean): ProFeatureAccess {
  const isPro = Boolean(hasActiveProEntitlement);
  return {
    tier: isPro ? "pro" : "free",
    isPro,
    canExportData: isPro,
    canUseUnlimitedZones: isPro,
    canUseBatchVault: isPro,
    canUseClimateReminders: isPro,
  };
}
