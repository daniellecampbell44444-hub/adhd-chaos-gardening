import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Share } from 'react-native';
import { AdminConsoleScreen } from '../../components/AdminConsoleScreen';
import { WarmBannerCard } from '../../components/WarmBannerCard';
import { useGarden } from '../../context/GardenContext';
import { useAdminAccess } from '../../utils/adminAccess';
import { WARM_THEME } from '../../utils/warmTheme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WeatherData {
  currentTemp: number;
  humidity: number;
  code: number;
  todayMax: number;
  todayMin: number;
  todayRain: number;
  tomorrowMax: number;
  tomorrowMin: number;
  tomorrowRain: number;
  updatedAt: string;
}

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-33.765&longitude=150.870&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Australia%2FSydney&forecast_days=2';
const expectedAdminPasscode = process.env.EXPO_PUBLIC_ADMIN_DEV_PASSCODE;

function describeWeather(code: number) {
  if (code === 0) return { icon: '☀️', label: 'Clear skies' };
  if (code <= 3) return { icon: '⛅', label: 'Partly cloudy' };
  if (code <= 48) return { icon: '🌫️', label: 'Foggy' };
  if (code <= 67) return { icon: '🌧️', label: 'Rain' };
  if (code <= 82) return { icon: '🌦️', label: 'Showers' };
  if (code >= 95) return { icon: '⛈️', label: 'Storms' };
  return { icon: '🌤️', label: 'Mild' };
}

function getPreservationIdea(cropName: string, grams: number): string {
  const name = cropName.toLowerCase();
  const weightLabel = grams >= 1000 ? `${(grams / 1000).toFixed(2)}kg` : `${grams}g`;
  if (name.includes('tomato')) {
    return `${cropName} (${weightLabel}): Simmer into rich passata, BBQ sauce, or dehydrate slices into sundried tomatoes.`;
  }
  if (name.includes('chilli') || name.includes('pepper') || name.includes('capsicum')) {
    return `${cropName} (${weightLabel}): Dehydrate for chilli flakes/powder, blend into hot sauce, or pickle whole.`;
  }
  if (name.includes('lemon') || name.includes('orange') || name.includes('citrus')) {
    return `${cropName} (${weightLabel}): Juice & freeze in cubes, make curd, or candy the peels and save scraps for pectin.`;
  }
  if (name.includes('strawberry') || name.includes('blueberry') || name.includes('berry') || name.includes('fruit')) {
    return `${cropName} (${weightLabel}): Dehydrate fruit leather/slices, simmer into jam/compote, or freeze on trays.`;
  }
  if (name.includes('cucumber') || name.includes('onion') || name.includes('zucchini')) {
    return `${cropName} (${weightLabel}): Quick-pickle in spiced brine, grate & freeze for baking, or slice for dehydrating.`;
  }
  if (name.includes('potato') || name.includes('carrot') || name.includes('sweet potato')) {
    return `${cropName} (${weightLabel}): Dehydrate into slices or mash powder, roast & freeze, or store cool and dark.`;
  }
  return `${cropName} (${weightLabel}): Dehydrate, blanch & freeze, or turn surplus into sauces/powders before it spoils.`;
}


function getHarvestChipValueAud(chipLabel: string, list: any[] = []): number {
  if (!Array.isArray(list) || chipLabel === "All") {
    return Array.isArray(list)
      ? list.reduce((sum: any, h: any) => sum + (Number(h?.valueAud ?? h?.estimatedValue ?? h?.value ?? 0) || 0), 0)
      : 0;
  }
  return list
    .filter((h) => String(h?.crop || h?.spot || "").trim() === chipLabel)
    .reduce((sum: any, h: any) => sum + (Number(h?.valueAud ?? h?.estimatedValue ?? h?.value ?? 0) || 0), 0);
}



// Safe fallbacks for PLANT_LIBRARY, preservationBatches, and hasPeriodFilter in index.tsx
const PLANT_LIBRARY: any[] = [];
const preservationBatches: any[] = [];
const hasPeriodFilter: boolean = false;

// Safe fallback declarations for cross-screen harvest helper blocks in index.tsx
const targetList: any[] = [];
const searchFilteredHarvests: any[] = [];
const matchesHarvestPeriod = (_item: any, _period?: any): boolean => true;
const harvestFilterMode: string = "crop";
const resolveHarvestCategory = (_item: any): string => "Other";
const setHarvests: React.Dispatch<React.SetStateAction<any[]>> = () => {};
const selectedHarvestFilter: string = "All";
const harvestSearchQuery: string = "";
const setSelectedHarvestFilter: React.Dispatch<React.SetStateAction<string>> = () => {};
const setHarvestSearchQuery: React.Dispatch<React.SetStateAction<string>> = () => {};

