import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';


/* SWAP_PAYMENT_AND_SEED_POSTAGE_RULE */
export const SWAP_PAYMENT_OPTIONS = ["PayID","Cash","Garden Swap","Free"] as const;
export type SwapPaymentOption = (typeof SWAP_PAYMENT_OPTIONS)[number];
export type SwapFulfillmentOption = "Pickup / Swap" | "Postage (Seeds Only)";

export function isSeedSwapCategory(categoryOrType?: string | null): boolean {
  const norm = String(categoryOrType || "").trim().toLowerCase();
  return norm === "seed" || norm === "seeds";
}

export function getAllowedSwapFulfillmentOptions(categoryOrType?: string | null): SwapFulfillmentOption[] {
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

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#15803d',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#dcfce7',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: 'Plants',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="care"
        options={{
          title: 'Care',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="water" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="seeds"
        options={{
          title: 'Seeds',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="nutrition" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="swap"
        options={{
          title: 'Swap',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'Guide',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
    </Tabs>
  );
}
