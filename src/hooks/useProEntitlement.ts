import { useCallback, useEffect, useRef, useState } from "react";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { CustomerInfo } from "react-native-purchases";
import { Platform } from "react-native";

type PurchasesClient = typeof import("react-native-purchases").default;

export interface ProEntitlementState {
  isPro: boolean;
  isLoading: boolean;
  isAvailable: boolean;
  error: string | null;
  refreshEntitlement: () => Promise<boolean>;
}

let configuredApiKey: string | null = null;
let purchasesInitialization: Promise<PurchasesClient> | null = null;

function initializePurchases(apiKey: string): Promise<PurchasesClient> {
  if (configuredApiKey === apiKey && purchasesInitialization) {
    return purchasesInitialization;
  }

  configuredApiKey = apiKey;
  const initialization = import("react-native-purchases").then(
    async ({ default: Purchases }) => {
      if (!(await Purchases.isConfigured())) {
        Purchases.configure({ apiKey });
      }
      return Purchases;
    },
  );
  purchasesInitialization = initialization;

  void initialization.catch(() => {
    if (purchasesInitialization === initialization) {
      configuredApiKey = null;
      purchasesInitialization = null;
    }
  });

  return initialization;
}

function hasActiveProEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active.pro?.isActive === true;
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  return message || "Unable to load subscription status.";
}

export function useProEntitlement(): ProEntitlementState {
  const apiKey = process.env.EXPO_PUBLIC_RC_ANDROID_KEY?.trim() ?? "";
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
    Boolean(Constants.expoGoConfig);
  const isAvailable = Boolean(apiKey) && Platform.OS === "android" && !isExpoGo;
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(isAvailable);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refreshEntitlement = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      if (isMounted.current) {
        setIsPro(false);
        setError(null);
        setIsLoading(false);
      }
      return false;
    }

    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const Purchases = await initializePurchases(apiKey);
      const customerInfo = await Purchases.getCustomerInfo();
      const active = hasActiveProEntitlement(customerInfo);
      if (isMounted.current) {
        setIsPro(active);
      }
      return active;
    } catch (caughtError) {
      if (isMounted.current) {
        setIsPro(false);
        setError(getErrorMessage(caughtError));
      }
      return false;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [apiKey, isAvailable]);

  useEffect(() => {
    if (!isAvailable) return;

    let active = true;
    let Purchases: PurchasesClient | null = null;
    const listener = (customerInfo: CustomerInfo) => {
      if (!active) return;
      setIsPro(hasActiveProEntitlement(customerInfo));
      setError(null);
    };

    const subscribe = async () => {
      try {
        Purchases = await initializePurchases(apiKey);
        if (!active) return;
        Purchases.addCustomerInfoUpdateListener(listener);
        await refreshEntitlement();
      } catch (caughtError) {
        if (!active) return;
        setIsPro(false);
        setIsLoading(false);
        setError(getErrorMessage(caughtError));
      }
    };

    void subscribe();

    return () => {
      active = false;
      if (Purchases) {
        try {
          Purchases.removeCustomerInfoUpdateListener(listener);
        } catch (caughtError) {
          console.warn("Unable to remove RevenueCat customer-info listener.", caughtError);
        }
      }
    };
  }, [apiKey, isAvailable, refreshEntitlement]);

  return { isPro, isLoading, isAvailable, error, refreshEntitlement };
}
