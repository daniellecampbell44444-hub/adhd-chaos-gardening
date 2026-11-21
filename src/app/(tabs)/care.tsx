import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useGarden,
  getSmartFeed,
  AUSSIE_FERT_PRESETS,
  SoilCareType,
} from '../../context/GardenContext';
import { TROUBLE_GUIDE, TroubleCategory } from '../../data/troubleGuide';

const TROUBLE_CATEGORIES: ('All' | TroubleCategory)[] = [
  'All',
  'Leaf Curl & Distortion',
  'Yellowing & Pale Leaves',
  'Wilting & Heat Stress',
  'Chewed Leaves & Pests',
  'Spots, Powdery & Fungus',
  'Flower & Fruit Drop',
];

const SOIL_CARE_TYPES: SoilCareType[] = [
  'Mulch Top-Up',
  'Compost / Worm Castings',
  'Soil Mix',
  'pH / Soil Amendment',
];

const SOIL_SITES = ['Raised Beds', 'Pots', 'Standing Bed', 'Front Yard', 'Backyard'];

export default function CareScreen() {
  const {
    plants,
    fertilizers,
    soilLogs,
    reminders,
    waterPlant,
    feedPlant,
    waterAll,
    feedAll,
    addFertilizer,
    deleteFertilizer,
    addSoilLog,
    deleteSoilLog,
    toggleReminder,
    addReminder,
    catchUpReminders,
  } = useGarden();

  const [selectedTroubleCategory, setSelectedTroubleCategory] = useState<'All' | TroubleCategory>('All');
  const [expandedTroubleId, setExpandedTroubleId] = useState<string | null>(TROUBLE_GUIDE[0].id);

  // Soil / Mulch / Compost modal state
  const [soilModalVisible, setSoilModalVisible] = useState(false);
  const [soilSite, setSoilSite] = useState('Raised Beds');
  const [careType, setCareType] = useState<SoilCareType>('Mulch Top-Up');
  const [material, setMaterial] = useState('Sugarcane Mulch');
  const [amountLabel, setAmountLabel] = useState('5cm layer');
  const [phEstimate, setPhEstimate] = useState('6.5');
  const [soilNotes, setSoilNotes] = useState('');

  const visibleTroubles =
    selectedTroubleCategory === 'All'
      ? TROUBLE_GUIDE
      : TROUBLE_GUIDE.filter(item => item.category === selectedTroubleCategory);

  const handleCreateTroubleReminder = (title: string) => {
    addReminder(title, 'Today — Check Garden');
    Alert.alert('Reminder added', 'Added to your reminders list.');
  };

  const handleSaveSoilLog = () => {
    if (!material.trim()) {
      Alert.alert('Missing material', 'Enter the soil, mulch, compost, or amendment name.');
      return;
    }
    addSoilLog({
      site: soilSite,
      careType,
      material: material.trim(),
      amountLabel: amountLabel.trim() || 'Standard top-up',
      phEstimate: phEstimate.trim() || undefined,
      notes: soilNotes.trim() || undefined,
    });
    setSoilNotes('');
    setSoilModalVisible(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tag}>SMART CARE, SOIL & FIXES</Text>
          <Text style={styles.title}>Care, Soil & Fixes</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.waterBtn} onPress={waterAll}>
            <Ionicons name="water" size={15} color="#ffffff" />
            <Text style={styles.btnText}>Water All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.feedBtn} onPress={feedAll}>
            <Ionicons name="leaf" size={15} color="#ffffff" />
            <Text style={styles.btnText}>Feed All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Soil, Mulch & Compost Tracker */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Soil, Mulch & Compost ({soilLogs.length})</Text>
          <TouchableOpacity style={styles.presetBtn} onPress={() => setSoilModalVisible(true)}>
            <Text style={styles.presetBtnText}>+ Log Soil / Mulch</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sub}>
          Track raised bed mulch layers, pot mix refreshes, compost/worm castings, and pH notes.
        </Text>

        {soilLogs.length === 0 ? (
          <Text style={styles.sub}>
            No soil or mulch logs yet. Tap + Log Soil / Mulch to record a bed or pot update.
          </Text>
        ) : (
          soilLogs.map(log => (
            <View key={log.id} style={styles.soilRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {log.site} • {log.careType}
                </Text>
                <Text style={styles.sub}>
                  {log.material} ({log.amountLabel})
                  {log.phEstimate ? ` • pH ~${log.phEstimate}` : ''} • {log.date}
                </Text>
                {log.notes ? <Text style={styles.notesItalic}>{log.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => deleteSoilLog(log.id)}>
                <Text style={styles.del}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Quick Pest, Disease & Leaf Trouble Helper */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Quick Pest & Leaf Trouble Helper</Text>
          <Text style={styles.badgeText}>{visibleTroubles.length} guides</Text>
        </View>
        <Text style={styles.sub}>
          Tap a symptom category to spot likely causes and low-stress fixes fast.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {TROUBLE_CATEGORIES.map(cat => {
            const active = selectedTroubleCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedTroubleCategory(cat)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {visibleTroubles.map(entry => {
          const isOpen = expandedTroubleId === entry.id;
          const matchingGardenPlants = plants.filter(p =>
            entry.affectedCrops.some(
              crop =>
                p.name.toLowerCase().includes(crop.toLowerCase()) ||
                crop.toLowerCase().includes(p.name.toLowerCase()) ||
                (crop === 'Leafy' && p.category === 'Leafy')
            )
          );

          return (
            <View key={entry.id} style={styles.troubleBox}>
              <TouchableOpacity
                style={styles.rowBetween}
                onPress={() => setExpandedTroubleId(isOpen ? null : entry.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{entry.title}</Text>
                  <Text style={styles.sub}>{entry.symptoms}</Text>
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#14532d"
                />
              </TouchableOpacity>

              {matchingGardenPlants.length > 0 && (
                <Text style={styles.matchTag}>
                  In your garden:{' '}
                  {matchingGardenPlants
                    .slice(0, 4)
                    .map(p => `${p.variety} ${p.name}`)
                    .join(', ')}
                </Text>
              )}

              {isOpen && (
                <View style={styles.troubleDetails}>
                  <Text style={styles.detailHeading}>Likely Causes</Text>
                  {entry.likelyCauses.map((cause, idx) => (
                    <Text key={idx} style={styles.detailBullet}>
                      • {cause}
                    </Text>
                  ))}

                  <Text style={styles.detailHeading}>Quick Fixes</Text>
                  {entry.quickFixes.map((fix, idx) => (
                    <Text key={idx} style={styles.detailBullet}>
                      ✓ {fix}
                    </Text>
                  ))}

                  <TouchableOpacity
                    style={styles.remindActionBtn}
                    onPress={() => handleCreateTroubleReminder(entry.reminderTitle)}
                  >
                    <Ionicons name="alarm-outline" size={15} color="#14532d" />
                    <Text style={styles.remindActionText}>Add Check Reminder</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Plant Care & Smart Feed */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Plant Care & Smart Feed ({plants.length})</Text>
        {plants.length === 0 ? (
          <Text style={styles.sub}>
            No plants yet. Add plants on the Plants tab or load sample data on Pulse.
          </Text>
        ) : (
          plants.map(p => {
            const feed = getSmartFeed(p, fertilizers);
            return (
              <View key={p.id} style={styles.plantRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {p.variety} {p.name} ({p.quantity})
                  </Text>
                  <Text style={styles.sub}>
                    {p.site} • {p.stage} • Every {p.waterEveryDays}d
                  </Text>
                  <Text style={styles.feedNote}>{feed.note}</Text>
                </View>
                <View style={styles.rowGap}>
                  <TouchableOpacity style={styles.smallWater} onPress={() => waterPlant(p.id)}>
                    <Text style={styles.smallWaterText}>Water</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallFeed} onPress={() => feedPlant(p.id)}>
                    <Text style={styles.smallFeedText}>Feed</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* My Fertilisers */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>My Fertilisers ({fertilizers.length})</Text>
          <TouchableOpacity
            style={styles.presetBtn}
            onPress={() => {
              const next = AUSSIE_FERT_PRESETS[fertilizers.length % AUSSIE_FERT_PRESETS.length];
              addFertilizer(next);
            }}
          >
            <Text style={styles.presetBtnText}>+ Add Aussie Preset</Text>
          </TouchableOpacity>
        </View>

        {fertilizers.length === 0 ? (
          <Text style={styles.sub}>
            Tap + Add Aussie Preset to load common garden tonics and feeds.
          </Text>
        ) : (
          fertilizers.map(f => (
            <View key={f.id} style={styles.fertRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {f.brand} — {f.name}
                </Text>
                <Text style={styles.sub}>
                  {f.feedType} • Pot: {f.potDosage} • Bed: {f.bedDosage} • Every {f.freqDays}d
                </Text>
              </View>
              <TouchableOpacity onPress={() => deleteFertilizer(f.id)}>
                <Text style={styles.del}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Reminders */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Reminders ({reminders.length})</Text>
          {reminders.some(r => !r.done) && (
            <TouchableOpacity onPress={catchUpReminders}>
              <Text style={styles.linkText}>Catch Up to Today</Text>
            </TouchableOpacity>
          )}
        </View>
        {reminders.length === 0 ? (
          <Text style={styles.sub}>No reminders yet. Add one on the Pulse tab.</Text>
        ) : (
          reminders.map(r => (
            <TouchableOpacity
              key={r.id}
              style={styles.remRow}
              onPress={() => toggleReminder(r.id)}
            >
              <Text style={[styles.itemTitle, r.done && styles.doneText]}>
                {r.done ? '✓ ' : '○ '}
                {r.title}
              </Text>
              <Text style={styles.sub}>{r.due}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Log Soil / Mulch / Compost Modal */}
      <Modal visible={soilModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Log Soil, Mulch or Compost</Text>

              <Text style={styles.fieldLabel}>Spot / Area</Text>
              <View style={styles.wrapRow}>
                {SOIL_SITES.map(spot => (
                  <TouchableOpacity
                    key={spot}
                    style={[styles.choicePill, soilSite === spot && styles.choicePillActive]}
                    onPress={() => setSoilSite(spot)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        soilSite === spot && styles.choicePillTextActive,
                      ]}
                    >
                      {spot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Care Type</Text>
              <View style={styles.wrapRow}>
                {SOIL_CARE_TYPES.map(ct => (
                  <TouchableOpacity
                    key={ct}
                    style={[styles.choicePill, careType === ct && styles.choicePillActive]}
                    onPress={() => setCareType(ct)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        careType === ct && styles.choicePillTextActive,
                      ]}
                    >
                      {ct}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Material / Mix Name</Text>
              <TextInput
                value={material}
                onChangeText={setMaterial}
                placeholder="e.g. Sugarcane Mulch, Premium Potting Mix, Worm Castings"
                style={styles.input}
              />

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Amount / Depth</Text>
                  <TextInput
                    value={amountLabel}
                    onChangeText={setAmountLabel}
                    placeholder="e.g. 5cm layer, 20L bag"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>pH Note (Optional)</Text>
                  <TextInput
                    value={phEstimate}
                    onChangeText={setPhEstimate}
                    placeholder="e.g. 6.5"
                    style={styles.input}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Notes (Optional)</Text>
              <TextInput
                value={soilNotes}
                onChangeText={setSoilNotes}
                placeholder="e.g. Kept clear of stems, dampened well"
                style={styles.input}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setSoilModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSoilLog}>
                  <Text style={styles.saveText}>Save Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  headerBtns: { flexDirection: 'row', gap: 8 },
  waterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  feedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
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
  rowGap: { flexDirection: 'row', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#14532d' },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  linkText: { fontSize: 12, fontWeight: '800', color: '#15803d' },
  itemTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 17 },
  notesItalic: { fontSize: 12, color: '#334155', marginTop: 3, fontStyle: 'italic' },
  feedNote: { fontSize: 12, color: '#334155', marginTop: 4 },
  soilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chipScroll: { flexGrow: 0, marginTop: 2 },
  filterChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterChipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  filterChipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  filterChipTextActive: { color: '#ffffff' },
  troubleBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  matchTag: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  troubleDetails: { marginTop: 4, gap: 4 },
  detailHeading: { fontSize: 12, fontWeight: '800', color: '#14532d', marginTop: 4 },
  detailBullet: { fontSize: 12, color: '#334155', lineHeight: 17 },
  remindActionBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  remindActionText: { fontSize: 12, fontWeight: '800', color: '#14532d' },
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  smallWater: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallWaterText: { fontSize: 11, fontWeight: '800', color: '#0369a1' },
  smallFeed: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallFeedText: { fontSize: 11, fontWeight: '800', color: '#15803d' },
  presetBtn: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  presetBtnText: { fontSize: 11, fontWeight: '800', color: '#14532d' },
  fertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  del: { fontSize: 14, color: '#94a3b8', fontWeight: '700', paddingHorizontal: 4 },
  remRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  doneText: { textDecorationLine: 'line-through', color: '#64748b' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#14532d' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choicePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  choicePillActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  choicePillText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  choicePillTextActive: { color: '#ffffff' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#15803d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveText: { color: '#ffffff', fontWeight: '800' },
});
