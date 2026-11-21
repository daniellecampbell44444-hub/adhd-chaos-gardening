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
  PLANT_LIBRARY,
  Category,
  PropagationMethod,
  PropagationMedium,
} from '../../context/GardenContext';

const CATEGORIES: Category[] = ['Vegetable', 'Chilli', 'Fruit', 'Herb', 'Leafy'];
const METHODS: PropagationMethod[] = ['Cutting', 'Division', 'Runner / Slip'];
const MEDIA: PropagationMedium[] = ['Water', 'Seed Raising Mix', 'Perlite / Coco', 'Direct Soil'];
const TARGET_SITES = ['Pots', 'Raised Beds', 'Standing Bed', 'Front Yard', 'Backyard'];

export default function SeedsScreen() {
  const {
    seeds,
    propagations,
    harvests,
    expenses,
    addSeed,
    updateSeedCount,
    sowSeed,
    deleteSeed,
    addPropagation,
    cyclePropagationStatus,
    promotePropagationToPlant,
    deletePropagation,
  } = useGarden();

  const [seedModalVisible, setSeedModalVisible] = useState(false);
  const [seedName, setSeedName] = useState('Tomato');
  const [seedVariety, setSeedVariety] = useState('');
  const [packetsText, setPacketsText] = useState('1');
  const [approxSeedsText, setApproxSeedsText] = useState('25');
  const [season, setSeason] = useState('Spring/Summer');
  const [wishlist, setWishlist] = useState(false);

  const [propModalVisible, setPropModalVisible] = useState(false);
  const [propName, setPropName] = useState('Sweet Basil');
  const [propVariety, setPropVariety] = useState('');
  const [propCategory, setPropCategory] = useState<Category>('Herb');
  const [propMethod, setPropMethod] = useState<PropagationMethod>('Cutting');
  const [propMedium, setPropMedium] = useState<PropagationMedium>('Water');
  const [propQtyText, setPropQtyText] = useState('2');
  const [propTargetSite, setPropTargetSite] = useState('Pots');
  const [propNotes, setPropNotes] = useState('');

  const earned = harvests.reduce((s, h) => s + h.valueAud, 0);
  const spent = expenses.reduce((s, e) => s + e.costAud, 0);
  const net = Number((earned - spent).toFixed(2));

  const handleSaveSeed = () => {
    if (!seedName.trim()) {
      Alert.alert('Missing name', 'Enter a plant or seed name first.');
      return;
    }
    addSeed({
      name: seedName.trim(),
      variety: seedVariety.trim() || 'Standard',
      packets: Math.max(0, Number(packetsText) || 0),
      approxSeeds: Math.max(0, Number(approxSeedsText) || 0),
      season: season.trim() || 'Year-Round',
      wishlist,
    });
    setSeedVariety('');
    setSeedModalVisible(false);
  };

  const handleSavePropagation = () => {
    if (!propName.trim()) {
      Alert.alert('Missing name', 'Enter a plant name for the cutting or division.');
      return;
    }
    const libMatch = PLANT_LIBRARY.find(
      item => item.name.toLowerCase() === propName.trim().toLowerCase()
    );
    addPropagation({
      name: propName.trim(),
      variety: propVariety.trim() || 'Standard',
      category: libMatch?.category || propCategory,
      method: propMethod,
      medium: propMedium,
      quantity: Math.max(1, Number(propQtyText) || 1),
      targetSite: propTargetSite,
      notes: propNotes.trim() || undefined,
    });
    setPropVariety('');
    setPropNotes('');
    setPropModalVisible(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tag}>STASH, PROPAGATION & VALUE</Text>
          <Text style={styles.title}>Seeds & Cuttings</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPropModalVisible(true)}>
            <Ionicons name="git-branch" size={16} color="#14532d" />
            <Text style={styles.secondaryBtnText}>+ Cutting</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setSeedModalVisible(true)}>
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Seed</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Cuttings & Divisions ({propagations.length})</Text>
          <TouchableOpacity onPress={() => setPropModalVisible(true)}>
            <Text style={styles.linkText}>+ Log Batch</Text>
          </TouchableOpacity>
        </View>

        {propagations.length === 0 ? (
          <Text style={styles.sub}>
            No cuttings, divisions, or slips tracked yet. Tap + Cutting to log one and track when
            it is ready to pot up.
          </Text>
        ) : (
          propagations.map(item => (
            <View key={item.id} style={styles.propCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {item.quantity}× {item.variety} {item.name}
                  </Text>
                  <Text style={styles.sub}>
                    {item.method} • {item.medium} • Target: {item.targetSite} • Started{' '}
                    {item.startedDate}
                  </Text>
                  {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => deletePropagation(item.id)}>
                  <Text style={styles.del}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.propActions}>
                <TouchableOpacity
                  style={styles.statusPill}
                  onPress={() => cyclePropagationStatus(item.id)}
                >
                  <Text style={styles.statusPillText}>{item.status}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.potUpBtn}
                  onPress={() => promotePropagationToPlant(item.id)}
                >
                  <Text style={styles.potUpText}>Pot Up → {item.targetSite}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Seed Stash ({seeds.length})</Text>
          <TouchableOpacity onPress={() => setSeedModalVisible(true)}>
            <Text style={styles.linkText}>+ Add Seed</Text>
          </TouchableOpacity>
        </View>

        {seeds.length === 0 ? (
          <Text style={styles.sub}>
            No seeds logged yet. Tap Seed above to add packets or wishlist varieties.
          </Text>
        ) : (
          seeds.map(s => (
            <View key={s.id} style={styles.seedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {s.variety} {s.name} {s.wishlist ? '• Wishlist' : ''}
                </Text>
                <Text style={styles.sub}>
                  {s.season} • ~{s.approxSeeds} seeds
                </Text>
              </View>

              <View style={styles.counterGroup}>
                <TouchableOpacity
                  style={styles.miniBtn}
                  onPress={() => updateSeedCount(s.id, 'packets', -1)}
                >
                  <Text style={styles.miniBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.pktText}>{s.packets} pkts</Text>
                <TouchableOpacity
                  style={styles.miniBtn}
                  onPress={() => updateSeedCount(s.id, 'packets', 1)}
                >
                  <Text style={styles.miniBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {!s.wishlist && (
                <TouchableOpacity style={styles.sowBtn} onPress={() => sowSeed(s.id)}>
                  <Text style={styles.sowText}>Sow 5</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => deleteSeed(s.id)}>
                <Text style={styles.del}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Harvest Value vs. Spend (AUD)</Text>
        <View style={styles.ledgerRow}>
          <View style={styles.ledgerBox}>
            <Text style={styles.sub}>Harvest Value</Text>
            <Text style={[styles.ledgerNum, { color: '#15803d' }]}>${earned.toFixed(2)}</Text>
          </View>
          <View style={styles.ledgerBox}>
            <Text style={styles.sub}>Garden Costs</Text>
            <Text style={[styles.ledgerNum, { color: '#b91c1c' }]}>${spent.toFixed(2)}</Text>
          </View>
          <View style={styles.ledgerBox}>
            <Text style={styles.sub}>Net Difference</Text>
            <Text style={[styles.ledgerNum, { color: net >= 0 ? '#14532d' : '#b91c1c' }]}>
              {net >= 0 ? `+$${net.toFixed(2)}` : `-$${Math.abs(net).toFixed(2)}`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Harvests ({harvests.length})</Text>
        {harvests.length === 0 ? (
          <Text style={styles.sub}>Tap Log Yield on the Pulse tab to track harvests.</Text>
        ) : (
          harvests.map(h => (
            <View key={h.id} style={styles.logRow}>
              <Text style={styles.itemTitle}>{h.crop}</Text>
              <Text style={styles.sub}>
                {h.grams}g • ~${h.valueAud.toFixed(2)} • {h.date}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Expenses ({expenses.length})</Text>
        {expenses.length === 0 ? (
          <Text style={styles.sub}>Tap Expense on the Pulse tab to log costs.</Text>
        ) : (
          expenses.map(e => (
            <View key={e.id} style={styles.logRow}>
              <Text style={styles.itemTitle}>{e.item}</Text>
              <Text style={styles.sub}>
                {e.category} • ${e.costAud.toFixed(2)} • {e.date}
              </Text>
            </View>
          ))
        )}
      </View>

      <Modal visible={seedModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Seed Variety</Text>

              <Text style={styles.fieldLabel}>Crop / Plant Name</Text>
              <TextInput
                value={seedName}
                onChangeText={setSeedName}
                placeholder="e.g. Tomato, Chilli, Zucchini"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Variety</Text>
              <TextInput
                value={seedVariety}
                onChangeText={setSeedVariety}
                placeholder="e.g. Black Krim, Gold Max"
                style={styles.input}
              />

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Packets</Text>
                  <TextInput
                    value={packetsText}
                    onChangeText={setPacketsText}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Approx Seeds</Text>
                  <TextInput
                    value={approxSeedsText}
                    onChangeText={setApproxSeedsText}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Sowing Season</Text>
              <TextInput
                value={season}
                onChangeText={setSeason}
                placeholder="e.g. Spring/Summer, Autumn/Winter"
                style={styles.input}
              />

              <TouchableOpacity
                style={styles.wishToggle}
                onPress={() => setWishlist(!wishlist)}
              >
                <Text style={styles.wishToggleText}>
                  {wishlist ? '✓ Marked as Seed Wishlist' : '☐ Mark as Seed Wishlist'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setSeedModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSeed}>
                  <Text style={styles.saveText}>Save Seed</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={propModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Log Cutting or Division</Text>

              <Text style={styles.fieldLabel}>Quick Pick Crop</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['Sweet Basil', 'Mint', 'Rosemary', 'Thyme', 'Sweet Potato', 'Strawberry'].map(
                  crop => (
                    <TouchableOpacity
                      key={crop}
                      style={[styles.presetChip, propName === crop && styles.presetChipActive]}
                      onPress={() => setPropName(crop)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          propName === crop && styles.presetChipTextActive,
                        ]}
                      >
                        {crop}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>

              <Text style={styles.fieldLabel}>Plant Name</Text>
              <TextInput
                value={propName}
                onChangeText={setPropName}
                placeholder="e.g. Sweet Basil, Mint, Sweet Potato"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Variety</Text>
              <TextInput
                value={propVariety}
                onChangeText={setPropVariety}
                placeholder="e.g. Genovese, Spearmint, Gold Slip"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Propagation Type</Text>
              <View style={styles.wrapRow}>
                {METHODS.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.choicePill, propMethod === m && styles.choicePillActive]}
                    onPress={() => setPropMethod(m)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        propMethod === m && styles.choicePillTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Rooting Medium</Text>
              <View style={styles.wrapRow}>
                {MEDIA.map(med => (
                  <TouchableOpacity
                    key={med}
                    style={[styles.choicePill, propMedium === med && styles.choicePillActive]}
                    onPress={() => setPropMedium(med)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        propMedium === med && styles.choicePillTextActive,
                      ]}
                    >
                      {med}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Target Spot When Ready to Pot Up</Text>
              <View style={styles.wrapRow}>
                {TARGET_SITES.map(spot => (
                  <TouchableOpacity
                    key={spot}
                    style={[
                      styles.choicePill,
                      propTargetSite === spot && styles.choicePillActive,
                    ]}
                    onPress={() => setPropTargetSite(spot)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        propTargetSite === spot && styles.choicePillTextActive,
                      ]}
                    >
                      {spot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.wrapRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.choicePill, propCategory === cat && styles.choicePillActive]}
                    onPress={() => setPropCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        propCategory === cat && styles.choicePillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Quantity (Cuttings / Divisions)</Text>
              <TextInput
                value={propQtyText}
                onChangeText={setPropQtyText}
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Notes (Optional)</Text>
              <TextInput
                value={propNotes}
                onChangeText={setPropNotes}
                placeholder="e.g. Change jar water every 3 days, keep in bright shade"
                style={styles.input}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setPropModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSavePropagation}>
                  <Text style={styles.saveText}>Save Cutting</Text>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryBtnText: { color: '#14532d', fontSize: 12, fontWeight: '800' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#16a34a',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
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
  linkText: { fontSize: 12, fontWeight: '800', color: '#15803d' },
  itemTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 17 },
  notesText: { fontSize: 12, color: '#334155', marginTop: 4, fontStyle: 'italic' },
  propCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  propActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  statusPillText: { fontSize: 11, fontWeight: '800', color: '#92400e' },
  potUpBtn: {
    backgroundColor: '#15803d',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  potUpText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  seedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  counterGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBtnText: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  pktText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  sowBtn: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sowText: { fontSize: 11, fontWeight: '800', color: '#14532d' },
  del: { fontSize: 14, color: '#94a3b8', fontWeight: '700', paddingHorizontal: 4 },
  ledgerRow: { flexDirection: 'row', gap: 8 },
  ledgerBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ledgerNum: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  logRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#14532d' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  presetChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
  },
  presetChipActive: { backgroundColor: '#15803d' },
  presetChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  presetChipTextActive: { color: '#ffffff' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  twoCol: { flexDirection: 'row', gap: 10 },
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
  wishToggle: {
    paddingVertical: 8,
  },
  wishToggleText: { fontSize: 13, fontWeight: '700', color: '#14532d' },
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
