import AsyncStorage from "@react-native-async-storage/async-storage";
import { WARM_THEME } from "./warmTheme";

export type AppColorPresetId = "terracotta" | "amber" | "clayRose" | "espressoSand";

export interface AppColorPreset {
  id: AppColorPresetId;
  label: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  accent: string;
  accentWarm: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
}

export const APP_COLOR_PRESETS: Record<AppColorPresetId, AppColorPreset> = {
  terracotta: {
    id: "terracotta",
    label: "Warm Terracotta",
    background: WARM_THEME.background,
    surface: WARM_THEME.surface,
    surfaceMuted: WARM_THEME.surfaceMuted,
    border: WARM_THEME.border,
    accent: WARM_THEME.accent,
    accentWarm: WARM_THEME.accentWarm,
    accentSoft: WARM_THEME.accentSoft,
    textPrimary: WARM_THEME.textPrimary,
    textSecondary: WARM_THEME.textSecondary,
  },
  amber: {
    id: "amber",
    label: "Golden Ochre",
    background: "#FBF7F0",
    surface: "#FFFDF9",
    surfaceMuted: "#F5EBDC",
    border: "#E8D7BE",
    accent: "#C86D2D",
    accentWarm: "#E09132",
    accentSoft: "#FCEFD9",
    textPrimary: "#2B2018",
    textSecondary: "#6E5B4B",
  },
  clayRose: {
    id: "clayRose",
    label: "Sunbaked Clay",
    background: "#FAF5F2",
    surface: "#FFFDFC",
    surfaceMuted: "#F2E5DF",
    border: "#E5D0C7",
    accent: "#A84A3E",
    accentWarm: "#C96A4B",
    accentSoft: "#FBE8E4",
    textPrimary: "#291B18",
    textSecondary: "#6E534D",
  },
  espressoSand: {
    id: "espressoSand",
    label: "Linen & Umber",
    background: "#F7F3EC",
    surface: "#FFFDF8",
    surfaceMuted: "#ECE3D5",
    border: "#DECDB8",
    accent: "#7A492E",
    accentWarm: "#B5794A",
    accentSoft: "#F2E6D8",
    textPrimary: "#221914",
    textSecondary: "#635246",
  },
};

export interface AdminVisualSettings {
  presetId: AppColorPresetId;
  customAccentHex: string;
  bannerImageUri: string;
  homeCardImageUri: string;
}

const STORAGE_KEY = "@adhd_chaos_gardening_admin_visuals_v1";

export const DEFAULT_ADMIN_VISUALS: AdminVisualSettings = {
  presetId: "terracotta",
  customAccentHex: WARM_THEME.accent,
  bannerImageUri: "",
  homeCardImageUri: "",
};

export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex.trim());
}

export function getActivePalette(settings: AdminVisualSettings) {
  const base = APP_COLOR_PRESETS[settings.presetId] ?? APP_COLOR_PRESETS.terracotta;
  const accent = isValidHexColor(settings.customAccentHex)
    ? settings.customAccentHex.trim()
    : base.accent;

  return {
    ...base,
    accent,
    accentText: WARM_THEME.accentText,
    danger: WARM_THEME.danger,
  };
}

export async function loadAdminVisuals(): Promise<AdminVisualSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADMIN_VISUALS;
    const parsed = JSON.parse(raw) as Partial<AdminVisualSettings>;
    return {
      presetId: parsed.presetId ?? DEFAULT_ADMIN_VISUALS.presetId,
      customAccentHex: parsed.customAccentHex ?? DEFAULT_ADMIN_VISUALS.customAccentHex,
      bannerImageUri: parsed.bannerImageUri ?? "",
      homeCardImageUri: parsed.homeCardImageUri ?? "",
    };
  } catch {
    return DEFAULT_ADMIN_VISUALS;
  }
}

export async function saveAdminVisuals(settings: AdminVisualSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
