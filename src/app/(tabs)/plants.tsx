import React, { useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WARM_THEME } from '../../utils/warmTheme';
import {
  useGarden,
  PLANT_LIBRARY,
  getSmartFeed,
  checkPlantPlacementWarnings,
  Category,
  Stage,
} from '../../context/GardenContext';
import { getTypeaheadPlantOptions } from '../../utils/plantSearch';
import type { PlantSearchOption } from '../../utils/plantSearch';

const SITES = ['All', 'Raised Beds', 'Pots', 'Standing Bed', 'Front Yard', 'Backyard'];
const CATEGORIES: Category[] = ['Vegetable', 'Chilli', 'Fruit', 'Herb', 'Leafy'];
const STAGES: Stage[] = ['Seedling', 'Growing', 'Flowering', 'Fruiting', 'Dormant'];

export default function PlantsScreen() {
  const {
    plants,
    seeds,
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
  const [showPlantSuggestions, setShowPlantSuggestions] = useState(false);
  const [showVarietySuggestions, setShowVarietySuggestions] = useState(false);
  const [category, setCategory] = useState<Category>('Vegetable');
  const [site, setSite] = useState('Pots');
  const [stage, setStage] = useState<Stage>('Seedling');
  const [quantityText, setQuantityText] = useState('1');
  const [potSize, setPotSize] = useState('300mm (15L)');
  const [waterEveryDaysText, setWaterEveryDaysText] = useState('2');

  const plantSearchSources = useMemo(() => {
    const sourcesByName = new Map<
      string,
      { id: string; name: string; category?: Category; varieties: Set<string> }
    >();

    const addSource = (
      id: string,
      plantName: string,
      plantCategory?: Category,
      plantVariety?: string
    ) => {
      const trimmedName = plantName.trim();
      if (!trimmedName) return;

      const key = trimmedName.toLowerCase();
      let source = sourcesByName.get(key);
      if (!source) {
        source = {
          id,
          name: trimmedName,
          category: plantCategory,
          varieties: new Set<string>(),
        };
        sourcesByName.set(key, source);
      } else if (!source.category && plantCategory) {
        source.category = plantCategory;
      }

      const trimmedVariety = plantVariety?.trim();
      if (trimmedVariety && trimmedVariety.toLowerCase() !== 'standard') {
        source.varieties.add(trimmedVariety);
      }
    };

    PLANT_LIBRARY.forEach(plant => addSource(plant.id, plant.name, plant.category));
    plants.forEach(plant => addSource(plant.id, plant.name, plant.category, plant.variety));
    seeds.forEach(seed => addSource(seed.id, seed.name, undefined, seed.variety));

    return Array.from(sourcesByName.values(), source => ({
      id: source.id,
      name: source.name,
      category: source.category,
      varieties: Array.from(source.varieties),
    }));
  }, [plants, seeds]);
  const plantSuggestions = useMemo(
    () => getTypeaheadPlantOptions(name, plantSearchSources),
    [name, plantSearchSources]
  );
  const varietySuggestions = useMemo(
    () =>
      getTypeaheadPlantOptions(variety, plantSearchSources).filter(
        suggestion => suggestion.varietyName
      ),
    [variety, plantSearchSources]
  );

  const placementCheck = checkPlantPlacementWarnings(
    {
      name,
      site,
      potSize,
    },
    plants
  );

  const plantsInSameSite = plants.filter(
    p => p.site.trim().toLowerCase() === site.trim().toLowerCase()
  );

  const applyLibraryPreset = (cropName: string) => {
    const match = PLANT_LIBRARY.find(item => item.name === cropName);
    setName(cropName);
    setShowPlantSuggestions(false);
    setShowVarietySuggestions(false);
    if (match) {
      setCategory(match.category);
      setPotSize(`${match.potMm}mm (${match.potL}L)`);
    }
  };

  const selectPlantSuggestion = (suggestion: PlantSearchOption) => {
    applyLibraryPreset(suggestion.plantName);
    setVariety(suggestion.varietyName ?? '');
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
    setShowPlantSuggestions(false);
    setShowVarietySuggestions(false);
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
          <View style={{ flex: 1, minWidth: 0 }}>
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
            <Ionicons name="water" size={14} color={WARM_THEME.accent} />
            <Text style={styles.carePillText}>
              {p.lastWatered ? `Watered ${p.lastWatered}` : 'Water'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedPill} onPress={() => feedPlant(p.id)}>
            <Ionicons name="leaf" size={14} color={WARM_THEME.accentWarm} />
            <Text style={styles.feedPillText}>
              {p.lastFed ? `Fed ${p.lastFed}` : 'Feed'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => deletePlant(p.id)} style={{ marginLeft: 'auto' }}>
            <Ionicons name="trash-outline" size={18} color={WARM_THEME.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}><ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
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
            <Ionicons name="add" size={20} color={WARM_THEME.accentText} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.wrapRow}>
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
      </View>

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
              <View style={styles.wrapRow}>
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
              </View>

              {plants.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Match Spot & Pot From Existing Plants</Text>
                  <View style={styles.wrapRow}>
                    {plants.slice(0, 8).map(existing => (
                      <TouchableOpacity
                        key={existing.id}
                        style={styles.presetChip}
                        onPress={() => {
                          setName(existing.name);
                          setCategory(existing.category);
                          setSite(existing.site);
                          setPotSize(existing.potSize);
                        }}
                      >
                        <Text style={styles.presetChipText}>
                          {existing.variety} {existing.name} ({existing.site})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>Plant Name</Text>
              <TextInput
                placeholder="e.g. Tomato, Chilli, Sweet Basil"
                value={name}
                onChangeText={value => {
                  setName(value);
                  setShowPlantSuggestions(true);
                }}
                style={styles.input}
              />
              {showPlantSuggestions && name.trim().length > 0 && (
                <View style={styles.suggestionList}>
                  {plantSuggestions.length > 0 ? (
                    plantSuggestions.map(suggestion => (
                      <TouchableOpacity
                        key={suggestion.id}
                        style={styles.suggestionChip}
                        onPress={() => selectPlantSuggestion(suggestion)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${suggestion.label}`}
                      >
                        <Text style={styles.suggestionChipText}>{suggestion.label}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noSuggestionsText}>No matching plants or varieties.</Text>
                  )}
                </View>
              )}

              <Text style={styles.fieldLabel}>Variety</Text>
              <TextInput
                placeholder="e.g. Tommy Toe, Jalapeño, Genovese"
                value={variety}
                onChangeText={value => {
                  setVariety(value);
                  setShowVarietySuggestions(true);
                }}
                style={styles.input}
              />
              {showVarietySuggestions && variety.trim().length > 0 && (
                <View style={styles.suggestionList}>
                  {varietySuggestions.length > 0 ? (
                    varietySuggestions.map(suggestion => (
                      <TouchableOpacity
                        key={suggestion.id}
                        style={styles.suggestionChip}
                        onPress={() => selectPlantSuggestion(suggestion)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${suggestion.label}`}
                      >
                        <Text style={styles.suggestionChipText}>{suggestion.label}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noSuggestionsText}>No matching varieties.</Text>
                  )}
                </View>
              )}

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

              {plantsInSameSite.length > 0 && (
                <View style={styles.sameSiteBox}>
                  <Text style={styles.sameSiteTitle}>
                    Currently in {site} ({plantsInSameSite.reduce((sum, p) => sum + p.quantity, 0)}):
                  </Text>
                  <Text style={styles.sameSiteList}>
                    {plantsInSameSite
                      .map(p => `${p.quantity}× ${p.variety} ${p.name} (${p.potSize})`)
                      .join(' • ')}
                  </Text>
                </View>
              )}

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
                <View style={{ flex: 1, minWidth: 130 }}>
                  <Text style={styles.fieldLabel}>Quantity</Text>
                  <TextInput
                    value={quantityText}
                    onChangeText={setQuantityText}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 130 }}>
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
    </ScrollView></SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: WARM_THEME.background },
  container: { flex: 1, backgroundColor: WARM_THEME.background },
  content: { padding: WARM_THEME.spacingScreen, gap: 12, paddingBottom: 32 },
  header: {
    backgroundColor: WARM_THEME.accent,
    borderRadius: WARM_THEME.radiusCard,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tag: { color: WARM_THEME.accentSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: WARM_THEME.accentText, fontSize: 20, fontWeight: '800', marginTop: 2 },
  headerRight: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  toggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toggleBtnText: { color: WARM_THEME.accentText, fontSize: 12, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WARM_THEME.accentWarm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: WARM_THEME.accentText, fontSize: 13, fontWeight: '800' },
  filterChip: {
    backgroundColor: WARM_THEME.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: WARM_THEME.radiusPill,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  filterChipActive: { backgroundColor: WARM_THEME.accent, borderColor: WARM_THEME.accent },
  filterChipText: { fontSize: 12, fontWeight: '700', color: WARM_THEME.textSecondary },
  filterChipTextActive: { color: WARM_THEME.accentText },
  emptyBox: {
    backgroundColor: WARM_THEME.surface,
    borderRadius: WARM_THEME.radiusCard,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: WARM_THEME.textPrimary },
  zoneSection: { gap: 8 },
  zoneTitle: { fontSize: 15, fontWeight: '800', color: WARM_THEME.textPrimary, marginTop: 4 },
  plantCard: {
    backgroundColor: WARM_THEME.surface,
    borderRadius: WARM_THEME.radiusCard,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  cardTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  plantTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    color: WARM_THEME.textPrimary,
  },
  sci: { fontSize: 12, color: WARM_THEME.textSecondary, marginTop: 2 },
  stageBadge: {
    backgroundColor: WARM_THEME.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stageText: { fontSize: 11, fontWeight: '800', color: WARM_THEME.accentText },
  feedNote: { fontSize: 12, color: WARM_THEME.textSecondary, lineHeight: 17 },
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
    backgroundColor: WARM_THEME.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBtnText: { fontSize: 16, fontWeight: '800', color: WARM_THEME.textPrimary },
  qtyLabel: { fontSize: 12, fontWeight: '700', color: WARM_THEME.textSecondary, marginHorizontal: 2 },
  carePill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WARM_THEME.accentSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  carePillText: { fontSize: 11, fontWeight: '700', color: WARM_THEME.accent },
  feedPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WARM_THEME.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  feedPillText: { fontSize: 11, fontWeight: '700', color: WARM_THEME.accentWarm },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', padding: 18 },
  modalCard: {
    backgroundColor: WARM_THEME.surface,
    borderRadius: WARM_THEME.radiusCard,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: WARM_THEME.textPrimary },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: WARM_THEME.textSecondary },
  presetChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  presetChipActive: { backgroundColor: WARM_THEME.accent },
  presetChipText: { fontSize: 12, fontWeight: '600', color: WARM_THEME.textSecondary },
  presetChipTextActive: { color: WARM_THEME.accentText },
  suggestionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: WARM_THEME.radiusPill,
    backgroundColor: WARM_THEME.surfaceMuted,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  suggestionChipText: { fontSize: 12, fontWeight: '600', color: WARM_THEME.textPrimary },
  noSuggestionsText: { fontSize: 12, color: WARM_THEME.textSecondary },
  sameSiteBox: {
    backgroundColor: WARM_THEME.surfaceMuted,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 3,
  },
  sameSiteTitle: { fontSize: 12, fontWeight: '700', color: WARM_THEME.textPrimary },
  sameSiteList: { fontSize: 12, color: WARM_THEME.textSecondary, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: WARM_THEME.textPrimary,
    backgroundColor: WARM_THEME.surface,
  },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choicePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    backgroundColor: WARM_THEME.surfaceMuted,
  },
  choicePillActive: { backgroundColor: WARM_THEME.accent, borderColor: WARM_THEME.accent },
  choicePillText: { fontSize: 12, fontWeight: '600', color: WARM_THEME.textSecondary },
  choicePillTextActive: { color: WARM_THEME.accentText },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  warningBox: {
    backgroundColor: WARM_THEME.surfaceMuted,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: WARM_THEME.accentWarm,
    gap: 4,
  },
  warningText: { fontSize: 12, color: WARM_THEME.accentWarm, lineHeight: 16 },
  buddyBox: {
    backgroundColor: WARM_THEME.accentSoft,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
    gap: 4,
  },
  buddyText: { fontSize: 12, color: WARM_THEME.accent, lineHeight: 16 },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WARM_THEME.border,
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: WARM_THEME.textSecondary },
  saveBtn: {
    backgroundColor: WARM_THEME.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  saveText: { fontSize: 13, fontWeight: '800', color: WARM_THEME.accentText },
});