import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGarden, PLANT_LIBRARY } from '../../context/GardenContext';
import {
  MONTHS_SHORT,
  MONTHS_FULL,
  getSeasonForMonth,
  getSeasonNotes,
  getPlantingForMonth,
} from '../../data/westernSydneyCalendar';
import {
  getChecklistForSeason,
  CROP_ROTATION_RULES,
} from '../../data/rotationAndCare';

export default function GuideScreen() {
  const { plants, addReminder } = useGarden();
  const [selectedMonth, setSelectedMonth] = useState<number>(11); // November
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [showRotation, setShowRotation] = useState<boolean>(true);
  const [showLibrary, setShowLibrary] = useState<boolean>(false);

  const season = getSeasonForMonth(selectedMonth);
  const seasonNotes = getSeasonNotes(selectedMonth);
  const monthlyEntries = getPlantingForMonth(selectedMonth);
  const seasonalChecklist = getChecklistForSeason(season);

  const toggleChecklistItem = (id: string) => {
    setCheckedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddPlantingReminder = (title: string, dueLabel: string) => {
    addReminder(title, dueLabel);
    Alert.alert('Reminder added', 'Added to your reminders list.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tag}>WESTERN SYDNEY / NSW GUIDE</Text>
          <Text style={styles.title}>Seasonal Planting & Care</Text>
          <Text style={styles.headerSub}>
            {MONTHS_FULL[selectedMonth - 1]} • {season}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setShowLibrary(!showLibrary)}
        >
          <Text style={styles.toggleBtnText}>
            {showLibrary ? 'Hide Crop Specs' : 'Crop Specs'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month Selector */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Pick Month (NSW / Western Sydney)</Text>
          <Text style={styles.seasonPill}>{season}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
          {MONTHS_SHORT.map((label, idx) => {
            const monthNum = idx + 1;
            const active = selectedMonth === monthNum;
            return (
              <TouchableOpacity
                key={label}
                style={[styles.monthChip, active && styles.monthChipActive]}
                onPress={() => setSelectedMonth(monthNum)}
              >
                <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.seasonNote}>{seasonNotes}</Text>
      </View>

      {/* Seasonal Garden Care Checklist */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{season} Yard Care Checklist</Text>
          <Text style={styles.countBadge}>
            {seasonalChecklist.filter(item => checkedIds[item.id]).length}/{seasonalChecklist.length} done
          </Text>
        </View>

        {seasonalChecklist.map(item => {
          const isDone = !!checkedIds[item.id];
          return (
            <View key={item.id} style={styles.checkCard}>
              <TouchableOpacity
                style={styles.rowBetween}
                onPress={() => toggleChecklistItem(item.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cropTitle, isDone && styles.doneText]}>
                    {isDone ? '✓ ' : '○ '}
                    {item.title}
                  </Text>
                  <Text style={styles.metaText}>{item.zoneTag}</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.tipText}>{item.detail}</Text>

              <TouchableOpacity
                style={styles.remindBtn}
                onPress={() =>
                  handleAddPlantingReminder(item.title, `${season} Yard Care`)
                }
              >
                <Ionicons name="alarm-outline" size={14} color="#14532d" />
                <Text style={styles.remindBtnText}>Save as Reminder</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* What to Sow / Plant This Month */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>
            Good to Sow / Plant in {MONTHS_FULL[selectedMonth - 1]}
          </Text>
          <Text style={styles.countBadge}>{monthlyEntries.length} crops</Text>
        </View>

        {monthlyEntries.map(item => {
          const alreadyGrowing = plants.some(
            p =>
              p.name.toLowerCase().includes(item.crop.split(' ')[0].toLowerCase()) ||
              item.crop.toLowerCase().includes(p.name.toLowerCase())
          );

          return (
            <View key={item.crop} style={styles.entryCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cropTitle}>{item.crop}</Text>
                  <Text style={styles.metaText}>
                    {item.action} • {item.windowLabel} • {item.varietyHint}
                  </Text>
                </View>
                <Text style={styles.actionBadge}>{item.action}</Text>
              </View>

              {alreadyGrowing && (
                <Text style={styles.growingTag}>✓ Already in your garden stash</Text>
              )}

              <Text style={styles.tipText}>{item.westernSydneyTip}</Text>

              <TouchableOpacity
                style={styles.remindBtn}
                onPress={() =>
                  handleAddPlantingReminder(
                    `${item.action}: ${item.crop} (Western Sydney ${MONTHS_FULL[selectedMonth - 1]})`,
                    MONTHS_FULL[selectedMonth - 1]
                  )
                }
              >
                <Ionicons name="alarm-outline" size={14} color="#14532d" />
                <Text style={styles.remindBtnText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Crop Rotation Guide */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.rowBetween}
          onPress={() => setShowRotation(!showRotation)}
        >
          <Text style={styles.sectionTitle}>Crop Family Rotation Guide</Text>
          <Ionicons
            name={showRotation ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#14532d"
          />
        </TouchableOpacity>

        {showRotation &&
          CROP_ROTATION_RULES.map(rule => (
            <View key={rule.family} style={styles.entryCard}>
              <Text style={styles.cropTitle}>{rule.shortLabel}</Text>
              <Text style={styles.metaText}>
                {rule.restYearsRecommended > 0
                  ? `Rotate beds every ${rule.restYearsRecommended}+ season(s)`
                  : 'Permanent / perennial placement'}{' '}
                • Follow with: {rule.followWith}
              </Text>
              <Text style={styles.tipText}>{rule.soilNote}</Text>
            </View>
          ))}
      </View>

      {/* Optional Crop Pot & Temp Reference */}
      {showLibrary && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Pot Size, Temp & Companion Reference ({PLANT_LIBRARY.length})
          </Text>
          {PLANT_LIBRARY.map(lib => (
            <View key={lib.id} style={styles.libRow}>
              <Text style={styles.cropTitle}>
                {lib.name} ({lib.category})
              </Text>
              <Text style={styles.metaText}>
                Pot: {lib.potMm}mm ({lib.potL}L) • Ideal: {lib.tempMin}–{lib.tempMax}°C
              </Text>
              <Text style={styles.tipText}>
                Friends: {lib.friends.join(', ')} • Avoid near: {lib.enemies.join(', ')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  header: {
    backgroundColor: '#14532d',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tag: { color: '#86efac', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  headerSub: { color: '#dcfce7', fontSize: 12, fontWeight: '700', marginTop: 4 },
  toggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toggleBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#14532d' },
  seasonPill: {
    backgroundColor: '#dcfce7',
    color: '#14532d',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  monthScroll: { flexGrow: 0 },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
  },
  monthChipActive: { backgroundColor: '#15803d' },
  monthChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  monthChipTextActive: { color: '#ffffff' },
  seasonNote: { fontSize: 12, color: '#334155', lineHeight: 18 },
  checkCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doneText: { textDecorationLine: 'line-through', color: '#64748b' },
  entryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cropTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  metaText: { fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 16 },
  actionBadge: {
    backgroundColor: '#dcfce7',
    color: '#14532d',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  growingTag: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  tipText: { fontSize: 12, color: '#334155', lineHeight: 17 },
  remindBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  remindBtnText: { fontSize: 11, fontWeight: '800', color: '#14532d' },
  libRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 2,
  },
});
