import { useMemo, useState } from "react";
import { getFeatureAccess, ProFeatureAccess } from "./subscriptionGate";

/**
 * Starter subscription hook for development & pre-billing UI gating.
 * Replace `hasActivePro` with your live Google Play / RevenueCat entitlement
 * once native billing is connected in a development/internal build.
 */
export function useSubscription(initialPro = false): ProFeatureAccess & {
  setTestProEnabled: (enabled: boolean) => void;
} {
  const [hasActivePro, setHasActivePro] = useState<boolean>(initialPro);

  const access = useMemo(() => getFeatureAccess(hasActivePro), [hasActivePro]);

  return {
    ...access,
    setTestProEnabled: setHasActivePro,
  };
}
