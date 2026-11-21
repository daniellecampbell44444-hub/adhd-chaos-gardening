import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WARM_THEME } from "../utils/warmTheme";

export interface AdminStagedItem {
  id: string;
  name: string;
  kind: "Seed" | "Plant" | "Garden Item";
  postageAllowed: boolean;
}

interface AdminConsoleScreenProps {
  isAdmin: boolean;
  onUnlock: (passcode: string) => boolean;
  onLock: () => void;
  onClose?: () => void;
  isProPreview?: boolean;
  onToggleProPreview?: (enabled: boolean) => void;
  onStageItem?: (item: AdminStagedItem) => void;
}

export function AdminConsoleScreen({
  isAdmin,
  onUnlock,
  onLock,
  onClose,
  isProPreview = false,
  onToggleProPreview,
  onStageItem,
}: AdminConsoleScreenProps) {
  const [passcodeInput, setPasscodeInput] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"catalog" | "swap" | "app">("catalog");

  const [itemName, setItemName] = useState("");
  const [itemKind, setItemKind] = useState<"Seed" | "Plant" | "Garden Item">("Seed");
  const [seedPostage, setSeedPostage] = useState(true);
  const [stagedItems, setStagedItems] = useState<AdminStagedItem[]>([]);

  const handleUnlockPress = () => {
    const ok = onUnlock(passcodeInput);
    if (ok) {
      setPasscodeInput("");
      setStatusMessage("Admin mode unlocked.");
    } else {
      setStatusMessage("Admin access denied.");
    }
  };

  // Hard guard: never render admin tools unless isAdmin is true
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedTitle}>Restricted Admin Area</Text>
          <Text style={styles.lockedSubtitle}>
            Only available when admin access is active.
          </Text>

          <TextInput
            value={passcodeInput}
            onChangeText={setPasscodeInput}
            placeholder="Enter dev/admin code"
            placeholderTextColor={WARM_THEME.textSecondary}
            secureTextEntry
            style={styles.input}
          />

          <View style={styles.wrapRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUnlockPress}>
              <Text style={styles.primaryBtnText}>Verify Admin</Text>
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>

          {statusMessage && <Text style={styles.statusText}>{statusMessage}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  const effectivePostageAllowed = itemKind === "Seed" && seedPostage;

  const handleAddStagedItem = () => {
    const trimmed = itemName.trim();
    if (!trimmed) {
      setStatusMessage("Enter a seed, plant, or garden item name first.");
      return;
    }
    const created: AdminStagedItem = {
      id: String(Date.now()),
      name: trimmed,
      kind: itemKind,
      postageAllowed: effectivePostageAllowed,
    };
    setStagedItems((prev) => [created, ...prev]);
    onStageItem?.(created);
    setItemName("");
    setStatusMessage(
      `Added "${trimmed}" (${itemKind}) — Postage: ${
        effectivePostageAllowed ? "Allowed (Seed)" : "Disabled"
      }`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>Admin Control Room</Text>
            <Text style={styles.subtitle}>Catalog, Swap policy & app controls</Text>
          </View>
          <TouchableOpacity style={styles.lockBtn} onPress={onLock}>
            <Text style={styles.lockBtnText}>Lock Admin</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabWrapRow}>
          {(["catalog", "swap", "app"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab === "catalog"
                    ? "Catalog"
                    : tab === "swap"
                    ? "Swap Policy"
                    : "App & Pro"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === "catalog" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Seed, Plant, or Garden Item</Text>
            <TextInput
              value={itemName}
              onChangeText={setItemName}
              placeholder="e.g. Black Krim Tomato or Dwarf Eureka Lemon"
              placeholderTextColor={WARM_THEME.textSecondary}
              style={styles.input}
            />

            <View style={styles.wrapRow}>
              {(["Seed", "Plant", "Garden Item"] as const).map((kind) => {
                const selected = itemKind === kind;
                return (
                  <TouchableOpacity
                    key={kind}
                    style={[styles.pill, selected && styles.pillActive]}
                    onPress={() => {
                      setItemKind(kind);
                      if (kind !== "Seed") setSeedPostage(false);
                    }}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                      {kind}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {itemKind === "Seed" ? (
              <TouchableOpacity
                style={styles.toggleBox}
                onPress={() => setSeedPostage((prev) => !prev)}
              >
                <Text style={styles.toggleLabel}>
                  Allow postage for this seed listing: {seedPostage ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.helperText}>
                Postage is restricted to Seeds only ({itemKind} items use Pickup / Swap).
              </Text>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddStagedItem}>
              <Text style={styles.primaryBtnText}>Save Admin Entry</Text>
            </TouchableOpacity>

            {stagedItems.length > 0 && (
              <View style={styles.listBox}>
                {stagedItems.map((item) => (
                  <Text key={item.id} style={styles.listItem}>
                    • {item.name} [{item.kind}] —{" "}
                    {item.postageAllowed ? "Postage OK" : "Pickup / Swap only"}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === "swap" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Swap Rules Checklist</Text>
            <Text style={styles.bodyText}>
              • Payment options supported across seeds, plants, and garden items: PayID, Cash, Garden Swap, Free.
            </Text>
            <Text style={styles.bodyText}>
              • Postage is permitted for Seeds only; optional postage fee applies only when Seed + Postage is chosen.
            </Text>
            <Text style={styles.bodyText}>
              • Review user-submitted listings before publishing publicly when moderation is enabled.
            </Text>
          </View>
        )}

        {activeTab === "app" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Subscription & App Controls</Text>
            <Text style={styles.bodyText}>
              Dev Pro Preview status: {isProPreview ? "ACTIVE" : "FREE TIER"}
            </Text>
            {onToggleProPreview && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  const next = !isProPreview;
                  onToggleProPreview(next);
                  setStatusMessage(`Dev Pro Preview set to ${next ? "ON" : "OFF"}`);
                }}
              >
                <Text style={styles.primaryBtnText}>
                  {isProPreview ? "Switch to Free Preview" : "Switch to Pro Preview"}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.helperText}>
              Keep real billing entitlements and admin roles verified on your backend/Google Play before public release.
            </Text>
          </View>
        )}

        {statusMessage && <Text style={styles.statusText}>{statusMessage}</Text>}

        {onClose && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryBtnText}>Close Admin View</Text>
          </TouchableOpacity>
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
  lockedContainer: {
    margin: 16,
    padding: 20,
    gap: 12,
    borderRadius: 16,
    backgroundColor: WARM_THEME.surface,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: WARM_THEME.textPrimary,
  },
  lockedSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: WARM_THEME.textSecondary,
  },
  container: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  headerTextGroup: {
    flex: 1,
    minWidth: 180,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: WARM_THEME.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: WARM_THEME.textSecondary,
  },
  tabWrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabBtn: {
    flexGrow: 1,
    minWidth: 92,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: WARM_THEME.surfaceMuted,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: WARM_THEME.accent,
    borderColor: WARM_THEME.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: WARM_THEME.textPrimary,
  },
  tabTextActive: {
    color: WARM_THEME.accentText,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: WARM_THEME.surface,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: WARM_THEME.textPrimary,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
    color: WARM_THEME.textPrimary,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 17,
    color: WARM_THEME.textSecondary,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WARM_THEME.textPrimary,
    backgroundColor: WARM_THEME.background,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  pillActive: {
    backgroundColor: WARM_THEME.accent,
    borderColor: WARM_THEME.accent,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: WARM_THEME.textPrimary,
  },
  pillTextActive: {
    color: WARM_THEME.accentText,
  },
  toggleBox: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: WARM_THEME.accentSoft,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: WARM_THEME.accent,
  },
  primaryBtn: {
    backgroundColor: WARM_THEME.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  primaryBtnText: {
    color: WARM_THEME.accentText,
    fontWeight: "700",
    fontSize: 13,
  },
  secondaryBtn: {
    backgroundColor: WARM_THEME.surfaceMuted,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  secondaryBtnText: {
    color: WARM_THEME.textPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  lockBtn: {
    backgroundColor: WARM_THEME.danger,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  lockBtnText: {
    color: WARM_THEME.accentText,
    fontWeight: "700",
    fontSize: 12,
  },
  listBox: {
    gap: 5,
    paddingTop: 4,
  },
  listItem: {
    fontSize: 12,
    fontWeight: "600",
    color: WARM_THEME.textPrimary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: WARM_THEME.accent,
  },
});