export default function PulseScreen() {
  
        /* HARVEST_CHIP_SORT_TOGGLE */
        const sortHarvestFilterChips = (chips: string[]) => {
          const list = Array.isArray(chips) ? [...chips] : [];
          const hasAll = list.includes("All");
          const rest = list.filter(c => c !== "All");
          const mode = typeof harvestChipSortMode !== "undefined" ? harvestChipSortMode : "weight";
  
          rest.sort((a, b) => {
            if (mode === "name") {
              return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
            }
            if (mode === "value") {
              const valA = typeof getHarvestChipValueAud === "function" ? Number(getHarvestChipValueAud(a) || 0) : 0;
              const valB = typeof getHarvestChipValueAud === "function" ? Number(getHarvestChipValueAud(b) || 0) : 0;
              if (valB !== valA) return valB - valA;
              return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
            }
            const wtA = typeof getHarvestChipGrams === "function" ? Number(getHarvestChipGrams(a) || 0) : 0;
            const wtB = typeof getHarvestChipGrams === "function" ? Number(getHarvestChipGrams(b) || 0) : 0;
            if (wtB !== wtA) return wtB - wtA;
            return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
          });
  
          return hasAll ? ["All", ...rest] : rest;
        };
  
        const cycleHarvestChipSortMode = () => {
          setHarvestChipSortMode(prev => (prev === "weight" ? "value" : prev === "value" ? "name" : "weight"));
        };
  
  const [harvestChipSortMode, setHarvestChipSortMode] = useState<"weight" | "value" | "name">("weight");

  
        /* HARVEST_TOTAL_WEIGHT_VALUE_BAR */
        const getHarvestWeightAndValueSummary = () => {
          const list = typeof targetList !== "undefined" && Array.isArray(((globalThis as any).__targetList ?? []))
            ? ((globalThis as any).__targetList ?? [])
            : (harvests || []);
          const totalGrams = list.reduce((sum: number, h: any) => sum + (Number(h?.grams) || 0), 0);
          const totalValueAud = list.reduce((sum: number, h: any) => {
            const val = Number(h?.valueAud ?? h?.estimatedValue ?? h?.value ?? 0);
            return sum + (Number.isFinite(val) ? val : 0);
          }, 0);
          return {
            count: list.length,
            totalGrams,
            totalValueAud,
          };
        };
  
  
        /* HARVEST_RUNNER_UP_CROPS */
        const getTopYieldingCropsList = (limit = 3) => {
          const base = typeof searchFilteredHarvests !== "undefined" ? ((globalThis as any).__searchFilteredHarvests ?? []) : (harvests || []);
          const periodFiltered = typeof harvestPeriodFilter !== "undefined" && harvestPeriodFilter !== "All"
            ? base.filter((h: any) => {
                if (typeof matchesHarvestPeriod === "function") return ((globalThis as any).__matchesHarvestPeriod ?? (() => true))(h, harvestPeriodFilter);
                return true;
              })
            : base;
  
          const statsByCrop = new Map<string, { grams: number; count: number }>();
          for (const h of periodFiltered) {
            const cropName = String(h?.crop || "").trim();
            if (!cropName) continue;
            const prev = statsByCrop.get(cropName) || { grams: 0, count: 0 };
            statsByCrop.set(cropName, {
              grams: prev.grams + (Number(h?.grams) || 0),
              count: prev.count + 1,
            });
          }
  
          return Array.from(statsByCrop.entries())
            .filter(([, stat]) => stat.grams > 0)
            .sort((a, b) => b[1].grams - a[1].grams)
            .slice(0, limit)
            .map(([crop, stat]) => ({ crop, grams: stat.grams, count: stat.count }));
        };
  
  
        /* HARVEST_TOP_PRODUCER_BANNER */
        const getTopProducerStats = () => {
          const base = typeof searchFilteredHarvests !== "undefined" ? ((globalThis as any).__searchFilteredHarvests ?? []) : (harvests || []);
          const periodFiltered = typeof harvestPeriodFilter !== "undefined" && harvestPeriodFilter !== "All"
            ? base.filter((h: any) => {
                if (typeof matchesHarvestPeriod === "function") return ((globalThis as any).__matchesHarvestPeriod ?? (() => true))(h, harvestPeriodFilter);
                return true;
              })
            : base;
  
          const statsByCrop = new Map<string, { grams: number; count: number }>();
          for (const h of periodFiltered) {
            const cropName = String(h?.crop || "").trim();
            if (!cropName) continue;
            const prev = statsByCrop.get(cropName) || { grams: 0, count: 0 };
            statsByCrop.set(cropName, {
              grams: prev.grams + (Number(h?.grams) || 0),
              count: prev.count + 1,
            });
          }
  
          let bestCrop: string | null = null;
          let bestGrams = 0;
          let bestCount = 0;
          for (const [cropName, stat] of statsByCrop.entries()) {
            if (stat.grams > bestGrams) {
              bestGrams = stat.grams;
              bestCrop = cropName;
              bestCount = stat.count;
            }
          }
          return bestCrop && bestGrams > 0 ? { crop: bestCrop, grams: bestGrams, count: bestCount } : null;
        };
  
  
        /* HARVEST_TOP_CROP_CHIP */
        const getTopYieldingCropLabel = () => {
          const base = typeof searchFilteredHarvests !== "undefined" ? ((globalThis as any).__searchFilteredHarvests ?? []) : (harvests || []);
          const periodFiltered = typeof harvestPeriodFilter !== "undefined" && harvestPeriodFilter !== "All"
            ? base.filter((h: any) => {
                if (typeof matchesHarvestPeriod === "function") return ((globalThis as any).__matchesHarvestPeriod ?? (() => true))(h, harvestPeriodFilter);
                return true;
              })
            : base;
  
          const totalsByCrop = new Map<string, number>();
          for (const h of periodFiltered) {
            const cropName = String(h?.crop || "").trim();
            if (!cropName) continue;
            totalsByCrop.set(cropName, (totalsByCrop.get(cropName) || 0) + (Number(h?.grams) || 0));
          }
  
          let bestCrop: string | null = null;
          let bestGrams = 0;
          for (const [cropName, gramsSum] of totalsByCrop.entries()) {
            if (gramsSum > bestGrams) {
              bestGrams = gramsSum;
              bestCrop = cropName;
            }
          }
          return bestGrams > 0 ? bestCrop : null;
        };
  
  
        /* HARVEST_CROP_CHIP_GRAMS */
        const formatHarvestGrams = (totalGrams: number) => {
          const safe = Number(totalGrams) || 0;
          if (safe >= 1000) {
            const kg = safe / 1000;
            return `${Number.isInteger(kg) ? kg : kg.toFixed(1)}kg`;
          }
          return `${Math.round(safe)}g`;
        };
  
        const getHarvestChipGrams = (chipLabel: string) => {
          const base = typeof searchFilteredHarvests !== "undefined" ? ((globalThis as any).__searchFilteredHarvests ?? []) : (harvests || []);
          const periodFiltered = typeof harvestPeriodFilter !== "undefined" && harvestPeriodFilter !== "All"
            ? base.filter((h: any) => {
                if (typeof matchesHarvestPeriod === "function") return ((globalThis as any).__matchesHarvestPeriod ?? (() => true))(h, harvestPeriodFilter);
                return true;
              })
            : base;
  
          if (chipLabel === "All") {
            return periodFiltered.reduce((sum: number, h: any) => sum + (Number(h?.grams) || 0), 0);
          }
          if (typeof harvestFilterMode !== "undefined" && ((globalThis as any).__harvestFilterMode ?? "crop") === "spot") {
            return periodFiltered
              .filter((h: any) => (h?.spot || "").trim() === chipLabel)
              .reduce((sum: number, h: any) => sum + (Number(h?.grams) || 0), 0);
          }
          if (typeof harvestFilterMode !== "undefined" && ((globalThis as any).__harvestFilterMode ?? "crop") === "category") {
            return periodFiltered
              .filter((h: any) => {
                if (typeof resolveHarvestCategory === "function") return resolveHarvestCategory(h) === chipLabel;
                return false;
              })
              .reduce((sum: number, h: any) => sum + (Number(h?.grams) || 0), 0);
          }
          return periodFiltered
            .filter((h: any) => (h?.crop || "").trim() === chipLabel)
            .reduce((sum: number, h: any) => sum + (Number(h?.grams) || 0), 0);
        };
  
  
        /* HARVEST_DUPLICATE_LOG_BTN */
        const handleDuplicateHarvestLog = (entry: any) => {
          if (!entry) return;
          const todayIso = new Date().toLocaleDateString("en-CA");
          const cloned = {
            ...entry,
            id: `harvest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: todayIso,
          };
          if (typeof setHarvests === "function") {
            setHarvests((prev: any[]) => [cloned, ...(Array.isArray(prev) ? prev : [])]);
          }
        };
  
  const [harvestSortMode, setHarvestSortMode] = useState<"newest" | "heaviest">("newest");

  
      /* HARVEST_RESET_COUNT */
      const getActiveHarvestResetCount = () => {
        let n = 0;
        if (typeof selectedHarvestFilter !== "undefined" && selectedHarvestFilter !== "All") n += 1;
        if (typeof harvestPeriodFilter !== "undefined" && harvestPeriodFilter !== "All") n += 1;
        if (typeof harvestSearchQuery !== "undefined" && harvestSearchQuery.trim().length > 0) n += 1;
        if (typeof harvestChipSortMode !== "undefined" && harvestChipSortMode !== "weight") n += 1;
        if (typeof harvestSortMode !== "undefined" && harvestSortMode !== "newest") n += 1;
        return n;
      };

      const handleResetHarvestFilters = () => {
        if (typeof setSelectedHarvestFilter === "function") setSelectedHarvestFilter("All");
        if (typeof setHarvestPeriodFilter === "function") setHarvestPeriodFilter("All");
        if (typeof setHarvestSearchQuery === "function") setHarvestSearchQuery("");
      /* HARVEST_RESET_CHIP_SORT */
      if (typeof setHarvestChipSortMode === "function") setHarvestChipSortMode("weight");
      /* HARVEST_RESET_LOG_SORT */
      if (typeof setHarvestSortMode === "function") setHarvestSortMode("newest");
      };

  const [harvestPeriodFilter, setHarvestPeriodFilter] = useState<string>("All");

  const [copiedSummaryFeedback, setCopiedSummaryFeedback] = useState(false);
  const buildHarvestSummaryText = () => {
        const allList = harvests || [];
        if (allList.length === 0) return null;
        const hasFilter = typeof selectedHarvestFilter !== "undefined" && selectedHarvestFilter !== "All";
      const hasPeriodFilter = typeof harvestPeriodFilter !== "undefined" && harvestPeriodFilter !== "All";
        const hasSearch = typeof harvestSearchQuery !== "undefined" && harvestSearchQuery.trim().length > 0;
        const rawTargetList = (hasFilter || hasPeriodFilter || hasSearch)
          ? allList.filter(h => {
              if (hasSearch) {
                const q = harvestSearchQuery.trim().toLowerCase();
                const hay = `${h.crop || ""} ${(h as any).spot || ""} ${(h as any).note || ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
              }
              if (hasPeriodFilter && !((globalThis as any).__matchesHarvestPeriod ?? (() => true))(h, harvestPeriodFilter)) return false;
            if (!hasFilter) return true;
              if (typeof harvestFilterMode !== "undefined" && ((globalThis as any).__harvestFilterMode ?? "crop") === "spot") {
                return ((h as any).spot || "").trim() === selectedHarvestFilter;
              }
              if (typeof harvestFilterMode !== "undefined" && ((globalThis as any).__harvestFilterMode ?? "crop") === "category") {
                const cropLower = (h.crop || "").toLowerCase();
                const found = typeof PLANT_LIBRARY !== "undefined"
                  ? PLANT_LIBRARY.find(item => cropLower.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(cropLower))
                  : undefined;
                return (found?.category || "Other") === selectedHarvestFilter;
              }
              return (h.crop || "").trim() === selectedHarvestFilter;
            })
          : allList;
      const targetList = typeof harvestSortMode !== "undefined" && harvestSortMode === "heaviest" ? [...rawTargetList].sort((a, b) => (Number(b?.grams) || 0) - (Number(a?.grams) || 0)) : rawTargetList;
  
        const totalGrams = ((globalThis as any).__targetList ?? []).reduce((sum: any, h: any) => sum + (Number(h.grams) || 0), 0);
        const totalKg = (totalGrams / 1000).toFixed(2);
        const totalAud = ((globalThis as any).__targetList ?? []).reduce((sum: any, h: any) => sum + (Number(h.valueAud) || 0), 0).toFixed(2);
        const scopeLabel = hasFilter
          ? selectedHarvestFilter
          : hasSearch
            ? `Search: "${harvestSearchQuery.trim()}"`
            : "All Harvests";
  
        const batchList = typeof preservationBatches !== "undefined" && Array.isArray(preservationBatches) ? preservationBatches : [];
        const methodCounts = batchList.reduce((acc: any, b: any) => {
          const key = b.method || "Batch";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const methodSummary = Object.entries(methodCounts)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        const batchHeaderLine = batchList.length > 0
          ? `Preservation & Bulk Batches: ${batchList.length} (${methodSummary})`
          : "Preservation & Bulk Batches: 0";
  
        const lines = [
          `Garden Harvest Summary (${scopeLabel})`,
          `Total Weight: ${totalGrams}g (${totalKg} kg) | Est. Value: ${totalAud} AUD | Logs: ${((globalThis as any).__targetList ?? []).length}`,
          batchHeaderLine,
          "",
          ...targetList.slice(0, 15).map(h => {
            const spotPart = (h as any).spot ? ` [${(h as any).spot}]` : "";
            const notePart = (h as any).note ? ` — ${(h as any).note}` : "";
            return `• ${h.crop}: ${h.grams}g (${(Number(h.valueAud) || 0).toFixed(2)} AUD)${spotPart} (${h.date})${notePart}`;
          }),
        ];
        if (((globalThis as any).__targetList ?? []).length > 15) {
          lines.push(`...and ${((globalThis as any).__targetList ?? []).length - 15} more entries.`);
        }
        if (batchList.length > 0) {
          lines.push("", "Recent Preservation Batches:");
          for (const b of batchList.slice(0, 5)) {
            const scrapPart = b.scrapNote ? ` | Scrap: ${b.scrapNote}` : "";
            lines.push(`• [${b.method}] ${b.produce} — ${b.yieldLabel} (${b.date})${scrapPart}`);
          }
        }
        return { summaryText: lines.join("\n"), scopeLabel };
      };
  
      const handleCopyHarvestSummary = async () => {
        const built = buildHarvestSummaryText();
        if (!built) {
          Alert.alert("No harvests yet", "Log a harvest first to copy a summary.");
          return;
        }
        const { summaryText, scopeLabel } = built;
        let copied = false;
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            await navigator.clipboard.writeText(summaryText);
            copied = true;
          }
        } catch {}
        if (!copied) {
          try {
            const ExpoClipboard = require("expo-clipboard");
            if (ExpoClipboard && typeof ExpoClipboard.setStringAsync === "function") {
              await ExpoClipboard.setStringAsync(summaryText);
              copied = true;
            }
          } catch {}
        }
        if (copied) {
          setCopiedSummaryFeedback(true);
          setTimeout(() => setCopiedSummaryFeedback(false), 2200);
          Alert.alert("Copied ✓", `${scopeLabel} harvest & batch summary copied to clipboard.`);
        } else {
          await Share.share({ message: summaryText, title: `${scopeLabel} Summary` });
        }
      };

  const handleShareHarvestSummary = async () => {
        const allList = harvests || [];
        if (allList.length === 0) {
          Alert.alert("No harvests yet", "Log a harvest first to share a summary.");
          return;
        }
        const hasFilter = typeof selectedHarvestFilter !== "undefined" && selectedHarvestFilter !== "All";
        const hasSearch = typeof harvestSearchQuery !== "undefined" && harvestSearchQuery.trim().length > 0;
        const rawTargetList = (hasFilter || hasPeriodFilter || hasSearch)
          ? allList.filter(h => {
              if (hasSearch) {
                const q = harvestSearchQuery.trim().toLowerCase();
                const hay = `${h.crop || ""} ${(h as any).spot || ""} ${(h as any).note || ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
              }
              if (hasPeriodFilter && !((globalThis as any).__matchesHarvestPeriod ?? (() => true))(h, harvestPeriodFilter)) return false;
            if (!hasFilter) return true;
              if (typeof harvestFilterMode !== "undefined" && ((globalThis as any).__harvestFilterMode ?? "crop") === "spot") {
                return ((h as any).spot || "").trim() === selectedHarvestFilter;
              }
              if (typeof harvestFilterMode !== "undefined" && ((globalThis as any).__harvestFilterMode ?? "crop") === "category") {
                const cropLower = (h.crop || "").toLowerCase();
                const found = typeof PLANT_LIBRARY !== "undefined"
                  ? PLANT_LIBRARY.find(item => cropLower.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(cropLower))
                  : undefined;
                return (found?.category || "Other") === selectedHarvestFilter;
              }
              return (h.crop || "").trim() === selectedHarvestFilter;
            })
          : allList;
      const targetList = typeof harvestSortMode !== "undefined" && harvestSortMode === "heaviest" ? [...rawTargetList].sort((a, b) => (Number(b?.grams) || 0) - (Number(a?.grams) || 0)) : rawTargetList;
  
        const totalGrams = ((globalThis as any).__targetList ?? []).reduce((sum: any, h: any) => sum + (Number(h.grams) || 0), 0);
        const totalKg = (totalGrams / 1000).toFixed(2);
        const totalAud = ((globalThis as any).__targetList ?? []).reduce((sum: any, h: any) => sum + (Number(h.valueAud) || 0), 0).toFixed(2);
        const scopeLabel = hasFilter
          ? selectedHarvestFilter
          : hasSearch
            ? `Search: "${harvestSearchQuery.trim()}"`
            : "All Harvests";
  
        
      {/* PRESERVATION_BATCH_SUMMARY_INCLUDED */}
      const batchList = typeof preservationBatches !== "undefined" && Array.isArray(preservationBatches) ? preservationBatches : [];
      const methodCounts = batchList.reduce((acc: any, b: any) => {
        const key = b.method || "Batch";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const methodSummary = Object.entries(methodCounts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const batchHeaderLine = batchList.length > 0
        ? `Preservation & Bulk Batches: ${batchList.length} (${methodSummary})`
        : "Preservation & Bulk Batches: 0";

      const lines = [
          `Garden Harvest Summary (${scopeLabel})`,
          `Total Weight: ${totalGrams}g (${totalKg} kg) | Est. Value: ${totalAud} AUD | Logs: ${((globalThis as any).__targetList ?? []).length}`,
          "",
          ...targetList.slice(0, 15).map(h => {
            const spotPart = (h as any).spot ? ` [${(h as any).spot}]` : "";
            const notePart = (h as any).note ? ` — ${(h as any).note}` : "";
            return `• ${h.crop}: ${h.grams}g (${(Number(h.valueAud) || 0).toFixed(2)} AUD)${spotPart} (${h.date})${notePart}`;
          }),
        ];
        if (((globalThis as any).__targetList ?? []).length > 15) {
          lines.push(`...and ${((globalThis as any).__targetList ?? []).length - 15} more entries.`);
        }
        
      if (batchList.length > 0) {
        lines.push("", "Recent Preservation Batches:");
        for (const b of batchList.slice(0, 5)) {
          const scrapPart = b.scrapNote ? ` | Scrap: ${b.scrapNote}` : "";
          lines.push(`• [${b.method}] ${b.produce} — ${b.yieldLabel} (${b.date})${scrapPart}`);
        }
      }

      const summaryText = lines.join("\n");
        try {
          await Share.share({ message: summaryText, title: `${scopeLabel} Summary` });
        } catch {
          Alert.alert("Harvest Summary", summaryText);
        }
      };

  const handleConfirmClearAllHarvests = () => {
        if (!clearAllHarvests || !(harvests || []).length) return;
        Alert.alert(
          "Clear all harvests?",
          `This will remove all ${(harvests || []).length} logged harvest entries.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Clear All", style: "destructive", onPress: () => clearAllHarvests() },
          ]
        );
      };

  const {
    plants, harvests, expenses, reminders, seeds, user, syncStatus,
    signUp, signIn, signOut, waterAll, feedAll, addHarvest, deleteHarvest, clearAllHarvests, addExpense,
    toggleReminder, catchUpReminders, loadSampleGarden,
  } = useGarden();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [modal, setModal] = useState<'none' | 'harvest' | 'expense' | 'auth'>('none');
  const [crop, setCrop] = useState('');
const HARVEST_PLANT_CHIPS = Array.from(new Set(plants.map(p => (p.variety ? `${p.variety} ${p.name}` : p.name).trim()))).filter(Boolean).slice(0, 12);
  const [grams, setGrams] = useState('');
const QUICK_HARVEST_WEIGHTS = [{"label":"100g","grams":100},{"label":"250g","grams":250},{"label":"500g","grams":500},{"label":"1kg","grams":1000},{"label":"2kg","grams":2000}];
  const [expItem, setExpItem] = useState('');
  const [expCost, setExpCost] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const { isAdmin, unlockAdmin, lockAdmin } = useAdminAccess(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [showAdminUnlockModal, setShowAdminUnlockModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const fetchWeather = useCallback(async () => {
    setLoadingWeather(true);
    try {
      const res = await fetch(WEATHER_URL);
      const data = await res.json();
      setWeather({
        currentTemp: Math.round(data.current.temperature_2m),
        humidity: Math.round(data.current.relative_humidity_2m),
        code: data.current.weather_code,
        todayMax: Math.round(data.daily.temperature_2m_max[0]),
        todayMin: Math.round(data.daily.temperature_2m_min[0]),
        todayRain: data.daily.precipitation_probability_max[0] ?? 0,
        tomorrowMax: Math.round(data.daily.temperature_2m_max[1]),
        tomorrowMin: Math.round(data.daily.temperature_2m_min[1]),
        tomorrowRain: data.daily.precipitation_probability_max[1] ?? 0,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {
      // Keep previous weather on error
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const handleAuth = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Check details', 'Enter a valid email and a password of at least 6 characters.');
      return;
    }
    setAuthBusy(true);
    const err = authMode === 'signup' ? await signUp(email, password) : await signIn(email, password);
    setAuthBusy(false);
    if (err) {
      Alert.alert('Account Error', err);
    } else {
      setEmail('');
      setPassword('');
      setModal('none');
      Alert.alert(
        authMode === 'signup' ? 'Account Created!' : 'Welcome Back!',
        'Your garden will now auto-sync to the cloud.'
      );
    }
  };

  const verifyAdminPasscode = (passcode: string) => {
    if (!expectedAdminPasscode) return false;
    return unlockAdmin(passcode, expectedAdminPasscode);
  };

  const handleAdminUnlock = () => {
    if (!expectedAdminPasscode) {
      setAdminMessage('Admin access is not configured in this build.');
      return;
    }
    if (!verifyAdminPasscode(adminPasscode)) {
      setAdminMessage('Admin access denied.');
      return;
    }
    setAdminPasscode('');
    setAdminMessage(null);
    setShowAdminUnlockModal(false);
    setShowAdminModal(true);
  };

  const handleAdminEntryPress = () => {
    if (isAdmin) {
      setShowAdminModal(true);
      return;
    }
    setAdminMessage(null);
    setShowAdminUnlockModal(true);
  };

  const handleCloseAdminUnlock = () => {
    setShowAdminUnlockModal(false);
    setAdminPasscode('');
    setAdminMessage(null);
  };

  const handleAdminLock = () => {
    lockAdmin();
    setShowAdminModal(false);
  };

  const totalPlants = plants.reduce((s, p) => s + p.quantity, 0);
  const uniqueVarieties = new Set(plants.map(p => `${p.name}-${p.variety}`)).size;
  const totalGrams = harvests.reduce((s, h) => s + h.grams, 0);
  const totalEarned = harvests.reduce((s, h) => s + h.valueAud, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.costAud, 0);
  const netSaved = totalEarned - totalSpent;
  const readyToPick = plants.filter(p => p.stage === 'Fruiting');
  const openReminders = reminders.filter(r => !r.done);
  const peakMax = weather ? Math.max(weather.todayMax, weather.tomorrowMax) : 0;
  const lowMin = weather ? Math.min(weather.todayMin, weather.tomorrowMin) : 99;
  const highRain = weather ? Math.max(weather.todayRain, weather.tomorrowRain) : 0;
  const wInfo = weather ? describeWeather(weather.code) : null;
  const syncLabel = !user ? 'Cloud Backup' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Error' : 'Synced ✓';

  // Surplus harvests (>= 400g) that can be preserved or turned into kitchen staples
  const surplusHarvests = harvests
    .filter(h => h.grams >= 400)
    .slice(0, 3)
    .map(h => ({
      id: h.id,
      text: getPreservationIdea(h.crop, h.grams),
    }));

  // Low-seed alerts for stocked seeds running low (excluding pure wishlist items)
  const lowSeedItems = seeds.filter(
    s => !s.wishlist && (s.packets <= 1 || s.approxSeeds <= 15)
  );

  // Build up to 3 high-impact focus items without overwhelming the screen
  const focusItems: { id: string; label: string; meta: string; onPress: () => void }[] = [];
  if (peakMax >= 35) {
    focusItems.push({
      id: 'heat-soak',
      label: `Deep-soak pots & check shade (${peakMax}°C forecast)`,
      meta: 'Heat priority',
      onPress: () => {
        waterAll();
        Alert.alert('Soaked!', 'All plants marked watered ahead of the heat.');
      },
    });
  }
  if (readyToPick.length > 0) {
    const firstCrop = readyToPick[0];
    focusItems.push({
      id: 'pick-ripe',
      label: `Pick ripe ${firstCrop.variety} ${firstCrop.name} (${readyToPick.length} fruiting)`,
      meta: 'Quick win',
      onPress: () => {
        setCrop(`${firstCrop.variety} ${firstCrop.name}`);
        setModal('harvest');
      },
    });
  }
  for (const rem of openReminders) {
    if (focusItems.length >= 3) break;
    focusItems.push({
      id: rem.id,
      label: rem.title,
      meta: rem.due,
      onPress: () => toggleReminder(rem.id),
    });
  }
  if (focusItems.length < 3 && plants.length > 0 && !focusItems.some(i => i.id === 'heat-soak')) {
    focusItems.push({
      id: 'quick-water',
      label: 'Quick 2-minute pot & bed check-in',
      meta: 'Low-pressure',
      onPress: () => {
        waterAll();
        Alert.alert('Watered!', 'All plants logged as watered today.');
      },
    });
  }
  const topThree = focusItems.slice(0, 3);

  const saveHarvest = () => {
    if (!crop.trim() || !Number(grams)) return;
    addHarvest(crop.trim(), Number(grams));
    setCrop('');
    setGrams('');
    setModal('none');
  };

  const saveExpense = () => {
    if (!expItem.trim() || !Number(expCost)) return;
    addExpense(expItem.trim(), 'Garden', Number(expCost));
    setExpItem('');
    setExpCost('');
    setModal('none');
  };

  const handleCatchUpReset = () => {
    if (openReminders.length === 0) {
      Alert.alert('All caught up!', 'No overdue reminders waiting—zero guilt.');
      return;
    }
    catchUpReminders();
    Alert.alert('Fresh slate!', `${openReminders.length} open task(s) rolled smoothly into today with zero guilt.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, minWidth: 170 }}>
            <Text style={styles.heroTag}>WESTERN SYDNEY • LIVE</Text>
            <Text style={styles.heroTitle}>ADHD Chaos Gardening</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <TouchableOpacity onPress={() => setModal('auth')} style={styles.cloudBtn}>
              <Ionicons name={user ? 'cloud-done' : 'cloud-outline'} size={16} color={WARM_THEME.accent} />
              <Text style={styles.cloudTxt}>{syncLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={fetchWeather} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={16} color={WARM_THEME.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {loadingWeather && !weather ? (
          <View style={styles.weatherLoading}>
            <ActivityIndicator color={WARM_THEME.accentWarm} size="small" />
            <Text style={styles.heroSub}>Checking Western Sydney forecast...</Text>
          </View>
        ) : weather && wInfo ? (
          <View style={styles.weatherBox}>
            <View style={styles.weatherMain}>
              <Text style={styles.tempNow}>{wInfo.icon} {weather.currentTemp}°C</Text>
              <View>
                <Text style={styles.weatherLabel}>{wInfo.label} • {weather.humidity}% humidity</Text>
                <Text style={styles.weatherSub}>Today: {weather.todayMin}°–{weather.todayMax}°C • 💧 {weather.todayRain}% rain</Text>
                <Text style={styles.weatherSub}>Tomorrow: {weather.tomorrowMin}°–{weather.tomorrowMax}°C • 💧 {weather.tomorrowRain}% rain</Text>
              </View>
            </View>
            <Text style={styles.updatedTxt}>Updated {weather.updatedAt}</Text>
          </View>
        ) : (
          <Text style={styles.heroSub}>Offline mode — tap refresh to load live weather.</Text>
        )}
      </View>

      <WarmBannerCard
        title="A calmer garden day"
        subtitle="Your plants, harvests, and small wins—all in one place."
        imageSource={require('../../../assets/images/icon.png')}
        imageAlt="App icon"
        badgeText="Garden"
      />

      <View style={styles.focusCard}>
        <View style={styles.focusHeader}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Text style={styles.focusTag}>NO OVERWHELM • MAX 3</Text>
            <Text style={styles.focusTitle}>🎯 Top-3 Today</Text>
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={handleCatchUpReset}>
            <Ionicons name="sparkles-outline" size={14} color={WARM_THEME.accent} />
            <Text style={styles.resetBtnText}>Catch-Up Reset</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.focusHint}>
          Tap an item to mark it done. Life got busy? Hit Catch-Up Reset—missed tasks roll forward with zero guilt.
        </Text>

        {topThree.length === 0 ? (
          <Text style={styles.emptyFocus}>Load your starter garden or add a plant to get gentle daily focus picks.</Text>
        ) : (
          topThree.map((item, idx) => (
            <TouchableOpacity key={item.id} style={styles.focusRow} onPress={item.onPress}>
              <View style={styles.focusNum}>
                <Text style={styles.focusNumText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.focusItemText}>{item.label}</Text>
                <Text style={styles.focusMeta}>{item.meta}</Text>
              </View>
              <Ionicons name="checkmark-circle-outline" size={22} color={WARM_THEME.accent} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {surplusHarvests.length > 0 && (
        <View style={styles.pantryCard}>
          <Text style={styles.pantryTitle}>🫙 Surplus Preservation Ideas</Text>
          {surplusHarvests.map(tip => (
            <Text key={tip.id} style={styles.pantryLine}>• {tip.text}</Text>
          ))}
        </View>
      )}

      {lowSeedItems.length > 0 && (
        <View style={styles.seedAlertCard}>
          <Text style={styles.seedAlertTitle}>🌱 Low-Seed Alerts ({lowSeedItems.length})</Text>
          {lowSeedItems.slice(0, 4).map(s => (
            <Text key={s.id} style={styles.seedAlertLine}>
              • {s.variety} {s.name}: {s.packets} pkt (~{s.approxSeeds} seeds left)
            </Text>
          ))}
        </View>
      )}

      {weather && peakMax >= 38 && (
        <View style={[styles.alertCard, styles.alertHeat]}>
          <Text style={styles.alertTitle}>🔥 HEATWAVE ALERT ({peakMax}°C forecast)</Text>
          <Text style={styles.alertBody}>Put up 30% shade cloth, deep-soak pots at dawn, and pause granular fertiliser until temps drop below 35°C.</Text>
        </View>
      )}
      {weather && peakMax >= 35 && peakMax < 38 && (
        <View style={[styles.alertCard, styles.alertWarm]}>
          <Text style={styles.alertTitle}>☀️ HOT DAY CARE ({peakMax}°C forecast)</Text>
          <Text style={styles.alertBody}>Water pots early morning and skip granular fertilisers today to avoid root burn.</Text>
        </View>
      )}
      {weather && lowMin <= 4 && (
        <View style={[styles.alertCard, styles.alertFrost]}>
          <Text style={styles.alertTitle}>❄️ FROST WATCH ({lowMin}°C overnight)</Text>
          <Text style={styles.alertBody}>Cover chillies, capsicums, basil, and young citrus tonight or move pots under shelter.</Text>
        </View>
      )}
      {weather && highRain >= 70 && (
        <View style={[styles.alertCard, styles.alertRain]}>
          <Text style={styles.alertTitle}>🌧️ RAIN INCOMING ({highRain}% chance)</Text>
          <Text style={styles.alertBody}>You can likely skip watering open raised beds—check pot saucers so roots don’t sit in water.</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { waterAll(); Alert.alert('Watered!', 'All plants logged as watered today.'); }}>
          <Ionicons name="water" size={20} color={WARM_THEME.accentWarm} />
          <Text style={styles.actionLabel}>Water All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { feedAll(); Alert.alert('Fed!', 'All active plants logged as fed today.'); }}>
          <Ionicons name="leaf" size={20} color={WARM_THEME.accent} />
          <Text style={styles.actionLabel}>Bulk Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('harvest')}>
          <Ionicons name="basket" size={20} color={WARM_THEME.accentWarm} />
          <Text style={styles.actionLabel}>Log Yield</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('expense')}>
          <Ionicons name="cash" size={20} color={WARM_THEME.accent} />
          <Text style={styles.actionLabel}>Expense</Text>
        </TouchableOpacity>
      </View>

      {readyToPick.length > 0 && (
        <View style={styles.harvestBanner}>
          <Text style={styles.bannerTitle}>READY TO HARVEST ({readyToPick.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {readyToPick.map(p => (
              <TouchableOpacity key={p.id} style={styles.pickChip} onPress={() => { setCrop(`${p.variety} ${p.name}`); setModal('harvest'); }}>
                <Text style={styles.pickChipText}>{p.variety} {p.name} → Pick</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.grid}>
        <View style={styles.card}><Text style={styles.statNum}>{totalPlants}</Text><Text style={styles.statLabel}>Active Plants</Text></View>
        <View style={styles.card}><Text style={styles.statNum}>{uniqueVarieties}</Text><Text style={styles.statLabel}>Varieties</Text></View>
        <View style={styles.card}><Text style={styles.statNum}>{totalGrams >= 1000 ? `${(totalGrams / 1000).toFixed(2)}kg` : `${totalGrams}g`}</Text><Text style={styles.statLabel}>Total Harvest</Text></View>
        <View style={styles.card}>
          <Text style={[styles.statNum, { color: netSaved >= 0 ? WARM_THEME.accentWarm : WARM_THEME.danger }]}>
            {netSaved >= 0 ? `$${netSaved.toFixed(2)}` : `-$${Math.abs(netSaved).toFixed(2)}`}
          </Text>
          <Text style={styles.statLabel}>Net Saved (AUD)</Text>
        </View>
      </View>

      {plants.length === 0 && (
        <TouchableOpacity style={styles.starterBtn} onPress={loadSampleGarden}>
          <Ionicons name="sparkles" size={18} color={WARM_THEME.accentText} />
          <Text style={styles.starterText}>Load Western Sydney Starter Garden</Text>
        </TouchableOpacity>
      )}

      {isAdmin ? (
        <TouchableOpacity
          onPress={handleAdminEntryPress}
          style={{ alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Open Admin console"
        >
          <Text style={{ color: WARM_THEME.textSecondary, fontSize: 11, fontWeight: '600' }}>Open Admin</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handleAdminEntryPress}
          style={{ alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Unlock Admin console"
        >
          <Text style={{ color: WARM_THEME.textSecondary, fontSize: 11, fontWeight: '600' }}>Admin</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modal !== 'none'} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            {modal === 'auth' ? (
              user ? (
                <>
                  <Text style={styles.modalTitle}>☁️ Cloud Sync Active</Text>
                  <Text style={styles.alertBody}>Signed in as {user.email}</Text>
                  <Text style={styles.alertBody}>Status: {syncLabel}</Text>
                  <View style={styles.modalRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal('none')}><Text>Close</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: WARM_THEME.danger }]} onPress={async () => { await signOut(); setModal('none'); }}>
                      <Text style={styles.saveText}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>{authMode === 'signup' ? 'Create Free Account' : 'Sign In to Cloud Sync'}</Text>
                  <Text style={styles.alertBody}>Back up your plants, seeds, and harvests safely across devices.</Text>
                  <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
                  <TextInput placeholder="Password (6+ chars)" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
                  <TouchableOpacity onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}>
                    <Text style={styles.switchAuth}>{authMode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}</Text>
                  </TouchableOpacity>
                  <View style={styles.modalRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal('none')}><Text>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleAuth} disabled={authBusy}>
                      <Text style={styles.saveText}>{authBusy ? 'Please wait...' : authMode === 'signup' ? 'Sign Up' : 'Sign In'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )
            ) : modal === 'harvest' ? (
              <>
                <Text style={styles.modalTitle}>Log Harvest Yield</Text>
                <TextInput placeholder="Crop name (e.g. Tommy Toe Tomato)" value={crop} onChangeText={setCrop} style={styles.input} />
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, marginBottom: 4 }}>{HARVEST_PLANT_CHIPS.map(label => (<TouchableOpacity key={label} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6, backgroundColor: crop === label ? WARM_THEME.accent : WARM_THEME.surfaceMuted, borderWidth: 1, borderColor: crop === label ? WARM_THEME.accent : WARM_THEME.border }} onPress={() => setCrop(label)}><Text style={{ fontSize: 12, fontWeight: "800", color: crop === label ? WARM_THEME.accentText : WARM_THEME.textPrimary }}>{label}</Text></TouchableOpacity>))}</ScrollView>
                <TextInput placeholder="Weight in grams (e.g. 500)" value={grams} onChangeText={setGrams} keyboardType="numeric" style={styles.input} />
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 4 }}>{QUICK_HARVEST_WEIGHTS.map(w => (<TouchableOpacity key={w.label} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: grams === String(w.grams) ? WARM_THEME.accent : WARM_THEME.surfaceMuted, borderWidth: 1, borderColor: grams === String(w.grams) ? WARM_THEME.accent : WARM_THEME.border }} onPress={() => setGrams(String(w.grams))}><Text style={{ fontSize: 12, fontWeight: "800", color: grams === String(w.grams) ? WARM_THEME.accentText : WARM_THEME.textPrimary }}>{w.label}</Text></TouchableOpacity>))}</View>
                <View style={styles.modalRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal('none')}><Text>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveHarvest}><Text style={styles.saveText}>Save Harvest</Text></TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Log Garden Expense</Text>
                <TextInput placeholder="Item (e.g. Mulch, Potting Mix)" value={expItem} onChangeText={setExpItem} style={styles.input} />
                <TextInput placeholder="Cost in $ AUD (e.g. 15.50)" value={expCost} onChangeText={setExpCost} keyboardType="numeric" style={styles.input} />
                <View style={styles.modalRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal('none')}><Text>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveExpense}><Text style={styles.saveText}>Save Expense</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAdminUnlockModal && !isAdmin}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAdminUnlock}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Admin Access</Text>
            <TextInput
              value={adminPasscode}
              onChangeText={setAdminPasscode}
              onSubmitEditing={handleAdminUnlock}
              placeholder="Enter dev/admin code"
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="done"
              style={styles.input}
            />
            {adminMessage && <Text style={styles.alertBody}>{adminMessage}</Text>}
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCloseAdminUnlock}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdminUnlock}>
                <Text style={styles.saveText}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isAdmin && showAdminModal && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={() => setShowAdminModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: WARM_THEME.background }}>
            <AdminConsoleScreen
              isAdmin={isAdmin}
              onUnlock={verifyAdminPasscode}
              onLock={handleAdminLock}
              onClose={() => setShowAdminModal(false)}
            />
          </View>
        </Modal>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: WARM_THEME.background },
  container: { flex: 1, backgroundColor: WARM_THEME.background },
  content: {
    padding: WARM_THEME.spacingScreen,
    gap: WARM_THEME.spacingScreen,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: WARM_THEME.surface,
    borderRadius: WARM_THEME.radiusCard,
    padding: 18,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 12,
  },
  heroTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  heroTag: { color: WARM_THEME.accentWarm, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: WARM_THEME.textPrimary, fontSize: 21, fontWeight: '800', marginTop: 3 },
  heroSub: { color: WARM_THEME.textSecondary, fontSize: 13, marginTop: 8 },
  cloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: WARM_THEME.accentSoft,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  cloudTxt: { color: WARM_THEME.textPrimary, fontSize: 11, fontWeight: '700' },
  refreshBtn: {
    backgroundColor: WARM_THEME.surfaceMuted,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    padding: 7,
    borderRadius: 10,
  },
  weatherLoading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  weatherBox: {
    marginTop: 12,
    backgroundColor: WARM_THEME.surfaceMuted,
    borderColor: WARM_THEME.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  weatherMain: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  tempNow: { color: WARM_THEME.textPrimary, fontSize: 28, fontWeight: '800' },
  weatherLabel: { color: WARM_THEME.accentWarm, fontSize: 13, fontWeight: '700' },
  weatherSub: { color: WARM_THEME.textSecondary, fontSize: 12, marginTop: 2 },
  updatedTxt: { color: WARM_THEME.textSecondary, fontSize: 10, marginTop: 6, textAlign: 'right' },
  focusCard: {
    backgroundColor: WARM_THEME.surface,
    borderRadius: WARM_THEME.radiusCard,
    padding: 16,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 10,
  },
  focusHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  focusTag: { fontSize: 10, fontWeight: '800', color: WARM_THEME.accent, letterSpacing: 0.8 },
  focusTitle: { fontSize: 18, fontWeight: '800', color: WARM_THEME.textPrimary, marginTop: 2 },
  resetBtn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    backgroundColor: WARM_THEME.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  resetBtnText: { fontSize: 12, fontWeight: '700', color: WARM_THEME.accent },
  focusHint: { fontSize: 12, color: WARM_THEME.textSecondary, lineHeight: 17 },
  emptyFocus: { fontSize: 13, color: WARM_THEME.textSecondary, fontStyle: 'italic' },
  focusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    backgroundColor: WARM_THEME.surfaceMuted,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  focusNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: WARM_THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusNumText: { color: WARM_THEME.accentText, fontSize: 12, fontWeight: '800' },
  focusItemText: { fontSize: 13, fontWeight: '700', color: WARM_THEME.textPrimary },
  focusMeta: { fontSize: 11, color: WARM_THEME.textSecondary, marginTop: 2 },
  pantryCard: {
    backgroundColor: WARM_THEME.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 6,
  },
  pantryTitle: { fontSize: 13, fontWeight: '800', color: WARM_THEME.accentWarm },
  pantryLine: { fontSize: 12, color: WARM_THEME.textPrimary, lineHeight: 17 },
  seedAlertCard: {
    backgroundColor: WARM_THEME.accentSoft,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: WARM_THEME.accentWarm,
    gap: 5,
  },
  seedAlertTitle: { fontSize: 13, fontWeight: '800', color: WARM_THEME.accentWarm },
  seedAlertLine: { fontSize: 12, color: WARM_THEME.textPrimary, lineHeight: 17 },
  alertCard: {
    backgroundColor: WARM_THEME.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  alertHeat: { backgroundColor: WARM_THEME.accentSoft, borderColor: WARM_THEME.accentWarm },
  alertWarm: { backgroundColor: WARM_THEME.surfaceMuted, borderColor: WARM_THEME.accentWarm },
  alertFrost: { backgroundColor: WARM_THEME.surfaceMuted, borderColor: WARM_THEME.border },
  alertRain: { backgroundColor: WARM_THEME.surfaceMuted, borderColor: WARM_THEME.border },
  alertTitle: { fontSize: 13, fontWeight: '800', color: WARM_THEME.textPrimary },
  alertBody: { fontSize: 12, color: WARM_THEME.textSecondary, marginTop: 4, lineHeight: 17 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 128,
    backgroundColor: WARM_THEME.surface,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 4,
  },
  actionLabel: { fontSize: 11, fontWeight: '700', color: WARM_THEME.textPrimary },
  harvestBanner: {
    backgroundColor: WARM_THEME.accentSoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: WARM_THEME.accentWarm,
  },
  bannerTitle: { fontSize: 12, fontWeight: '800', color: WARM_THEME.accentWarm },
  pickChip: {
    backgroundColor: WARM_THEME.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  pickChipText: { fontSize: 13, fontWeight: '700', color: WARM_THEME.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 130,
    backgroundColor: WARM_THEME.surface,
    borderRadius: WARM_THEME.radiusCard,
    padding: 16,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  statNum: { fontSize: 24, fontWeight: '800', color: WARM_THEME.accent },
  statLabel: { fontSize: 13, color: WARM_THEME.textSecondary, marginTop: 4 },
  starterBtn: {
    backgroundColor: WARM_THEME.accent,
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  starterText: { color: WARM_THEME.accentText, fontWeight: '800', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(38,30,26,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: WARM_THEME.surface,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    borderRadius: WARM_THEME.radiusCard,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: WARM_THEME.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: WARM_THEME.textPrimary,
    backgroundColor: WARM_THEME.background,
  },
  switchAuth: { color: WARM_THEME.accent, fontWeight: '700', fontSize: 13, textAlign: 'center', marginTop: 2 },
  modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: WARM_THEME.surfaceMuted,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  saveBtn: { backgroundColor: WARM_THEME.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  saveText: { color: WARM_THEME.accentText, fontWeight: '700' },
});