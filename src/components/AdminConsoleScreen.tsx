import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";

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
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedTitle}>Restricted Admin Area</Text>
        <Text style={styles.lockedSubtitle}>
          Only available when admin access is active.
        </Text>

        <TextInput
          value={passcodeInput}
          onChangeText={setPasscodeInput}
          placeholder="Enter dev/admin code"
          secureTextEntry
          style={styles.input}
        />

        <View style={styles.row}>
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
      `Added "${trimmed}" (${itemKind}) — Postage: ${effectivePostageAllowed ? "Allowed (Seed)" : "Disabled"}`
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Admin Control Room</Text>
          <Text style={styles.subtitle}>Catalog, Swap policy & app controls</Text>
        </View>
        <TouchableOpacity style={styles.lockBtn} onPress={onLock}>
          <Text style={styles.lockBtnText}>Lock Admin</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(["catalog", "swap", "app"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "catalog" ? "Catalog" : tab === "swap" ? "Swap Policy" : "App & Pro"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "catalog" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Seed, Plant, or Garden Item</Text>
          <TextInput
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g. Black Krim Tomato or Dwarf Eureka Lemon"
            style={styles.input}
          />

          <View style={styles.row}>
            {(["Seed", "Plant", "Garden Item"] as const).map((kind) => (
              <TouchableOpacity
                key={kind}
                style={[styles.pill, itemKind === kind && styles.pillActive]}
                onPress={() => {
                  setItemKind(kind);
                  if (kind !== "Seed") setSeedPostage(false);
                }}
              >
                <Text style={[styles.pillText, itemKind === kind && styles.pillTextActive]}>
                  {kind}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {itemKind === "Seed" ? (
            <TouchableOpacity
              style={styles.toggleRow}
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
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    padding: 20,
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  lockedTitle: { fontSize: 18, fontWeight: "800", color: "#7f1d1d" },
  lockedSubtitle: { fontSize: 13, color: "#991b1b" },
  container: { padding: 18, gap: 14 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#14532d" },
  subtitle: { fontSize: 12, color: "#475569" },
  tabRow: { flexDirection: "row", gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: "#15803d" },
  tabText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  tabTextActive: { color: "#ffffff" },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#14532d" },
  bodyText: { fontSize: 13, color: "#1e293b", lineHeight: 18 },
  helperText: { fontSize: 12, color: "#475569" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: "#ffffff",
  },
  row: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  pillActive: { backgroundColor: "#15803d", borderColor: "#15803d" },
  pillText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  pillTextActive: { color: "#ffffff" },
  toggleRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
  },
  toggleLabel: { fontSize: 12, fontWeight: "700", color: "#14532d" },
  primaryBtn: {
    backgroundColor: "#15803d",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  primaryBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  secondaryBtn: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  secondaryBtnText: { color: "#1e293b", fontWeight: "700", fontSize: 13 },
  lockBtn: {
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  lockBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  listBox: { gap: 4, paddingTop: 4 },
  listItem: { fontSize: 12, color: "#14532d", fontWeight: "600" },
  statusText: { fontSize: 12, fontWeight: "700", color: "#14532d" },
});
