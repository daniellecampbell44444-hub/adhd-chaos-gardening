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
  getSmartFeed,
  checkPlantPlacementWarnings,
  Category,
  Stage,
} from '../../context/GardenContext';

const SITES = ['All', 'Raised Beds', 'Pots', 'Standing Bed', 'Front Yard', 'Backyard'];
const CATEGORIES: Category[] = ['Vegetable', 'Chilli', 'Fruit', 'Herb', 'Leafy'];
const STAGES: Stage[] = ['Seedling', 'Growing', 'Flowering', 'Fruiting', 'Dormant'];

export default function PlantsScreen() {
  const {
    plants,
    fertilizers,
    addPlant,
    updatePlantQty,
    cyclePlantStage,
    deletePlant,
    waterPlant,
    feedPlant,
  } = useGarden();

  const [selectedSite, setSelectedSite] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'zones'>('list');
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState('Tomato');
  const [variety, setVariety] = useState('');
  const [category, setCategory] = useState<Category>('Vegetable');
  const [site, setSite] = useState('Pots');
  const [stage, setStage] = useState<Stage>('Seedling');
  const [quantityText, setQuantityText] = useState('1');
  const [potSize, setPotSize] = useState('300mm (15L)');
  const [waterEveryDaysText, setWaterEveryDaysText] = useState('2');

  const placementCheck = checkPlantPlacementWarnings(
    {
      name,
      site,
      potSize,
    },
    plants
  );

  const applyLibraryPreset = (cropName: string) => {
    const match = PLANT_LIBRARY.find(item => item.name === cropName);
    setName(cropName);
    if (match) {
      setCategory(match.category);
      setPotSize(`${match.potMm}mm (${match.potL}L)`);
    }
  };

  const handleSavePlant = () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter or pick a plant name first.');
      return;
    }

    const match = PLANT_LIBRARY.find(
      item => item.name.toLowerCase() === name.trim().toLowerCase()
    );
    const qty = Math.max(1, Number(quantityText) || 1);
    const waterDays = Math.max(1, Number(waterEveryDaysText) || 2);

    addPlant({
      name: name.trim(),
      variety: variety.trim() || 'Standard',
      scientific: match?.scientific || '',
      category,
      quantity: qty,
      site: site.trim() || 'Pots',
      stage,
      potSize: potSize.trim() || '300mm (15L)',
      idealTemp: match ? `${match.tempMin}–${match.tempMax}°C` : '16–28°C',
      waterEveryDays: waterDays,
    });

    setVariety('');
    setQuantityText('1');
    setModalVisible(false);
  };

  const filtered =
    selectedSite === 'All'
      ? plants
      : plants.filter(p => p.site.toLowerCase() === selectedSite.toLowerCase());

  const renderPlantCard = (p: (typeof plants)[number]) => {
    const feed = getSmartFeed(p, fertilizers);
    return (
      <View key={p.id} style={styles.plantCard}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.plantTitle}>
              {p.variety} {p.name}
            </Text>
            <Text style={styles.sci}>
              {p.site} • {p.potSize} • Ideal {p.idealTemp}
            </Text>
          </View>
          <TouchableOpacity style={styles.stageBadge} onPress={() => cyclePlantStage(p.id)}>
            <Text style={styles.stageText}>{p.stage}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.feedNote}>{feed.note}</Text>

        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.miniBtn} onPress={() => updatePlantQty(p.id, -1)}>
            <Text style={styles.miniBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyLabel}>Qty: {p.quantity}</Text>
          <TouchableOpacity style={styles.miniBtn} onPress={() => updatePlantQty(p.id, 1)}>
            <Text style={styles.miniBtnText}>+</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.carePill} onPress={() => waterPlant(p.id)}>
            <Ionicons name="water" size={14} color="#0284c7" />
            <Text style={styles.carePillText}>
              {p.lastWatered ? `Watered ${p.lastWatered}` : 'Water'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedPill} onPress={() => feedPlant(p.id)}>
            <Ionicons name="leaf" size={14} color="#15803d" />
            <Text style={styles.feedPillText}>
              {p.lastFed ? `Fed ${p.lastFed}` : 'Feed'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => deletePlant(p.id)} style={{ marginLeft: 'auto' }}>
            <Ionicons name="trash-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tag}>MY GARDEN STASH</Text>
          <Text style={styles.title}>Plants & Zones</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setViewMode(viewMode === 'list' ? 'zones' : 'list')}
          >
            <Text style={styles.toggleBtnText}>
              {viewMode === 'list' ? 'By Zone' : 'All List'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {SITES.map(s => {
          const active = selectedSite === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedSite(s)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No plants in this view yet</Text>
          <Text style={styles.sci}>Tap Add to log a plant or load your starter garden on Pulse.</Text>
        </View>
      ) : viewMode === 'list' ? (
        filtered.map(renderPlantCard)
      ) : (
        SITES.filter(s => s !== 'All').map(zoneName => {
          const items = filtered.filter(p => p.site.toLowerCase() === zoneName.toLowerCase());
          const count = items.reduce((sum, p) => sum + p.quantity, 0);
          return (
            <View key={zoneName} style={styles.zoneSection}>
              <Text style={styles.zoneTitle}>
                {zoneName} ({count} plants)
              </Text>
              {items.length === 0 ? (
                <Text style={styles.sci}>No plants in this spot yet.</Text>
              ) : (
                items.map(renderPlantCard)
              )}
            </View>
          );
        })
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Plant</Text>

              <Text style={styles.fieldLabel}>Quick Pick from Library</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {PLANT_LIBRARY.slice(0, 12).map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.presetChip, name === item.name && styles.presetChipActive]}
                    onPress={() => applyLibraryPreset(item.name)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        name === item.name && styles.presetChipTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Plant Name</Text>
              <TextInput
                placeholder="e.g. Tomato, Chilli, Sweet Basil"
                value={name}
                onChangeText={setName}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Variety</Text>
              <TextInput
                placeholder="e.g. Tommy Toe, Jalapeño, Genovese"
                value={variety}
                onChangeText={setVariety}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Spot / Location</Text>
              <View style={styles.wrapRow}>
                {['Pots', 'Raised Beds', 'Standing Bed', 'Front Yard', 'Backyard'].map(spot => (
                  <TouchableOpacity
                    key={spot}
                    style={[styles.choicePill, site === spot && styles.choicePillActive]}
                    onPress={() => setSite(spot)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        site === spot && styles.choicePillTextActive,
                      ]}
                    >
                      {spot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Pot / Container Size</Text>
              <TextInput
                placeholder="e.g. 350mm (20L) or 200mm (6L)"
                value={potSize}
                onChangeText={setPotSize}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Stage & Category</Text>
              <View style={styles.wrapRow}>
                {STAGES.map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.choicePill, stage === st && styles.choicePillActive]}
                    onPress={() => setStage(st)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        stage === st && styles.choicePillTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.wrapRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.choicePill, category === cat && styles.choicePillActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        category === cat && styles.choicePillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Quantity</Text>
                  <TextInput
                    value={quantityText}
                    onChangeText={setQuantityText}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Water Every (Days)</Text>
                  <TextInput
                    value={waterEveryDaysText}
                    onChangeText={setWaterEveryDaysText}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              {placementCheck.warnings.length > 0 && (
                <View style={styles.warningBox}>
                  {placementCheck.warnings.map((warningText, index) => (
                    <Text key={index} style={styles.warningText}>
                      ⚠️ {warningText}
                    </Text>
                  ))}
                </View>
              )}

              {placementCheck.highlights.length > 0 && (
                <View style={styles.buddyBox}>
                  {placementCheck.highlights.map((buddyText, index) => (
                    <Text key={index} style={styles.buddyText}>
                      🌿 {buddyText}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlant}>
                  <Text style={styles.saveText}>Save Plant</Text>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toggleBtnText: { color: '#dcfce7', fontSize: 12, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  filterScroll: { flexGrow: 0 },
  filterChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  filterChipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#14532d' },
  filterChipTextActive: { color: '#ffffff' },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#14532d' },
  zoneSection: { gap: 8 },
  zoneTitle: { fontSize: 15, fontWeight: '800', color: '#14532d', marginTop: 4 },
  plantCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  plantTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sci: { fontSize: 12, color: '#64748b', marginTop: 2 },
  stageBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stageText: { fontSize: 11, fontWeight: '800', color: '#14532d' },
  feedNote: { fontSize: 12, color: '#334155', lineHeight: 17 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  miniBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBtnText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  qtyLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginHorizontal: 2 },
  carePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  carePillText: { fontSize: 11, fontWeight: '700', color: '#0369a1' },
  feedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  feedPillText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
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
  twoCol: { flexDirection: 'row', gap: 10 },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    gap: 4,
  },
  warningText: { color: '#92400e', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  buddyBox: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#86efac',
    gap: 4,
  },
  buddyText: { color: '#14532d', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: { color: '#475569', fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#15803d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveText: { color: '#ffffff', fontWeight: '800' },
});
