import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Share } from 'react-native';
import { AdminConsoleScreen } from '../../components/AdminConsoleScreen';
import { SubscriptionScreen } from '../../components/SubscriptionScreen';
import { WarmBannerCard } from '../../components/WarmBannerCard';
import {
  useGarden,
  type BatchCareAction,
  type GardenLogCategory,
  type KitchenLogOutcome,
} from '../../context/GardenContext';
import { useAdminAccess } from '../../utils/adminAccess';
import { WARM_THEME } from '../../utils/warmTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProEntitlement } from '../../hooks/useProEntitlement';

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
const KITCHEN_OUTCOMES: KitchenLogOutcome[] = [
  'Fresh',
  'Dehydrated',
  'Pickled',
  'Canned',
  'Batch',
];
const GARDEN_LOG_CATEGORIES: GardenLogCategory[] = [
  'Watering',
  'Feeding',
  'Pest/Issue',
  'Pruning/Repotting',
  'Seed/Sowing',
];

function describeWeather(code: number) {
  if (code === 0) return { icon: '☀️', label: 'Clear skies' };
  if (code <= 3) return { icon: '⛅', label: 'Partly cloudy' };
  if (code <= 48) return { icon: '🌫️', label: 'Foggy' };
  if (code <= 67) return { icon: '🌧️', label: 'Rain' };
  if (code <= 82) return { icon: '🌦️', label: 'Showers' };
  if (code >= 95) return { icon: '⛈️', label: 'Storms' };
  return { icon: '🌤️', label: 'Mild' };
}

function formatLocalLogTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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
    toggleReminder, catchUpReminders, loadSampleGarden, batchCareLogs, logBatchCare, clearBatchCareLogs,
    harvestKitchenLogs, addHarvestKitchenLog, deleteHarvestKitchenLog, clearHarvestKitchenLogs,
    unifiedGardenLogs, addUnifiedGardenLog, deleteUnifiedGardenLog, clearUnifiedGardenLogs,
  } = useGarden();

  const {
    isPro,
    isLoading: isProLoading,
    isAvailable: isProBillingAvailable,
    error: proEntitlementError,
    refreshEntitlement,
  } = useProEntitlement();
  const hasKitchenLogAccess = isPro && !isProLoading;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [modal, setModal] = useState<'none' | 'harvest' | 'expense' | 'auth'>('none');
  const [showSubscription, setShowSubscription] = useState(false);
  const todayFocusKey = new Date().toLocaleDateString('en-CA');
  const [focusCompletion, setFocusCompletion] = useState<{
    day: string;
    taskIds: string[];
  }>({ day: todayFocusKey, taskIds: [] });
  const [focusRotation, setFocusRotation] = useState(0);
  const [selectedBatchZone, setSelectedBatchZone] = useState('');
  const [batchCareFeedback, setBatchCareFeedback] = useState('');
  const [kitchenItem, setKitchenItem] = useState('');
  const [kitchenQuantity, setKitchenQuantity] = useState('');
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [kitchenOutcome, setKitchenOutcome] = useState<KitchenLogOutcome>('Fresh');
  const [gardenLogCategory, setGardenLogCategory] = useState<GardenLogCategory>('Watering');
  const [gardenLogContext, setGardenLogContext] = useState('');
  const [gardenLogNote, setGardenLogNote] = useState('');
  const [gardenLogFilter, setGardenLogFilter] = useState<'All' | GardenLogCategory>('All');
  const [gardenLogSearch, setGardenLogSearch] = useState('');
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
  const batchZones = Array.from(
    new Map(
      plants
        .map(plant => plant.site.trim())
        .filter(Boolean)
        .map(site => [site.toLowerCase(), site])
    ).values()
  );
  const activeBatchZone = batchZones.includes(selectedBatchZone)
    ? selectedBatchZone
    : batchZones[0] ?? '';
  const activeBatchZonePlants = activeBatchZone
    ? plants.filter(
        plant => plant.site.trim().toLowerCase() === activeBatchZone.toLowerCase()
      )
    : [];
  const canFeedSelectedBatchZone = activeBatchZonePlants.some(
    plant => plant.stage !== 'Dormant'
  );
  const latestBatchLogByZone = new Map(
    batchCareLogs.map(log => [log.site.trim().toLowerCase(), log])
  );

  const handleBatchCareLog = (action: BatchCareAction) => {
    if (!activeBatchZone) return;
    const updatedCount = logBatchCare(activeBatchZone, action);
    if (updatedCount === 0) {
      setBatchCareFeedback(`No eligible plants in ${activeBatchZone} to log.`);
      return;
    }
    setBatchCareFeedback(
      `${activeBatchZone}: ${action.toLowerCase()} logged for ${updatedCount} plant ${
        updatedCount === 1 ? 'entry' : 'entries'
      }.`
    );
  };

  const confirmClearBatchCareLogs = () => {
    Alert.alert(
      'Clear recent batch log?',
      'This clears the batch history only. Plant care records will stay unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear log',
          style: 'destructive',
          onPress: () => {
            clearBatchCareLogs();
            setBatchCareFeedback('Recent batch history cleared.');
          },
        },
      ]
    );
  };

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
  const gardenLogQuery = gardenLogSearch.trim().toLowerCase();
  const filteredUnifiedGardenLogs = unifiedGardenLogs
    .filter(entry => {
      const matchesCategory =
        gardenLogFilter === 'All' || entry.category === gardenLogFilter;
      const matchesSearch =
        !gardenLogQuery ||
        [entry.category, entry.context ?? '', entry.note ?? '']
          .join(' ')
          .toLowerCase()
          .includes(gardenLogQuery);
      return matchesCategory && matchesSearch;
    })
    .sort(
      (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    );

  // Keep a candidate pool so the card can rotate through only three at a time.
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
    focusItems.push({
      id: rem.id,
      label: rem.title,
      meta: rem.due,
      onPress: () => toggleReminder(rem.id),
    });
  }
  if (plants.length > 0 && !focusItems.some(i => i.id === 'quick-water')) {
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
  const focusStartIndex = focusItems.length
    ? focusRotation % focusItems.length
    : 0;
  const topThree = Array.from(
    { length: Math.min(3, focusItems.length) },
    (_, index) => focusItems[(focusStartIndex + index) % focusItems.length]
  );
  const completedFocusTaskIds =
    focusCompletion.day === todayFocusKey ? focusCompletion.taskIds : [];
  const completedFocusCount = focusItems.filter((item) =>
    completedFocusTaskIds.includes(item.id)
  ).length;

  const toggleFocusTask = (taskId: string) => {
    setFocusCompletion((current) => {
      const currentTaskIds =
        current.day === todayFocusKey ? current.taskIds : [];
      return {
        day: todayFocusKey,
        taskIds: currentTaskIds.includes(taskId)
          ? currentTaskIds.filter((id) => id !== taskId)
          : [...currentTaskIds, taskId],
      };
    });
  };

  const resetCompletedFocusTasks = () => {
    setFocusCompletion({ day: todayFocusKey, taskIds: [] });
  };

  const saveHarvest = () => {
    if (!crop.trim() || !Number(grams)) return;
    addHarvest(crop.trim(), Number(grams));
    setCrop('');
    setGrams('');
    setModal('none');
  };

  const saveKitchenLog = () => {
    const item = kitchenItem.trim();
    if (!item) return;
    addHarvestKitchenLog(item, kitchenOutcome, kitchenQuantity, kitchenNotes);
    setKitchenItem('');
    setKitchenQuantity('');
    setKitchenNotes('');
  };

  const confirmClearKitchenLogs = () => {
    Alert.alert(
      'Clear harvest & kitchen log?',
      'This removes all kitchen log entries.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear log',
          style: 'destructive',
          onPress: clearHarvestKitchenLogs,
        },
      ]
    );
  };

  const saveUnifiedGardenLog = () => {
    addUnifiedGardenLog(gardenLogCategory, gardenLogContext, gardenLogNote);
    setGardenLogContext('');
    setGardenLogNote('');
  };

  const confirmClearUnifiedGardenLogs = () => {
    Alert.alert(
      'Clear unified garden log?',
      'This removes all unified garden log entries.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear log', style: 'destructive', onPress: clearUnifiedGardenLogs },
      ]
    );
  };

  const resetUnifiedGardenFilters = () => {
    setGardenLogFilter('All');
    setGardenLogSearch('');
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

  if (showSubscription) {
    return <SubscriptionScreen onClose={() => setShowSubscription(false)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroTag}>WESTERN SYDNEY • LIVE</Text>
            <Text style={styles.heroTitle}>ADHD Chaos Gardening</Text>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => setModal('auth')} style={styles.cloudBtn} activeOpacity={0.78}>
              <Ionicons name={user ? 'cloud-done' : 'cloud-outline'} size={16} color={WARM_THEME.accent} />
              <Text style={styles.cloudTxt}>{syncLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={fetchWeather} style={styles.refreshBtn} activeOpacity={0.78}>
              <Ionicons name="refresh" size={16} color={WARM_THEME.accent} />
            </TouchableOpacity>
            {isPro && (
              <View style={styles.proActiveBadge}>
                <Ionicons name="sparkles" size={14} color={WARM_THEME.textPrimary} />
                <Text style={styles.proActiveBadgeText}>Pro Active</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setShowSubscription(true)}
              style={styles.proButton}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Open Pro subscription options"
            >
              <Ionicons name="sparkles" size={15} color={WARM_THEME.accentText} />
              <Text style={styles.proButtonText}>Pro / Subscription</Text>
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
              <View style={styles.weatherDetails}>
                <View style={styles.weatherMetadataPill}>
                  <Text style={styles.weatherMetadataText}>
                    {wInfo.label} • {weather.humidity}% humidity
                  </Text>
                </View>
                <View style={styles.weatherMetadataPill}>
                  <Text style={styles.weatherMetadataText}>
                    Today: {weather.todayMin}°–{weather.todayMax}°C • {weather.todayRain}% rain
                  </Text>
                </View>
                <View style={styles.weatherMetadataPill}>
                  <Text style={styles.weatherMetadataText}>
                    Tomorrow: {weather.tomorrowMin}°–{weather.tomorrowMax}°C • {weather.tomorrowRain}% rain
                  </Text>
                </View>
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

      <View style={styles.proFeatureCard}>
        <View style={styles.proFeatureHeading}>
          <View style={styles.proFeatureCopy}>
            <Text style={styles.proFeatureEyebrow}>GARDEN PLANNER PRO</Text>
            <Text style={styles.proFeatureTitle}>Seasonal garden planner</Text>
          </View>
          <View style={isPro ? styles.proActiveBadge : styles.proLockedBadge}>
            <Ionicons
              name={isPro ? 'sparkles' : 'lock-closed'}
              size={14}
              color={isPro ? WARM_THEME.textPrimary : WARM_THEME.accent}
            />
            <Text style={isPro ? styles.proActiveBadgeText : styles.proLockedBadgeText}>
              {isPro ? 'Pro Active' : 'Locked'}
            </Text>
          </View>
        </View>
        {isPro ? (
          <>
            <Text style={styles.proFeatureDescription}>
              Your Pro planner is unlocked. Keep seasonal tasks and garden routines within easy reach.
            </Text>
            <View style={styles.proFeatureRow}>
              <Ionicons name="calendar-outline" size={18} color={WARM_THEME.accentWarm} />
              <View style={styles.proFeatureRowCopy}>
                <Text style={styles.proFeatureRowTitle}>Seasonal planning tools</Text>
                <Text style={styles.proFeatureDescription}>
                  Plan ahead and keep your next garden steps organized.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.proRefreshButton}
              onPress={() => void refreshEntitlement()}
              activeOpacity={0.78}
              disabled={isProLoading}
              accessibilityRole="button"
              accessibilityLabel="Refresh Pro subscription status"
            >
              {isProLoading ? (
                <ActivityIndicator color={WARM_THEME.accent} size="small" />
              ) : (
                <Ionicons name="refresh" size={15} color={WARM_THEME.accent} />
              )}
              <Text style={styles.proRefreshButtonText}>
                {isProLoading ? 'Checking status...' : 'Refresh Pro status'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.proFeatureDescription}>
              Unlock seasonal planning tools and a more complete set of garden planner features.
            </Text>
            {!isProBillingAvailable && (
              <Text style={styles.proBillingNote}>
                Billing is unavailable in this build. Pro stays locked until a supported Android build and RevenueCat key are configured.
              </Text>
            )}
            {proEntitlementError && (
              <Text style={styles.proBillingError}>
                Pro status could not be refreshed. {proEntitlementError}
              </Text>
            )}
            <View style={styles.proFeatureActions}>
              <TouchableOpacity
                style={[styles.proUnlockButton, styles.proUnlockAction]}
                onPress={() => setShowSubscription(true)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Open subscription options to unlock Pro"
              >
                <Ionicons name="lock-open-outline" size={16} color={WARM_THEME.accentText} />
                <Text style={styles.proUnlockButtonText}>Unlock Garden Planner Pro</Text>
              </TouchableOpacity>
              {isProBillingAvailable && (
                <TouchableOpacity
                  style={[styles.proRefreshButton, styles.proRefreshAction]}
                  onPress={() => void refreshEntitlement()}
                  activeOpacity={0.78}
                  disabled={isProLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh Pro subscription status"
                >
                  {isProLoading ? (
                    <ActivityIndicator color={WARM_THEME.accent} size="small" />
                  ) : (
                    <Ionicons name="refresh" size={15} color={WARM_THEME.accent} />
                  )}
                  <Text style={styles.proRefreshButtonText}>
                    {isProLoading ? 'Checking...' : 'Refresh status'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.focusCard}>
        <View style={styles.focusHeader}>
          <View style={styles.focusHeadingCopy}>
            <Text style={styles.focusTag}>TODAY ONLY • UP TO 3 TASKS</Text>
            <Text style={styles.focusTitle}>🎯 Garden focus</Text>
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={handleCatchUpReset} activeOpacity={0.78}>
            <Ionicons name="sparkles-outline" size={14} color={WARM_THEME.accent} />
            <Text style={styles.resetBtnText}>Catch-Up Reset</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.focusHint}>
          Mark a task done with its check. Use the arrow to open or run it; only three tasks are shown at a time.
        </Text>

        {(focusItems.length > 3 || completedFocusCount > 0) && (
          <View style={styles.focusControlsRow}>
            {focusItems.length > 3 && (
              <TouchableOpacity
                style={styles.focusControlButton}
                onPress={() =>
                  setFocusRotation((current) => (current + 1) % focusItems.length)
                }
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Show the next three garden tasks"
              >
                <Ionicons name="shuffle-outline" size={14} color={WARM_THEME.accent} />
                <Text style={styles.focusControlButtonText}>Next 3 tasks</Text>
              </TouchableOpacity>
            )}
            {completedFocusCount > 0 && (
              <TouchableOpacity
                style={styles.focusControlButton}
                onPress={resetCompletedFocusTasks}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Reset completed focus tasks"
              >
                <Ionicons name="refresh-outline" size={14} color={WARM_THEME.accentWarm} />
                <Text style={styles.focusControlButtonText}>
                  Reset completed ({completedFocusCount})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {topThree.length === 0 ? (
          <Text style={styles.emptyFocus}>Load your starter garden or add a plant to get gentle daily focus picks.</Text>
        ) : (
          topThree.map((item, idx) => {
            const completed = completedFocusTaskIds.includes(item.id);
            return (
              <View
                key={item.id}
                style={[styles.focusRow, completed && styles.focusRowCompleted]}
              >
                <View style={styles.focusNum}>
                  <Text style={styles.focusNumText}>{idx + 1}</Text>
                </View>
                <TouchableOpacity
                  style={styles.focusCompleteToggle}
                  onPress={() => toggleFocusTask(item.id)}
                  activeOpacity={0.75}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: completed }}
                  accessibilityLabel={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${item.label}`}
                >
                  <Ionicons
                    name={completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={completed ? WARM_THEME.accent : WARM_THEME.accentWarm}
                  />
                </TouchableOpacity>
                <View style={styles.focusItemCopy}>
                  <Text
                    style={[
                      styles.focusItemText,
                      completed && styles.focusItemTextCompleted,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <View style={styles.focusMetaPill}>
                    <Text style={styles.focusMeta}>{item.meta}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.focusTaskAction}
                  onPress={item.onPress}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Open task: ${item.label}`}
                >
                  <Ionicons name="arrow-forward" size={16} color={WARM_THEME.accent} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.batchZoneCard}>
        <View style={styles.batchZoneHeader}>
          <View style={styles.batchZoneHeaderCopy}>
            <Text style={styles.batchZoneEyebrow}>QUICK BATCH LOG</Text>
            <Text style={styles.batchZoneTitle}>Water or feed a zone</Text>
          </View>
          <Ionicons name="water-outline" size={22} color={WARM_THEME.accentWarm} />
        </View>
        <Text style={styles.batchZoneDescription}>
          Pick a bed, row, or pot zone to update its plants together. Feeding skips dormant plants.
        </Text>

        {batchZones.length > 0 ? (
          <View style={styles.batchZonePills}>
            {batchZones.map(zone => {
              const isSelected = zone === activeBatchZone;
              return (
                <TouchableOpacity
                  key={zone}
                  style={[
                    styles.batchZonePill,
                    isSelected && styles.batchZonePillSelected,
                  ]}
                  onPress={() => {
                    setSelectedBatchZone(zone);
                    setBatchCareFeedback('');
                  }}
                  activeOpacity={0.76}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Select ${zone} zone`}
                >
                  <Text
                    style={[
                      styles.batchZonePillText,
                      isSelected && styles.batchZonePillTextSelected,
                    ]}
                  >
                    {zone}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.batchZoneEmpty}>
            <Text style={styles.batchZoneEmptyText}>
              Add a plant and give it a bed or pot zone to start a batch log.
            </Text>
          </View>
        )}

        {activeBatchZone ? (
          <Text style={styles.batchZoneCount}>
            {activeBatchZonePlants.length} plant{' '}
            {activeBatchZonePlants.length === 1 ? 'entry' : 'entries'} in {activeBatchZone}
          </Text>
        ) : null}

        <View style={styles.batchZoneActions}>
          <TouchableOpacity
            style={[
              styles.batchZoneActionButton,
              styles.batchWaterButton,
              !activeBatchZone && styles.batchZoneActionDisabled,
            ]}
            onPress={() => handleBatchCareLog('Watered')}
            activeOpacity={0.78}
            disabled={!activeBatchZone}
            accessibilityRole="button"
            accessibilityLabel={`Log watered for ${activeBatchZone || 'selected zone'}`}
          >
            <Ionicons
              name="water"
              size={17}
              color={activeBatchZone ? WARM_THEME.accentText : WARM_THEME.textSecondary}
            />
            <Text
              style={[
                styles.batchWaterButtonText,
                !activeBatchZone && styles.batchZoneActionDisabledText,
              ]}
            >
              Log Watered
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.batchZoneActionButton,
              styles.batchFeedButton,
              !canFeedSelectedBatchZone && styles.batchZoneActionDisabled,
            ]}
            onPress={() => handleBatchCareLog('Fed')}
            activeOpacity={0.78}
            disabled={!canFeedSelectedBatchZone}
            accessibilityRole="button"
            accessibilityLabel={`Log fed for ${activeBatchZone || 'selected zone'}`}
          >
            <Ionicons
              name="leaf-outline"
              size={17}
              color={canFeedSelectedBatchZone ? WARM_THEME.accentText : WARM_THEME.textSecondary}
            />
            <Text
              style={[
                styles.batchFeedButtonText,
                !canFeedSelectedBatchZone && styles.batchZoneActionDisabledText,
              ]}
            >
              Log Fed
            </Text>
          </TouchableOpacity>
        </View>
        {activeBatchZone && !canFeedSelectedBatchZone ? (
          <Text style={styles.batchZoneDisabledNote}>
            Feeding is unavailable because all plants in this zone are dormant.
          </Text>
        ) : null}
        {batchCareFeedback ? (
          <Text style={styles.batchCareFeedback} accessibilityRole="text">
            {batchCareFeedback}
          </Text>
        ) : null}

        <View style={styles.batchRecentHeader}>
          <Text style={styles.batchRecentTitle}>Recent by zone</Text>
          {batchCareLogs.length > 0 && (
            <TouchableOpacity
              style={styles.batchClearButton}
              onPress={confirmClearBatchCareLogs}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Clear recent batch log"
            >
              <Text style={styles.batchClearButtonText}>Clear log</Text>
            </TouchableOpacity>
          )}
        </View>
        {batchZones.length > 0 ? (
          <View style={styles.batchRecentList}>
            {batchZones.map(zone => {
              const entry = latestBatchLogByZone.get(zone.toLowerCase());
              return (
                <View key={zone} style={styles.batchRecentRow}>
                  <View style={styles.batchRecentZoneBadge}>
                    <Ionicons name="location-outline" size={14} color={WARM_THEME.accent} />
                  </View>
                  <View style={styles.batchRecentCopy}>
                    <Text style={styles.batchRecentZone}>{zone}</Text>
                    <Text style={styles.batchRecentDetails}>
                      {entry
                        ? `${entry.action} • ${formatLocalLogTimestamp(entry.loggedAt)}`
                        : 'No batch log yet'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.batchNoHistory}>
            Your latest batch action for each zone will show here.
          </Text>
        )}
      </View>

      {hasKitchenLogAccess ? (
      <View style={styles.kitchenCard}>
        <View style={styles.kitchenHeader}>
          <View style={styles.kitchenHeaderCopy}>
            <Text style={styles.kitchenEyebrow}>HARVEST & PRESERVATION</Text>
            <Text style={styles.kitchenTitle}>Kitchen log</Text>
          </View>
          <Ionicons name="basket-outline" size={22} color={WARM_THEME.accentWarm} />
        </View>
        <Text style={styles.kitchenDescription}>
          Record what you picked and where it went, from fresh meals to preserved batches.
        </Text>

        <TextInput
          style={styles.kitchenInput}
          value={kitchenItem}
          onChangeText={setKitchenItem}
          placeholder="Harvest item or variety"
          placeholderTextColor={WARM_THEME.textSecondary}
          accessibilityLabel="Harvest item or variety"
          returnKeyType="next"
        />
        <TextInput
          style={styles.kitchenInput}
          value={kitchenQuantity}
          onChangeText={setKitchenQuantity}
          placeholder="Quantity / amount (optional, e.g. 500 g or 2 jars)"
          placeholderTextColor={WARM_THEME.textSecondary}
          accessibilityLabel="Optional harvest quantity or amount"
          returnKeyType="next"
        />
        <TextInput
          style={[styles.kitchenInput, styles.kitchenNotesInput]}
          value={kitchenNotes}
          onChangeText={setKitchenNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={WARM_THEME.textSecondary}
          accessibilityLabel="Optional harvest notes"
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.kitchenFieldLabel}>What happened to it?</Text>
        <View style={styles.kitchenOutcomePills}>
          {KITCHEN_OUTCOMES.map(outcome => {
            const isSelected = kitchenOutcome === outcome;
            return (
              <TouchableOpacity
                key={outcome}
                style={[
                  styles.kitchenOutcomePill,
                  isSelected && styles.kitchenOutcomePillSelected,
                ]}
                onPress={() => setKitchenOutcome(outcome)}
                activeOpacity={0.76}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Choose ${outcome} outcome`}
              >
                <Text
                  style={[
                    styles.kitchenOutcomeText,
                    isSelected && styles.kitchenOutcomeTextSelected,
                  ]}
                >
                  {outcome}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.kitchenSubmitButton,
            !kitchenItem.trim() && styles.kitchenSubmitButtonDisabled,
          ]}
          onPress={saveKitchenLog}
          activeOpacity={0.78}
          disabled={!kitchenItem.trim()}
          accessibilityRole="button"
          accessibilityLabel="Add harvest outcome to kitchen log"
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color={kitchenItem.trim() ? WARM_THEME.accentText : WARM_THEME.textSecondary}
          />
          <Text
            style={[
              styles.kitchenSubmitText,
              !kitchenItem.trim() && styles.kitchenSubmitTextDisabled,
            ]}
          >
            Add to kitchen log
          </Text>
        </TouchableOpacity>

        <View style={styles.kitchenRecentHeader}>
          <Text style={styles.kitchenRecentTitle}>
            Recent entries ({harvestKitchenLogs.length})
          </Text>
          {harvestKitchenLogs.length > 0 && (
            <TouchableOpacity
              style={styles.kitchenClearButton}
              onPress={confirmClearKitchenLogs}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Clear harvest and kitchen log"
            >
              <Text style={styles.kitchenClearText}>Clear log</Text>
            </TouchableOpacity>
          )}
        </View>

        {harvestKitchenLogs.length > 0 ? (
          <View style={styles.kitchenLogList}>
            {harvestKitchenLogs.map(entry => (
              <View key={entry.id} style={styles.kitchenLogRow}>
                <View style={styles.kitchenLogCopy}>
                  <Text style={styles.kitchenLogItem}>{entry.item}</Text>
                  {entry.quantity ? (
                    <Text style={styles.kitchenLogMeta}>Amount: {entry.quantity}</Text>
                  ) : null}
                  {entry.notes ? (
                    <Text style={styles.kitchenLogMeta}>{entry.notes}</Text>
                  ) : null}
                  <Text style={styles.kitchenLogTime}>
                    {formatLocalLogTimestamp(entry.loggedAt)}
                  </Text>
                </View>
                <View style={styles.kitchenLogOutcomePill}>
                  <Text style={styles.kitchenLogOutcomeText}>{entry.outcome}</Text>
                </View>
                <TouchableOpacity
                  style={styles.kitchenRemoveButton}
                  onPress={() => deleteHarvestKitchenLog(entry.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${entry.item} kitchen log entry`}
                >
                  <Ionicons name="trash-outline" size={16} color={WARM_THEME.accent} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.kitchenEmptyCard}>
            <Text style={styles.kitchenEmptyText}>
              Your harvests and kitchen outcomes will appear here.
            </Text>
          </View>
        )}
      </View>
      ) : (
        <View style={styles.kitchenProCard}>
          <View style={styles.kitchenHeader}>
            <View style={styles.kitchenHeaderCopy}>
              <Text style={styles.kitchenEyebrow}>HARVEST & PRESERVATION</Text>
              <Text style={styles.kitchenTitle}>Kitchen log</Text>
            </View>
            <View style={styles.kitchenProBadge}>
              <Ionicons name="lock-closed" size={13} color={WARM_THEME.accent} />
              <Text style={styles.kitchenProBadgeText}>Pro feature</Text>
            </View>
          </View>
          <Text style={styles.kitchenDescription}>
            Logging harvests and preserving or kitchen batches is a Garden Planner Pro feature.
            Upgrade to record what you picked and how you used it.
          </Text>
          {isProLoading && (
            <View style={styles.kitchenProStatus}>
              <ActivityIndicator size="small" color={WARM_THEME.accentWarm} />
              <Text style={styles.kitchenProStatusText}>Checking your subscription status...</Text>
            </View>
          )}
          {proEntitlementError ? (
            <Text style={styles.kitchenProError}>{proEntitlementError}</Text>
          ) : null}
          <View style={styles.proFeatureActions}>
            <TouchableOpacity
              style={[styles.proUnlockButton, styles.proUnlockAction]}
              onPress={() => setShowSubscription(true)}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Open subscription options to unlock the kitchen log"
            >
              <Ionicons name="lock-open-outline" size={16} color={WARM_THEME.accentText} />
              <Text style={styles.proUnlockButtonText}>Explore Pro plans</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.unifiedGardenLogCard}>
        <View style={styles.unifiedLogHeader}>
          <View style={styles.unifiedLogHeaderCopy}>
            <Text style={styles.unifiedLogEyebrow}>GARDEN ACTIVITY</Text>
            <Text style={styles.unifiedLogTitle}>Unified garden log</Text>
          </View>
          <Ionicons name="book-outline" size={22} color={WARM_THEME.accentWarm} />
        </View>
        <Text style={styles.unifiedLogDescription}>
          Keep watering, feeding, issues, pruning, and sowing notes together.
        </Text>

        <Text style={styles.unifiedLogFieldLabel}>Entry type</Text>
        <View style={styles.unifiedLogCategoryPills}>
          {GARDEN_LOG_CATEGORIES.map(category => {
            const isSelected = gardenLogCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.unifiedLogCategoryPill,
                  isSelected && styles.unifiedLogCategoryPillSelected,
                ]}
                onPress={() => setGardenLogCategory(category)}
                activeOpacity={0.76}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Choose ${category} entry type`}
              >
                <Text
                  style={[
                    styles.unifiedLogCategoryText,
                    isSelected && styles.unifiedLogCategoryTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={styles.unifiedLogInput}
          value={gardenLogContext}
          onChangeText={setGardenLogContext}
          placeholder="Plant, bed, or zone (optional)"
          placeholderTextColor={WARM_THEME.textSecondary}
          accessibilityLabel="Optional plant, bed, or zone"
          returnKeyType="next"
        />
        <TextInput
          style={[styles.unifiedLogInput, styles.unifiedLogNoteInput]}
          value={gardenLogNote}
          onChangeText={setGardenLogNote}
          placeholder="Note (optional)"
          placeholderTextColor={WARM_THEME.textSecondary}
          accessibilityLabel="Optional garden log note"
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={styles.unifiedLogSubmitButton}
          onPress={saveUnifiedGardenLog}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={`Log ${gardenLogCategory} garden entry`}
        >
          <Ionicons name="add-circle-outline" size={18} color={WARM_THEME.accentText} />
          <Text style={styles.unifiedLogSubmitText}>Log garden entry</Text>
        </TouchableOpacity>

        <View style={styles.unifiedLogRecentHeader}>
          <Text style={styles.unifiedLogRecentTitle}>
            Recent entries ({unifiedGardenLogs.length})
          </Text>
          {unifiedGardenLogs.length > 0 && (
            <TouchableOpacity
              style={styles.unifiedLogClearButton}
              onPress={confirmClearUnifiedGardenLogs}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Clear unified garden log"
            >
              <Text style={styles.unifiedLogClearText}>Clear log</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.unifiedLogSearchRow}>
          <Ionicons name="search-outline" size={17} color={WARM_THEME.textSecondary} />
          <TextInput
            style={styles.unifiedLogSearchInput}
            value={gardenLogSearch}
            onChangeText={setGardenLogSearch}
            placeholder="Search category, plant, zone, or note"
            placeholderTextColor={WARM_THEME.textSecondary}
            accessibilityLabel="Search garden log"
            returnKeyType="search"
          />
          {gardenLogSearch.length > 0 && (
            <TouchableOpacity
              style={styles.unifiedLogSearchClear}
              onPress={() => setGardenLogSearch('')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Clear garden log search"
            >
              <Ionicons name="close-circle" size={18} color={WARM_THEME.accent} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.unifiedLogFilterPills}>
          {(['All', ...GARDEN_LOG_CATEGORIES] as const).map(category => {
            const isSelected = gardenLogFilter === category;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.unifiedLogFilterPill,
                  isSelected && styles.unifiedLogFilterPillSelected,
                ]}
                onPress={() => setGardenLogFilter(category)}
                activeOpacity={0.76}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Filter garden log by ${category}`}
              >
                <Text
                  style={[
                    styles.unifiedLogFilterText,
                    isSelected && styles.unifiedLogFilterTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredUnifiedGardenLogs.length > 0 ? (
          <View style={styles.unifiedLogList}>
            {filteredUnifiedGardenLogs.map(entry => (
              <View key={entry.id} style={styles.unifiedLogRow}>
                <View style={styles.unifiedLogEntryCopy}>
                  {entry.context ? (
                    <Text style={styles.unifiedLogContext}>{entry.context}</Text>
                  ) : null}
                  {entry.note ? (
                    <Text style={styles.unifiedLogNote}>{entry.note}</Text>
                  ) : null}
                  <Text style={styles.unifiedLogTimestamp}>
                    {formatLocalLogTimestamp(entry.loggedAt)}
                  </Text>
                </View>
                <View style={styles.unifiedLogEntryCategoryPill}>
                  <Text style={styles.unifiedLogEntryCategoryText}>{entry.category}</Text>
                </View>
                <TouchableOpacity
                  style={styles.unifiedLogDeleteButton}
                  onPress={() => deleteUnifiedGardenLog(entry.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${entry.category} log entry`}
                >
                  <Ionicons name="trash-outline" size={16} color={WARM_THEME.accent} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.unifiedLogEmptyCard}>
            <Ionicons name="leaf-outline" size={20} color={WARM_THEME.accentWarm} />
            <View style={styles.unifiedLogEmptyCopy}>
              <Text style={styles.unifiedLogEmptyTitle}>
                {unifiedGardenLogs.length === 0
                  ? 'Your garden notes will appear here.'
                  : 'No entries match those filters.'}
              </Text>
              <Text style={styles.unifiedLogEmptyText}>
                {unifiedGardenLogs.length === 0
                  ? 'Add a quick activity above to start your garden timeline.'
                  : 'Try a different category or search term.'}
              </Text>
            </View>
            {unifiedGardenLogs.length > 0 && (
              <TouchableOpacity
                style={styles.unifiedLogResetButton}
                onPress={resetUnifiedGardenFilters}
                activeOpacity={0.76}
                accessibilityRole="button"
                accessibilityLabel="Reset garden log filters"
              >
                <Text style={styles.unifiedLogResetText}>Reset filters</Text>
              </TouchableOpacity>
            )}
          </View>
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
        <TouchableOpacity style={styles.actionBtn} onPress={() => { waterAll(); Alert.alert('Watered!', 'All plants logged as watered today.'); }} activeOpacity={0.78}>
          <Ionicons name="water" size={20} color={WARM_THEME.accentWarm} />
          <Text style={styles.actionLabel}>Water All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { feedAll(); Alert.alert('Fed!', 'All active plants logged as fed today.'); }} activeOpacity={0.78}>
          <Ionicons name="leaf" size={20} color={WARM_THEME.accent} />
          <Text style={styles.actionLabel}>Bulk Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('harvest')} activeOpacity={0.78}>
          <Ionicons name="basket" size={20} color={WARM_THEME.accentWarm} />
          <Text style={styles.actionLabel}>Log Yield</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('expense')} activeOpacity={0.78}>
          <Ionicons name="cash" size={20} color={WARM_THEME.accent} />
          <Text style={styles.actionLabel}>Expense</Text>
        </TouchableOpacity>
      </View>

      {readyToPick.length > 0 && (
        <View style={styles.harvestBanner}>
          <Text style={styles.bannerTitle}>READY TO HARVEST ({readyToPick.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {readyToPick.map(p => (
              <TouchableOpacity key={p.id} style={styles.pickChip} onPress={() => { setCrop(`${p.variety} ${p.name}`); setModal('harvest'); }} activeOpacity={0.78}>
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
        <TouchableOpacity style={styles.starterBtn} onPress={loadSampleGarden} activeOpacity={0.78}>
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

const cardShadow = {
  shadowColor: WARM_THEME.textPrimary,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

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
    padding: 16,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 12,
    ...cardShadow,
  },
  heroTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
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
  proButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    backgroundColor: WARM_THEME.accent,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: WARM_THEME.radiusPill,
  },
  proButtonText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '800',
    color: WARM_THEME.accentText,
  },
  proActiveBadge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accentWarm,
  },
  proActiveBadgeText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
  },
  proFeatureCard: {
    gap: 12,
    padding: 16,
    borderRadius: WARM_THEME.radiusCard,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
    ...cardShadow,
  },
  proFeatureHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  proFeatureCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  proFeatureEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WARM_THEME.accent,
  },
  proFeatureTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
  },
  proLockedBadge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  proLockedBadgeText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '800',
    color: WARM_THEME.accent,
  },
  proFeatureDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: WARM_THEME.textSecondary,
  },
  proFeatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    borderRadius: 12,
    backgroundColor: WARM_THEME.background,
  },
  proFeatureRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  proFeatureRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
  },
  proBillingNote: {
    fontSize: 11,
    lineHeight: 16,
    color: WARM_THEME.textSecondary,
  },
  proBillingError: {
    fontSize: 11,
    lineHeight: 16,
    color: WARM_THEME.accent,
  },
  proFeatureActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  proRefreshButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  proRefreshAction: {
    flexGrow: 1,
    flexBasis: 120,
    minWidth: 120,
    alignSelf: 'auto',
  },
  proRefreshButtonText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: WARM_THEME.accent,
  },
  proUnlockButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: WARM_THEME.accent,
  },
  proUnlockAction: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 150,
  },
  proUnlockButtonText: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: WARM_THEME.accentText,
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
  weatherDetails: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  weatherMetadataPill: {
    maxWidth: '100%',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  weatherMetadataText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    lineHeight: 14,
    color: WARM_THEME.textSecondary,
  },
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
    gap: 12,
    ...cardShadow,
  },
  focusHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  focusTag: { fontSize: 10, fontWeight: '800', color: WARM_THEME.accent, letterSpacing: 0.8 },
  focusHeadingCopy: { flex: 1, minWidth: 0, gap: 3 },
  focusTitle: { fontSize: 18, fontWeight: '800', color: WARM_THEME.textPrimary, marginTop: 2 },
  focusControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  focusControlButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  focusControlButtonText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: WARM_THEME.textPrimary,
  },
  resetBtn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    minHeight: 40,
    backgroundColor: WARM_THEME.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  resetBtnText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '700', color: WARM_THEME.accent },
  focusHint: { fontSize: 12, color: WARM_THEME.textSecondary, lineHeight: 17 },
  emptyFocus: { fontSize: 13, color: WARM_THEME.textSecondary, fontStyle: 'italic' },
  focusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    backgroundColor: WARM_THEME.surfaceMuted,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    ...cardShadow,
  },
  focusRowCompleted: {
    backgroundColor: WARM_THEME.surfaceMuted,
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
  focusCompleteToggle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accentSoft,
  },
  focusItemCopy: { flex: 1, minWidth: 0, gap: 5 },
  focusItemText: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '700', color: WARM_THEME.textPrimary },
  focusItemTextCompleted: { color: WARM_THEME.textSecondary },
  focusMetaPill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accentSoft,
  },
  focusMeta: { fontSize: 10, fontWeight: '700', color: WARM_THEME.accent },
  focusTaskAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  batchZoneCard: {
    gap: 12,
    padding: 16,
    borderRadius: WARM_THEME.radiusCard,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
    ...cardShadow,
  },
  batchZoneHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  batchZoneHeaderCopy: { flex: 1, minWidth: 0, gap: 3 },
  batchZoneEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WARM_THEME.accentWarm,
  },
  batchZoneTitle: { fontSize: 17, fontWeight: '800', color: WARM_THEME.textPrimary },
  batchZoneDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: WARM_THEME.textSecondary,
  },
  batchZonePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  batchZonePill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  batchZonePillSelected: {
    borderColor: WARM_THEME.accent,
    backgroundColor: WARM_THEME.accent,
  },
  batchZonePillText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '700',
    color: WARM_THEME.textPrimary,
  },
  batchZonePillTextSelected: { color: WARM_THEME.accentText },
  batchZoneEmpty: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
  },
  batchZoneEmptyText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 17,
    color: WARM_THEME.textSecondary,
  },
  batchZoneCount: { fontSize: 11, fontWeight: '700', color: WARM_THEME.textSecondary },
  batchZoneActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  batchZoneActionButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flexGrow: 1,
    flexBasis: 110,
    minWidth: 110,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  batchWaterButton: { backgroundColor: WARM_THEME.accent },
  batchFeedButton: { backgroundColor: WARM_THEME.accentWarm },
  batchZoneActionDisabled: { backgroundColor: WARM_THEME.surfaceMuted },
  batchZoneActionDisabledText: { color: WARM_THEME.textSecondary },
  batchZoneDisabledNote: {
    fontSize: 11,
    lineHeight: 15,
    color: WARM_THEME.textSecondary,
  },
  batchWaterButtonText: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: WARM_THEME.accentText,
  },
  batchFeedButtonText: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: WARM_THEME.accentText,
  },
  batchCareFeedback: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: WARM_THEME.accent,
  },
  batchRecentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  batchRecentTitle: { fontSize: 12, fontWeight: '800', color: WARM_THEME.textPrimary },
  batchClearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  batchClearButtonText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: WARM_THEME.accent,
  },
  batchRecentList: { gap: 7 },
  batchRecentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 9,
    padding: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
  },
  batchRecentZoneBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accentSoft,
  },
  batchRecentCopy: { flex: 1, minWidth: 0, gap: 2 },
  batchRecentZone: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
  },
  batchRecentDetails: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    lineHeight: 14,
    color: WARM_THEME.textSecondary,
  },
  batchNoHistory: { fontSize: 11, color: WARM_THEME.textSecondary },
  kitchenCard: {
    gap: 12,
    padding: 16,
    borderRadius: WARM_THEME.radiusCard,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
    ...cardShadow,
  },
  kitchenProCard: {
    gap: 12,
    padding: 16,
    borderRadius: WARM_THEME.radiusCard,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
    ...cardShadow,
  },
  kitchenHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kitchenHeaderCopy: { flex: 1, minWidth: 0, gap: 3 },
  kitchenProBadge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  kitchenProBadgeText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '800',
    color: WARM_THEME.accent,
  },
  kitchenProStatus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  kitchenProStatusText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    color: WARM_THEME.textSecondary,
  },
  kitchenProError: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 16,
    color: WARM_THEME.accent,
  },
  kitchenEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WARM_THEME.accentWarm,
  },
  kitchenTitle: { fontSize: 17, fontWeight: '800', color: WARM_THEME.textPrimary },
  kitchenDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: WARM_THEME.textSecondary,
  },
  kitchenInput: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
    color: WARM_THEME.textPrimary,
    fontSize: 13,
  },
  kitchenNotesInput: { minHeight: 76 },
  kitchenFieldLabel: { fontSize: 12, fontWeight: '800', color: WARM_THEME.textPrimary },
  kitchenOutcomePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kitchenOutcomePill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  kitchenOutcomePillSelected: {
    borderColor: WARM_THEME.accent,
    backgroundColor: WARM_THEME.accent,
  },
  kitchenOutcomeText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '700',
    color: WARM_THEME.textPrimary,
  },
  kitchenOutcomeTextSelected: { color: WARM_THEME.accentText },
  kitchenSubmitButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: WARM_THEME.accent,
  },
  kitchenSubmitButtonDisabled: { backgroundColor: WARM_THEME.surfaceMuted },
  kitchenSubmitText: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: WARM_THEME.accentText,
  },
  kitchenSubmitTextDisabled: { color: WARM_THEME.textSecondary },
  kitchenRecentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  kitchenRecentTitle: { fontSize: 12, fontWeight: '800', color: WARM_THEME.textPrimary },
  kitchenClearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  kitchenClearText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: WARM_THEME.accent,
  },
  kitchenLogList: { gap: 8 },
  kitchenLogRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
  },
  kitchenLogCopy: { flex: 1, minWidth: 0, gap: 3 },
  kitchenLogItem: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
  },
  kitchenLogMeta: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 15,
    color: WARM_THEME.textSecondary,
  },
  kitchenLogTime: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    color: WARM_THEME.textSecondary,
  },
  kitchenLogOutcomePill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.accentSoft,
  },
  kitchenLogOutcomeText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '800',
    color: WARM_THEME.accent,
  },
  kitchenRemoveButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  kitchenEmptyCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
  },
  kitchenEmptyText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 17,
    color: WARM_THEME.textSecondary,
  },
  unifiedGardenLogCard: {
    gap: 12,
    padding: 16,
    borderRadius: WARM_THEME.radiusCard,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
    ...cardShadow,
  },
  unifiedLogHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unifiedLogHeaderCopy: { flex: 1, minWidth: 0, gap: 3 },
  unifiedLogEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WARM_THEME.accentWarm,
  },
  unifiedLogTitle: { fontSize: 17, fontWeight: '800', color: WARM_THEME.textPrimary },
  unifiedLogDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: WARM_THEME.textSecondary,
  },
  unifiedLogFieldLabel: { fontSize: 12, fontWeight: '800', color: WARM_THEME.textPrimary },
  unifiedLogCategoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unifiedLogCategoryPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: 40,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  unifiedLogCategoryPillSelected: {
    borderColor: WARM_THEME.accent,
    backgroundColor: WARM_THEME.accent,
  },
  unifiedLogCategoryText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: WARM_THEME.textPrimary,
  },
  unifiedLogCategoryTextSelected: { color: WARM_THEME.accentText },
  unifiedLogInput: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
    color: WARM_THEME.textPrimary,
    fontSize: 13,
  },
  unifiedLogNoteInput: { minHeight: 74 },
  unifiedLogSubmitButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: WARM_THEME.accent,
  },
  unifiedLogSubmitText: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: WARM_THEME.accentText,
  },
  unifiedLogRecentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  unifiedLogRecentTitle: { fontSize: 12, fontWeight: '800', color: WARM_THEME.textPrimary },
  unifiedLogClearButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  unifiedLogClearText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: WARM_THEME.accent,
  },
  unifiedLogSearchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
  },
  unifiedLogSearchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    color: WARM_THEME.textPrimary,
    fontSize: 12,
  },
  unifiedLogSearchClear: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedLogFilterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  unifiedLogFilterPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  unifiedLogFilterPillSelected: {
    borderColor: WARM_THEME.accentWarm,
    backgroundColor: WARM_THEME.accentWarm,
  },
  unifiedLogFilterText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '700',
    color: WARM_THEME.textPrimary,
  },
  unifiedLogFilterTextSelected: { color: WARM_THEME.textPrimary },
  unifiedLogList: { gap: 8 },
  unifiedLogRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
  },
  unifiedLogEntryCopy: { flex: 1, minWidth: 0, gap: 3 },
  unifiedLogContext: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
  },
  unifiedLogNote: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 15,
    color: WARM_THEME.textSecondary,
  },
  unifiedLogTimestamp: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    color: WARM_THEME.textSecondary,
  },
  unifiedLogEntryCategoryPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.accentSoft,
  },
  unifiedLogEntryCategoryText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '800',
    color: WARM_THEME.accent,
  },
  unifiedLogDeleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  unifiedLogEmptyCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
  },
  unifiedLogEmptyCopy: { flex: 1, minWidth: 0, gap: 3 },
  unifiedLogEmptyTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
  },
  unifiedLogEmptyText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 15,
    color: WARM_THEME.textSecondary,
  },
  unifiedLogResetButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
  },
  unifiedLogResetText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: WARM_THEME.accent,
  },
  pantryCard: {
    backgroundColor: WARM_THEME.surface,
    borderRadius: WARM_THEME.radiusCard,
    padding: 16,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 8,
    ...cardShadow,
  },
  pantryTitle: { fontSize: 13, fontWeight: '800', color: WARM_THEME.accentWarm },
  pantryLine: { fontSize: 12, color: WARM_THEME.textPrimary, lineHeight: 17 },
  seedAlertCard: {
    backgroundColor: WARM_THEME.accentSoft,
    borderRadius: WARM_THEME.radiusCard,
    padding: 16,
    borderWidth: 1,
    borderColor: WARM_THEME.accentWarm,
    gap: 8,
    ...cardShadow,
  },
  seedAlertTitle: { fontSize: 13, fontWeight: '800', color: WARM_THEME.accentWarm },
  seedAlertLine: { fontSize: 12, color: WARM_THEME.textPrimary, lineHeight: 17 },
  alertCard: {
    backgroundColor: WARM_THEME.surface,
    borderRadius: WARM_THEME.radiusCard,
    padding: 16,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    ...cardShadow,
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
    borderRadius: WARM_THEME.radiusCard,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 4,
    ...cardShadow,
  },
  actionLabel: { fontSize: 11, fontWeight: '700', color: WARM_THEME.textPrimary },
  harvestBanner: {
    backgroundColor: WARM_THEME.accentSoft,
    borderRadius: WARM_THEME.radiusCard,
    padding: 16,
    borderWidth: 1,
    borderColor: WARM_THEME.accentWarm,
    ...cardShadow,
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
    ...cardShadow,
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