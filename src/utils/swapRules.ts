export const SWAP_PAYMENT_OPTIONS = [
  "PayID",
  "Cash",
  "Garden Swap",
  "Free",
] as const;

export type SwapPaymentOption = (typeof SWAP_PAYMENT_OPTIONS)[number];
export type SwapFulfillmentOption = "Pickup / Swap" | "Postage (Seeds Only)";

export function isSeedSwapCategory(categoryOrType?: string | null): boolean {
  const norm = String(categoryOrType || "").trim().toLowerCase();
  return norm === "seed" || norm === "seeds";
}

export function getAllowedSwapFulfillmentOptions(
  categoryOrType?: string | null
): SwapFulfillmentOption[] {
  return isSeedSwapCategory(categoryOrType)
    ? ["Pickup / Swap", "Postage (Seeds Only)"]
    : ["Pickup / Swap"];
}

export function normalizeSwapFulfillment(
  categoryOrType: string | null | undefined,
  requested?: string | null
): SwapFulfillmentOption {
  if (!isSeedSwapCategory(categoryOrType)) {
    return "Pickup / Swap";
  }
  return requested === "Postage (Seeds Only)" || requested === "Postage"
    ? "Postage (Seeds Only)"
    : "Pickup / Swap";
}

export function shouldShowSeedPostageFee(
  categoryOrType?: string | null,
  fulfillment?: string | null
): boolean {
  return isSeedSwapCategory(categoryOrType) && normalizeSwapFulfillment(categoryOrType, fulfillment) === "Postage (Seeds Only)";
}

export function normalizeSeedPostageFeeAud(
  categoryOrType: string | null | undefined,
  fulfillment: string | null | undefined,
  rawFee?: string | number | null
): number | null {
  if (!shouldShowSeedPostageFee(categoryOrType, fulfillment)) {
    return null;
  }
  if (rawFee === null || rawFee === undefined || String(rawFee).trim() === "") {
    return null;
  }
  const parsed = Number(String(rawFee).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}
