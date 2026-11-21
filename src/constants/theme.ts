import { WARM_THEME } from "../utils/warmTheme";
import { Platform } from "react-native";

export const Colors = {
  light: {
    text: WARM_THEME.textPrimary,
    background: WARM_THEME.background,
    backgroundElement: WARM_THEME.surfaceMuted,
    backgroundSelected: WARM_THEME.accentSoft,
    textSecondary: WARM_THEME.textSecondary,
    tint: WARM_THEME.accent,
    icon: WARM_THEME.textSecondary,
    tabIconDefault: WARM_THEME.textSecondary,
    tabIconSelected: WARM_THEME.accent,
    card: WARM_THEME.surface,
    border: WARM_THEME.border,
    muted: WARM_THEME.surfaceMuted,
    accent: WARM_THEME.accent,
    accentWarm: WARM_THEME.accentWarm,
    accentSoft: WARM_THEME.accentSoft,
  },
  dark: {
    text: WARM_THEME.textPrimary,
    background: WARM_THEME.background,
    backgroundElement: WARM_THEME.surfaceMuted,
    backgroundSelected: WARM_THEME.accentSoft,
    textSecondary: WARM_THEME.textSecondary,
    tint: WARM_THEME.accent,
    icon: WARM_THEME.textSecondary,
    tabIconDefault: WARM_THEME.textSecondary,
    tabIconSelected: WARM_THEME.accent,
    card: WARM_THEME.surface,
    border: WARM_THEME.border,
    muted: WARM_THEME.surfaceMuted,
    accent: WARM_THEME.accent,
    accentWarm: WARM_THEME.accentWarm,
    accentSoft: WARM_THEME.accentSoft,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
