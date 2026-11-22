import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WARM_THEME } from "../utils/warmTheme";

export type SubscriptionPlan = "monthly" | "yearly";

export interface SubscriptionScreenProps {
  onClose?: () => void;
}

const PLAN_DETAILS: Record<
  SubscriptionPlan,
  { title: string; billingDescription: string }
> = {
  monthly: {
    title: "Monthly",
    billingDescription: "Billed monthly",
  },
  yearly: {
    title: "Yearly",
    billingDescription: "Billed annually",
  },
};

const PRO_BENEFITS = [
  "Export your garden data for a portable backup",
  "Keep plants, seeds, and care notes organized together",
  "Plan seasonal tasks and stay on top of garden routines",
  "Track your garden progress from planting through harvest",
];

export function SubscriptionScreen({ onClose }: SubscriptionScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("monthly");
  const [billingMessage, setBillingMessage] = useState<string | null>(null);

  const selectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setBillingMessage(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>GARDEN PLANNER PRO</Text>
            <Text style={styles.title}>Grow with a little more room.</Text>
            <Text style={styles.subtitle}>
              Choose a plan to support your garden planning and keep your progress
              close at hand.
            </Text>
          </View>
          {onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close subscription screen"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose your plan</Text>
          <View style={styles.planRow}>
            {(["monthly", "yearly"] as const).map((plan) => {
              const selected = selectedPlan === plan;
              const details = PLAN_DETAILS[plan];
              return (
                <TouchableOpacity
                  key={plan}
                  style={[styles.planCard, selected && styles.planCardSelected]}
                  onPress={() => selectPlan(plan)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.planHeadingRow}>
                    <Text style={styles.planTitle}>{details.title}</Text>
                    {plan === "yearly" && (
                      <View style={styles.valueBadge}>
                        <Text style={styles.valueBadgeText}>Best Value / Save</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planDescription}>
                    {details.billingDescription}
                  </Text>
                  <Text style={styles.planSelection}>
                    {selected ? "Selected plan" : "Tap to select"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.benefitsCard}>
          <Text style={styles.sectionTitle}>Made for your garden</Text>
          <View style={styles.benefitList}>
            {PRO_BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <View style={styles.benefitMark}>
                  <Text style={styles.benefitMarkText}>✓</Text>
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={() =>
              setBillingMessage(
                "Subscription checkout is not connected yet. No purchase was made."
              )
            }
            accessibilityRole="button"
          >
            <Text style={styles.subscribeButtonText}>
              Subscribe to {PLAN_DETAILS[selectedPlan].title}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={() =>
              setBillingMessage(
                "Purchase restoration is not connected yet. No purchases were changed."
              )
            }
            accessibilityRole="button"
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.billingNote}>
          <Text style={styles.billingNoteText}>
            Checkout and purchase restoration are placeholders until billing is
            connected. Plan selection will not start a charge.
          </Text>
        </View>

        {billingMessage && (
          <View style={styles.feedbackBox} accessibilityLiveRegion="polite">
            <Text style={styles.feedbackText}>{billingMessage}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WARM_THEME.background,
  },
  content: {
    flexGrow: 1,
    padding: WARM_THEME.spacingScreen,
    paddingBottom: WARM_THEME.spacingScreen + 16,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: WARM_THEME.accent,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: WARM_THEME.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: WARM_THEME.textSecondary,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: WARM_THEME.textPrimary,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: WARM_THEME.textPrimary,
  },
  planRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  planCard: {
    flexGrow: 1,
    flexBasis: 145,
    minWidth: 140,
    gap: 8,
    padding: 14,
    borderRadius: WARM_THEME.radiusCard,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  planCardSelected: {
    borderColor: WARM_THEME.accent,
    backgroundColor: WARM_THEME.accentSoft,
  },
  planHeadingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  planTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: "800",
    color: WARM_THEME.textPrimary,
  },
  valueBadge: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accentWarm,
  },
  valueBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: WARM_THEME.textPrimary,
  },
  planDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: WARM_THEME.textSecondary,
  },
  planSelection: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: WARM_THEME.accent,
  },
  benefitsCard: {
    gap: 14,
    padding: 16,
    borderRadius: WARM_THEME.radiusCard,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  benefitList: {
    gap: 12,
  },
  benefitRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  benefitMark: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accentSoft,
  },
  benefitMarkText: {
    fontSize: 13,
    fontWeight: "800",
    color: WARM_THEME.accent,
  },
  benefitTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  benefitText: {
    fontSize: 13,
    lineHeight: 19,
    color: WARM_THEME.textPrimary,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  subscribeButton: {
    flexGrow: 1,
    flexBasis: 170,
    minWidth: 150,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 14,
    backgroundColor: WARM_THEME.accent,
  },
  subscribeButtonText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: WARM_THEME.accentText,
  },
  restoreButton: {
    flexGrow: 1,
    flexBasis: 145,
    minWidth: 135,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  restoreButtonText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: WARM_THEME.textPrimary,
  },
  billingNote: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  billingNoteText: {
    fontSize: 12,
    lineHeight: 18,
    color: WARM_THEME.textSecondary,
  },
  feedbackBox: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.accentWarm,
    backgroundColor: WARM_THEME.accentSoft,
  },
  feedbackText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: WARM_THEME.textPrimary,
  },
});
