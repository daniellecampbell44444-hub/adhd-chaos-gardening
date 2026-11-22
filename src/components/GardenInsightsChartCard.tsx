import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { KitchenLogOutcome } from '../context/GardenContext';
import { WARM_THEME } from '../utils/warmTheme';

export interface KitchenOutcomeCount {
  outcome: KitchenLogOutcome;
  count: number;
}

export interface GardenInsightsChartCardProps {
  careActivityTimestamps: readonly string[];
  kitchenOutcomeCounts: readonly KitchenOutcomeCount[];
  canViewKitchenOutcomes: boolean;
  onUpgradePress: () => void;
}

interface CareActivityDay {
  key: string;
  label: string;
  count: number;
}

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLogDate(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(value);
}

function getCareActivityDays(timestamps: readonly string[]): CareActivityDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: localDayKey(date),
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      count: 0,
    };
  });
  const dayCounts = new Map(days.map(day => [day.key, day]));

  for (const timestamp of timestamps) {
    const date = parseLogDate(timestamp);
    if (Number.isNaN(date.getTime())) continue;
    const day = dayCounts.get(localDayKey(date));
    if (day) day.count += 1;
  }

  return days;
}

export function GardenInsightsChartCard({
  careActivityTimestamps,
  kitchenOutcomeCounts,
  canViewKitchenOutcomes,
  onUpgradePress,
}: GardenInsightsChartCardProps) {
  const careDays = getCareActivityDays(careActivityTimestamps);
  const maxCareCount = Math.max(1, ...careDays.map(day => day.count));
  const hasCareActivity = careDays.some(day => day.count > 0);
  const totalOutcomeCount = kitchenOutcomeCounts.reduce(
    (total, outcome) => total + outcome.count,
    0
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>GARDEN INSIGHTS</Text>
          <Text style={styles.title}>Care & harvest activity</Text>
        </View>
        <Ionicons name="stats-chart-outline" size={22} color={WARM_THEME.accentWarm} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Care activity</Text>
          <Text style={styles.sectionMeta}>Last 7 days</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Daily counts from unified, batch, and soil-care logs.
        </Text>
        <View style={styles.careChart}>
          {careDays.map(day => {
            const barHeight = day.count
              ? Math.max(8, Math.round((day.count / maxCareCount) * 70))
              : 4;
            return (
              <View key={day.key} style={styles.dayColumn}>
                <Text style={styles.dayCount}>{day.count}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.careBar,
                      day.count === 0 && styles.careBarEmpty,
                      { height: barHeight },
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{day.label}</Text>
              </View>
            );
          })}
        </View>
        {!hasCareActivity && (
          <View style={styles.zeroState}>
            <Text style={styles.zeroStateText}>
              No care activity logged in the past 7 days yet.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionTitle}>Harvest & kitchen outcomes</Text>
          </View>
          {canViewKitchenOutcomes ? (
            <View style={styles.totalPill}>
              <Text style={styles.totalPillText}>{totalOutcomeCount} total</Text>
            </View>
          ) : (
            <View style={styles.proPill}>
              <Ionicons name="lock-closed" size={12} color={WARM_THEME.accent} />
              <Text style={styles.proPillText}>Pro</Text>
            </View>
          )}
        </View>
        {canViewKitchenOutcomes ? (
          <>
            <View style={styles.outcomeList}>
              {kitchenOutcomeCounts.map((outcome, index) => {
                const proportion =
                  totalOutcomeCount > 0
                    ? (outcome.count / totalOutcomeCount) * 100
                    : 0;
                return (
                  <View key={outcome.outcome} style={styles.outcomeRow}>
                    <View style={styles.outcomeLabelRow}>
                      <Text style={styles.outcomeLabel}>{outcome.outcome}</Text>
                      <View style={styles.outcomeCountPill}>
                        <Text style={styles.outcomeCountText}>{outcome.count}</Text>
                      </View>
                    </View>
                    <View style={styles.outcomeBarTrack}>
                      <View
                        style={[
                          styles.outcomeBar,
                          {
                            width: `${proportion}%`,
                            backgroundColor:
                              index % 2 === 0 ? WARM_THEME.accent : WARM_THEME.accentWarm,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
            {totalOutcomeCount === 0 && (
              <View style={styles.zeroState}>
                <Text style={styles.zeroStateText}>
                  No harvest or kitchen outcomes logged yet.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.lockedOutcomeCard}>
            <View style={styles.lockedOutcomeCopy}>
              <Text style={styles.lockedOutcomeText}>
                Unlock Pro to see your Fresh, Dehydrated, Pickled, Canned, and Batch breakdown.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={onUpgradePress}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Open subscription options to unlock harvest outcome insights"
            >
              <Ionicons name="lock-open-outline" size={15} color={WARM_THEME.accentText} />
              <Text style={styles.upgradeButtonText}>Explore Pro</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 16,
    borderRadius: WARM_THEME.radiusCard,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surface,
    shadowColor: WARM_THEME.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: WARM_THEME.accentWarm,
  },
  title: { fontSize: 17, fontWeight: '800', color: WARM_THEME.textPrimary },
  section: { gap: 9 },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionHeadingCopy: { flex: 1, minWidth: 0 },
  sectionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
  },
  sectionMeta: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    color: WARM_THEME.textSecondary,
  },
  sectionDescription: {
    fontSize: 11,
    lineHeight: 15,
    color: WARM_THEME.textSecondary,
  },
  careChart: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 5,
    paddingTop: 4,
  },
  dayColumn: {
    flex: 1,
    minWidth: 27,
    alignItems: 'center',
    gap: 5,
  },
  dayCount: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
    textAlign: 'center',
  },
  barTrack: {
    height: 74,
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  careBar: {
    width: '100%',
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accent,
  },
  careBarEmpty: { backgroundColor: WARM_THEME.border },
  dayLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 9,
    fontWeight: '700',
    color: WARM_THEME.textSecondary,
    textAlign: 'center',
  },
  zeroState: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
  },
  zeroStateText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 15,
    color: WARM_THEME.textSecondary,
  },
  totalPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accentSoft,
  },
  totalPillText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '800',
    color: WARM_THEME.accent,
  },
  outcomeList: { gap: 8 },
  outcomeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  outcomeLabelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexBasis: 132,
    flexGrow: 1,
    minWidth: 0,
  },
  outcomeLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '700',
    color: WARM_THEME.textPrimary,
  },
  outcomeCountPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
    minHeight: 28,
    paddingHorizontal: 7,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  outcomeCountText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '800',
    color: WARM_THEME.accent,
    textAlign: 'center',
  },
  outcomeBarTrack: {
    flex: 1,
    minWidth: 72,
    height: 9,
    overflow: 'hidden',
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  outcomeBar: { height: '100%', borderRadius: WARM_THEME.radiusPill },
  proPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  proPillText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '800',
    color: WARM_THEME.accent,
  },
  lockedOutcomeCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.background,
  },
  lockedOutcomeCopy: { flex: 1, minWidth: 0 },
  lockedOutcomeText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 15,
    color: WARM_THEME.textSecondary,
  },
  upgradeButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.accent,
  },
  upgradeButtonText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '800',
    color: WARM_THEME.accentText,
  },
});
