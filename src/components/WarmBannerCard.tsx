import React from "react";
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { WARM_THEME } from "../utils/warmTheme";

interface WarmBannerCardProps {
  title: string;
  subtitle: string;
  imageSource: ImageSourcePropType;
  imageAlt?: string;
  badgeText?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function WarmBannerCard({
  title,
  subtitle,
  imageSource,
  imageAlt,
  badgeText,
  actionLabel,
  onActionPress,
}: WarmBannerCardProps) {
  return (
    <View style={styles.card}>
      <Image
        source={imageSource}
        accessibilityLabel={imageAlt ?? title}
        style={styles.bannerImage}
        resizeMode="cover"
      />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.textColumn}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {badgeText ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}
        </View>

        {actionLabel && onActionPress ? (
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={onActionPress}>
              <Text style={styles.actionBtnText}>{actionLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: WARM_THEME.radiusCard,
    backgroundColor: WARM_THEME.surface,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  textColumn: {
    flex: 1,
    minWidth: 180,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: WARM_THEME.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: WARM_THEME.textSecondary,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: WARM_THEME.accentSoft,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: WARM_THEME.accent,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    backgroundColor: WARM_THEME.accent,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  actionBtnText: {
    color: WARM_THEME.accentText,
    fontWeight: "700",
    fontSize: 13,
  },
});
