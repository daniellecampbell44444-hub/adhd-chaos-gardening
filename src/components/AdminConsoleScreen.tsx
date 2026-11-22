import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { WarmBannerCard } from "./WarmBannerCard";
import { WARM_THEME } from "../utils/warmTheme";
import { PLANT_LIBRARY, useGarden } from "../context/GardenContext";
import {
  APP_COLOR_PRESETS,
  DEFAULT_ADMIN_VISUALS,
  getActivePalette,
  isValidHexColor,
  loadAdminVisuals,
  saveAdminVisuals,
} from "../utils/adminCustomization";
import type { AdminVisualSettings } from "../utils/adminCustomization";
import { getTypeaheadPlantOptions } from "../utils/plantSearch";

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
  onVisualsChange?: (settings: AdminVisualSettings) => void;
}

export function AdminConsoleScreen({
  isAdmin,
  onUnlock,
  onLock,
  onClose,
  isProPreview = false,
  onToggleProPreview,
  onStageItem,
  onVisualsChange,
}: AdminConsoleScreenProps) {
  const { plants, seeds } = useGarden();
  const [passcodeInput, setPasscodeInput] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"catalog" | "swap" | "app">("catalog");

  const [itemName, setItemName] = useState("");
  const [showPlantSuggestions, setShowPlantSuggestions] = useState(false);
  const [itemKind, setItemKind] = useState<"Seed" | "Plant" | "Garden Item">("Seed");
  const [seedPostage, setSeedPostage] = useState(true);
  const [stagedItems, setStagedItems] = useState<AdminStagedItem[]>([]);
  const [visualSettings, setVisualSettings] =
    useState<AdminVisualSettings>(DEFAULT_ADMIN_VISUALS);
  const [savingVisualSettings, setSavingVisualSettings] = useState(false);
  const plantSearchSources = useMemo(() => {
    const sourcesByName = new Map<
      string,
      { id: string; name: string; category?: string; varieties: Set<string> }
    >();

    const addSource = (
      id: string,
      name: string,
      category?: string,
      variety?: string
    ) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      const key = trimmedName.toLowerCase();
      let source = sourcesByName.get(key);
      if (!source) {
        source = {
          id,
          name: trimmedName,
          category,
          varieties: new Set<string>(),
        };
        sourcesByName.set(key, source);
      } else if (!source.category && category) {
        source.category = category;
      }

      const trimmedVariety = variety?.trim();
      if (trimmedVariety && trimmedVariety.toLowerCase() !== "standard") {
        source.varieties.add(trimmedVariety);
      }
    };

    PLANT_LIBRARY.forEach((plant) =>
      addSource(plant.id, plant.name, plant.category)
    );
    plants.forEach((plant) =>
      addSource(plant.id, plant.name, plant.category, plant.variety)
    );
    seeds.forEach((seed) =>
      addSource(seed.id, seed.name, undefined, seed.variety)
    );

    return Array.from(sourcesByName.values(), (source) => ({
      ...source,
      varieties: Array.from(source.varieties),
    }));
  }, [plants, seeds]);
  const plantSuggestions = useMemo(
    () => getTypeaheadPlantOptions(itemName, plantSearchSources),
    [itemName, plantSearchSources]
  );

  useEffect(() => {
    if (!isAdmin) return;

    let active = true;
    loadAdminVisuals().then((settings) => {
      if (!active) return;
      setVisualSettings(settings);
      onVisualsChange?.(settings);
    });

    return () => {
      active = false;
    };
  }, [isAdmin, onVisualsChange]);

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
      <SafeAreaView style={styles.safeArea}>
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
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUnlockPress} activeOpacity={0.78}>
              <Text style={styles.primaryBtnText}>Verify Admin</Text>
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.78}>
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
  const activePalette = getActivePalette(visualSettings);
  const customAccentIsValid = isValidHexColor(visualSettings.customAccentHex);

  const persistVisualSettings = async (settings: AdminVisualSettings) => {
    const settingsToSave = {
      ...settings,
      customAccentHex: settings.customAccentHex.trim().toUpperCase(),
    };

    setSavingVisualSettings(true);
    try {
      await saveAdminVisuals(settingsToSave);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Could not save visual settings: ${message}`);
      return false;
    } finally {
      setSavingVisualSettings(false);
    }

    setVisualSettings(settingsToSave);
    onVisualsChange?.(settingsToSave);
    return true;
  };

  const handleSaveVisualSettings = async () => {
    if (!customAccentIsValid) {
      setStatusMessage("Enter a valid 6-digit accent hex code, such as #B85D3B.");
      return;
    }

    const saved = await persistVisualSettings(visualSettings);
    if (!saved) return;
    setStatusMessage("Visual settings saved.");
  };

  const handlePickImage = async (
    settingKey: "bannerImageUri" | "homeCardImageUri"
  ) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo library permission required",
          "Allow photo library access to choose an app image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (!uri) {
        setStatusMessage("The selected photo did not include an image URI.");
        return;
      }

      const nextSettings = { ...visualSettings, [settingKey]: uri };
      setVisualSettings(nextSettings);
      const saved = await persistVisualSettings(nextSettings);
      if (saved) {
        setStatusMessage(
          settingKey === "bannerImageUri"
            ? "Banner image selected and saved."
            : "Home card image selected and saved."
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Could not select an image: ${message}`);
    }
  };

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
    setShowPlantSuggestions(false);
    setStatusMessage(
      `Added "${trimmed}" (${itemKind}) — Postage: ${
        effectivePostageAllowed ? "Allowed (Seed)" : "Disabled"
      }`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>Admin Control Room</Text>
            <Text style={styles.subtitle}>Catalog, Swap policy & app controls</Text>
          </View>
          <TouchableOpacity style={styles.lockBtn} onPress={onLock} activeOpacity={0.78}>
            <Text style={styles.lockBtnText}>Lock Admin</Text>
          </TouchableOpacity>
        </View>

        <WarmBannerCard
          title="Garden Admin Tools"
          subtitle="Manage catalog entries, swap policy, and app controls."
          imageSource={
            visualSettings.bannerImageUri.trim()
              ? { uri: visualSettings.bannerImageUri.trim() }
              : require("../../assets/images/icon.png")
          }
          imageAlt="App icon"
          badgeText="Admin"
        />

        <View style={styles.tabWrapRow}>
          {(["catalog", "swap", "app"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.78}
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
            <View style={styles.searchBar}>
              <TextInput
                value={itemName}
                onChangeText={(value) => {
                  setItemName(value);
                  setShowPlantSuggestions(
                    itemKind === "Plant" && value.trim().length > 0
                  );
                }}
                onFocus={() => {
                  if (itemKind === "Plant" && itemName.trim()) {
                    setShowPlantSuggestions(true);
                  }
                }}
                placeholder="e.g. Black Krim Tomato or Dwarf Eureka Lemon"
                placeholderTextColor={WARM_THEME.textSecondary}
                style={styles.searchInput}
                accessibilityLabel="Search plants, varieties, or enter an item name"
              />
              {itemName.length > 0 && (
                <TouchableOpacity
                  style={styles.quickClearButton}
                  activeOpacity={0.78}
                  onPress={() => {
                    setItemName("");
                    setShowPlantSuggestions(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear item search"
                >
                  <Text style={styles.quickClearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {itemKind === "Plant" &&
              showPlantSuggestions &&
              itemName.trim().length > 0 && (
                <View style={styles.suggestionList}>
                  {plantSuggestions.length > 0 ? (
                    plantSuggestions.map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion.id}
                        style={styles.suggestionRow}
                        activeOpacity={0.78}
                        onPress={() => {
                          setItemName(
                            suggestion.varietyName
                              ? `${suggestion.varietyName} ${suggestion.plantName}`
                              : suggestion.plantName
                          );
                          setShowPlantSuggestions(false);
                        }}
                      >
                        <Text style={styles.suggestionLabel}>
                          {suggestion.label}
                        </Text>
                        {suggestion.subtitle && (
                          <View style={styles.suggestionMetadataRow}>
                            <View style={styles.suggestionMetadataPill}>
                              <Text style={styles.suggestionSubtitle}>
                                {suggestion.subtitle}
                              </Text>
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.suggestionEmptyCard}>
                      <View style={styles.suggestionEmptyCopy}>
                        <Text style={styles.suggestionEmptyTitle}>
                          No matching plants or varieties
                        </Text>
                        <Text style={styles.suggestionEmpty}>
                          You can still add the name as entered, or clear the search to start again.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.resetSearchButton}
                        activeOpacity={0.78}
                        onPress={() => {
                          setItemName("");
                          setShowPlantSuggestions(false);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Clear plant search"
                      >
                        <Text style={styles.resetSearchButtonText}>Clear search</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

            <View style={styles.wrapRow}>
              {(["Seed", "Plant", "Garden Item"] as const).map((kind) => {
                const selected = itemKind === kind;
                return (
                  <TouchableOpacity
                    key={kind}
                    style={[styles.pill, selected && styles.pillActive]}
                    activeOpacity={0.78}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${kind} filter`}
                    onPress={() => {
                      setItemKind(kind);
                      setShowPlantSuggestions(
                        kind === "Plant" && itemName.trim().length > 0
                      );
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
                activeOpacity={0.78}
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

            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddStagedItem} activeOpacity={0.78}>
              <Text style={styles.primaryBtnText}>Save Admin Entry</Text>
            </TouchableOpacity>

            {stagedItems.length > 0 && (
              <View style={styles.listBox}>
                {stagedItems.map((item) => (
                  <View key={item.id} style={styles.stagedItemRow}>
                    <View style={styles.stagedItemCopy}>
                      <Text style={styles.stagedItemName}>{item.name}</Text>
                    </View>
                    <View style={styles.stagedMetadataRow}>
                      <View style={styles.stagedMetadataPill}>
                        <Text style={styles.stagedMetadataText}>{item.kind}</Text>
                      </View>
                      <View style={styles.stagedMetadataPill}>
                        <Text style={styles.stagedMetadataText}>
                          {item.postageAllowed ? "Postage OK" : "Pickup / Swap only"}
                        </Text>
                      </View>
                    </View>
                  </View>
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
          <>
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
                  activeOpacity={0.78}
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

            <View style={styles.card}>
              <Text style={styles.cardTitle}>App Visual Settings</Text>
              <Text style={styles.helperText}>
                Choose a warm palette, set a custom accent, and provide optional banner or home card image URLs/URIs.
              </Text>

              <View style={styles.wrapRow}>
                {Object.values(APP_COLOR_PRESETS).map((preset) => {
                  const selected = visualSettings.presetId === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.visualPreset,
                        selected && styles.visualPresetSelected,
                      ]}
                      activeOpacity={0.78}
                      onPress={() =>
                        setVisualSettings((current) => ({
                          ...current,
                          presetId: preset.id,
                          customAccentHex: preset.accent,
                        }))
                      }
                    >
                      <View
                        style={[
                          styles.visualSwatch,
                          { backgroundColor: preset.accent },
                        ]}
                      />
                      <Text
                        style={[
                          styles.visualPresetText,
                          selected && styles.visualPresetTextSelected,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.visualLabelRow}>
                <Text style={styles.fieldLabel}>Custom Accent (#RRGGBB)</Text>
                <View
                  style={[
                    styles.accentPreview,
                    { backgroundColor: activePalette.accent },
                  ]}
                />
              </View>
              <TextInput
                value={visualSettings.customAccentHex}
                onChangeText={(value) =>
                  setVisualSettings((current) => ({
                    ...current,
                    customAccentHex: value,
                  }))
                }
                placeholder="#B85D3B"
                placeholderTextColor={WARM_THEME.textSecondary}
                autoCapitalize="characters"
                maxLength={7}
                style={styles.input}
              />
              {!customAccentIsValid && (
                <Text style={styles.validationText}>
                  Enter a # followed by exactly six hexadecimal digits.
                </Text>
              )}

              <Text style={styles.fieldLabel}>Top Banner Image URL or URI</Text>
              <TextInput
                value={visualSettings.bannerImageUri}
                onChangeText={(value) =>
                  setVisualSettings((current) => ({
                    ...current,
                    bannerImageUri: value,
                  }))
                }
                placeholder="https://... or file://..."
                placeholderTextColor={WARM_THEME.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
              />
              <View style={styles.wrapRow}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => void handlePickImage("bannerImageUri")}
                  activeOpacity={0.78}
                  disabled={savingVisualSettings}
                >
                  <Text style={styles.primaryBtnText}>Pick from Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.78}
                  onPress={() =>
                    setVisualSettings((current) => ({
                      ...current,
                      bannerImageUri: "",
                    }))
                  }
                  disabled={savingVisualSettings}
                >
                  <Text style={styles.secondaryBtnText}>Clear Banner Image</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Home Card Image URL or URI</Text>
              <TextInput
                value={visualSettings.homeCardImageUri}
                onChangeText={(value) =>
                  setVisualSettings((current) => ({
                    ...current,
                    homeCardImageUri: value,
                  }))
                }
                placeholder="https://... or file://..."
                placeholderTextColor={WARM_THEME.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
              />
              <View style={styles.wrapRow}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => void handlePickImage("homeCardImageUri")}
                  activeOpacity={0.78}
                  disabled={savingVisualSettings}
                >
                  <Text style={styles.primaryBtnText}>Pick from Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.78}
                  onPress={() =>
                    setVisualSettings((current) => ({
                      ...current,
                      homeCardImageUri: "",
                    }))
                  }
                  disabled={savingVisualSettings}
                >
                  <Text style={styles.secondaryBtnText}>Clear Home Card Image</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  savingVisualSettings && styles.disabledButton,
                ]}
                onPress={handleSaveVisualSettings}
                activeOpacity={0.78}
                disabled={savingVisualSettings}
              >
                <Text style={styles.primaryBtnText}>
                  {savingVisualSettings ? "Saving..." : "Save Visual Settings"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {statusMessage && <Text style={styles.statusText}>{statusMessage}</Text>}

        {onClose && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.78}>
            <Text style={styles.secondaryBtnText}>Close Admin View</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: WARM_THEME.textPrimary,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WARM_THEME.background,
  },
  lockedContainer: {
    margin: WARM_THEME.spacingScreen,
    padding: 16,
    gap: 12,
    borderRadius: WARM_THEME.radiusCard,
    backgroundColor: WARM_THEME.surface,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    ...cardShadow,
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
    padding: WARM_THEME.spacingScreen,
    paddingBottom: WARM_THEME.spacingScreen + 12,
    gap: WARM_THEME.spacingScreen,
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
    minWidth: 0,
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
    padding: 16,
    borderRadius: WARM_THEME.radiusCard,
    backgroundColor: WARM_THEME.surface,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 10,
    ...cardShadow,
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
  suggestionList: {
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    borderRadius: 14,
    backgroundColor: WARM_THEME.surface,
    overflow: "hidden",
  },
  suggestionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: WARM_THEME.border,
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: WARM_THEME.textPrimary,
  },
  suggestionSubtitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    color: WARM_THEME.accent,
  },
  suggestionMetadataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  suggestionMetadataPill: {
    maxWidth: "100%",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accentSoft,
  },
  suggestionEmptyCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  suggestionEmptyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  suggestionEmptyTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: WARM_THEME.textPrimary,
  },
  suggestionEmpty: {
    fontSize: 12,
    lineHeight: 17,
    color: WARM_THEME.textSecondary,
  },
  resetSearchButton: {
    minHeight: 44,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.accentWarm,
    backgroundColor: WARM_THEME.accentSoft,
  },
  resetSearchButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: WARM_THEME.accent,
  },
  fieldLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "700",
    color: WARM_THEME.textSecondary,
  },
  visualPreset: {
    flexGrow: 1,
    minWidth: 125,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: WARM_THEME.surfaceMuted,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  visualPresetSelected: {
    backgroundColor: WARM_THEME.accentSoft,
    borderColor: WARM_THEME.accent,
  },
  visualSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  visualPresetText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "700",
    color: WARM_THEME.textSecondary,
  },
  visualPresetTextSelected: {
    color: WARM_THEME.accent,
  },
  visualLabelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  accentPreview: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  validationText: {
    fontSize: 12,
    lineHeight: 17,
    color: WARM_THEME.danger,
  },
  disabledButton: {
    opacity: 0.6,
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
  searchBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    borderRadius: 14,
    backgroundColor: WARM_THEME.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: WARM_THEME.textPrimary,
  },
  quickClearButton: {
    minWidth: 60,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  quickClearButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: WARM_THEME.accent,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  pill: {
    minWidth: 84,
    minHeight: 44,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: WARM_THEME.accent,
    borderColor: WARM_THEME.accent,
  },
  pillText: {
    flex: 1,
    minWidth: 0,
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
    borderColor: WARM_THEME.accentWarm,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: WARM_THEME.accentWarm,
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
    backgroundColor: WARM_THEME.accent,
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
    gap: 8,
    paddingTop: 4,
  },
  stagedItemRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  stagedItemCopy: {
    flex: 1,
    minWidth: 0,
  },
  stagedItemName: {
    fontSize: 12,
    fontWeight: "700",
    color: WARM_THEME.textPrimary,
  },
  stagedMetadataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  stagedMetadataPill: {
    maxWidth: "100%",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  stagedMetadataText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: "700",
    color: WARM_THEME.textSecondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: WARM_THEME.accent,
  },
});
