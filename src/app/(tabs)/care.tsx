import React, { useState, useEffect } from 'react';
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
  getWateringDueInfo,
  AUSSIE_FERT_PRESETS,
  PLANT_LIBRARY,
  SoilCareType,
  ScratchpadTag,
  PreservationMethod,
  WeatherMode,
} from '../../context/GardenContext';
import { TROUBLE_GUIDE, TroubleCategory } from '../../data/troubleGuide';
import { useSubscription } from "../../utils/useSubscription";

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
const SCRATCHPAD_TAGS: ScratchpadTag[] = ['Pest / Leaf', 'Water / Sun', 'Harvest / Kitchen', 'Idea / To-Do'];
const PRESERVATION_METHODS: PreservationMethod[] = ['Dehydrating', 'Canning', 'Pickling', 'Freezing / Jam'];
const WEATHER_MODES: WeatherMode[] = ['Normal', 'Hot / Dry Spell', 'Rain Day'];

export default function CareScreen() {
  const { isPro, canExportData, setTestProEnabled } = useSubscription(false);
  const {
    plants,
    fertilizers,
    soilLogs,
    reminders,
    scratchpadNotes,
    preservationBatches,
    draftPreservation,
    weatherMode,
    setWeatherMode,
    waterPlant,
    waterDuePlants,
    waterDuePots,
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
    addScratchpadNote,
    toggleScratchpadPin,
    deleteScratchpadNote,
    addPreservationBatch,
    deletePreservationBatch,
    clearDraftPreservation,
    addHarvest,
  } = useGarden();

  const [dueOnlyFilter, setDueOnlyFilter] = useState(false);
  const [selectedTroubleCategory, setSelectedTroubleCategory] = useState<'All' | TroubleCategory>('All');
  const [expandedTroubleId, setExpandedTroubleId] = useState<string | null>(TROUBLE_GUIDE[0].id);

  const [soilModalVisible, setSoilModalVisible] = useState(false);
  const [soilSite, setSoilSite] = useState('Raised Beds');
  const [careType, setCareType] = useState<SoilCareType>('Mulch Top-Up');
  const [material, setMaterial] = useState('Sugarcane Mulch');
  const [amountLabel, setAmountLabel] = useState('5cm layer');
  const [phEstimate, setPhEstimate] = useState('6.5');
  const [soilNotes, setSoilNotes] = useState('');
  const [scratchpadText, setScratchpadText] = useState('');
  const [scratchpadTag, setScratchpadTag] = useState<ScratchpadTag>('Pest / Leaf');
  const [scratchpadSite, setScratchpadSite] = useState<string>('Pots');
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchMethodFilter, setBatchMethodFilter] = useState<'All' | PreservationMethod>('All');
  const [batchProduce, setBatchProduce] = useState('Chillies');
  const [batchMethod, setBatchMethod] = useState<PreservationMethod>('Dehydrating');
  const [batchYield, setBatchYield] = useState('2 trays / 180g dried');
  const [batchProcessNote, setBatchProcessNote] = useState('55°C until crisp');
  const [batchScrapNote, setBatchScrapNote] = useState('Blended into chilli powder');

  useEffect(() => {
    if (draftPreservation) {
      setBatchProduce(draftPreservation.produce);
      setBatchMethod(draftPreservation.method);
      setBatchYield(draftPreservation.yieldLabel);
      setBatchProcessNote(draftPreservation.processNote || '');
      setBatchScrapNote(draftPreservation.scrapNote || '');
      setBatchModalVisible(true);
      clearDraftPreservation();
    }
  }, [draftPreservation]);

  const duePlants = plants.filter(p => getWateringDueInfo(p, weatherMode).isDue);
  const dueCount = duePlants.length;
  const duePotsCount = duePlants.filter(
    p => p.site.toLowerCase().includes('pot') || p.site.toLowerCase().includes('bag')
  ).length;
  const dueBedsCount = Math.max(0, dueCount - duePotsCount);
  const visiblePlants = dueOnlyFilter ? duePlants : plants;

  const weatherBannerText =
    weatherMode === 'Hot / Dry Spell'
      ? 'Hot / Dry Spell active: pot intervals tighten so containers don’t dry out; deep-soak at dawn and shade western sun.'
      : weatherMode === 'Rain Day'
        ? 'Rain Day active: outdoor beds are rain-buffered—skip routine bed watering, but still check pots under eaves or shade.'
        : 'Normal weather cadence: watering due status follows each plant’s interval and last watered date.';

  const visibleTroubles =
    selectedTroubleCategory === 'All'
      ? TROUBLE_GUIDE
      : TROUBLE_GUIDE.filter(item => item.category === selectedTroubleCategory);

  const handleCreateTroubleReminder = (title: string) => {
    addReminder(title, 'Today — Check Garden');
    Alert.alert('Reminder added', 'Added to your reminders list.');
  };

  const sortedScratchpadNotes = [...scratchpadNotes].sort(
    (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
  );

  const handleQuickScratchpadAdd = () => {
    if (!scratchpadText.trim()) return;
    addScratchpadNote(scratchpadText, scratchpadTag, scratchpadSite);
    setScratchpadText('');
  };

  const visibleBatches =
    batchMethodFilter === 'All'
      ? preservationBatches
      : preservationBatches.filter(b => b.method === batchMethodFilter);

  const handleQuickHarvestFromBatch = (produce: string, yieldLabel: string) => {
    const kgMatch = yieldLabel.match(/(\d+(?:\.\d+)?)\s*kg/i);
    const gMatch = yieldLabel.match(/(\d+(?:\.\d+)?)\s*g\b/i);
    let grams = 500;
    if (kgMatch) {
      grams = Math.max(50, Math.round(Number(kgMatch[1]) * 1000));
    } else if (gMatch) {
      grams = Math.max(50, Math.round(Number(gMatch[1])));
    }
    const libMatch = PLANT_LIBRARY.find(
      item =>
        produce.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(produce.toLowerCase())
    );
    const ratePerKg = libMatch?.audPerKg || 9.0;
    const estValue = Number(((grams / 1000) * ratePerKg).toFixed(2));
    addHarvest(produce, grams, estValue);
    Alert.alert(
      "Harvest logged",
      `Logged ${grams}g of ${produce} (est. ${estValue.toFixed(2)} AUD).`
    );
  };

  const handleSaveBatchLog = () => {
    if (!batchProduce.trim()) {
      Alert.alert('Missing produce', 'Enter what crop or harvest batch you preserved.');
      return;
    }
    addPreservationBatch({
      produce: batchProduce.trim(),
      method: batchMethod,
      yieldLabel: batchYield.trim() || '1 batch',
      processNote: batchProcessNote.trim() || undefined,
      scrapNote: batchScrapNote.trim() || undefined,
    });
    setBatchModalVisible(false);
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
          <Text style={styles.tag}>SMART CARE, WEATHER & SOIL</Text>
          <Text style={styles.title}>Care, Water & Soil</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.waterBtn} onPress={waterDuePlants}>
            <Ionicons name="water" size={15} color="#ffffff" />
            <Text style={styles.btnText}>Water Due ({dueCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.feedBtn} onPress={feedAll}>
            <Ionicons name="leaf" size={15} color="#ffffff" />
            <Text style={styles.btnText}>Feed All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Watering Due Status & Hot-Weather vs Rain-Day Helper */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Watering Weather & Due Helper</Text>
          <Text style={[styles.badgeText, dueCount > 0 && styles.dueAlertBadge]}>
            {duePotsCount} pots • {dueBedsCount} beds due
          </Text>
        </View>

        <View style={styles.wrapRow}>
          {WEATHER_MODES.map(mode => {
            const active = weatherMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.choicePill, active && styles.choicePillActive]}
                onPress={() => setWeatherMode(mode)}
              >
                <Text
                  style={[
                    styles.choicePillText,
                    active && styles.choicePillTextActive,
                  ]}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.weatherNote}>{weatherBannerText}</Text>

        <View style={styles.rowBetween}>
          <View style={styles.rowGap}>
            <TouchableOpacity style={styles.dueActionBtn} onPress={waterDuePlants}>
              <Text style={styles.dueActionBtnText}>Water Due ({dueCount})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.potActionBtn} onPress={waterDuePots}>
              <Text style={styles.potActionBtnText}>Due Pots ({duePotsCount})</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={waterAll}>
            <Text style={styles.linkText}>Water All ({plants.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Plant Care & Smart Feed */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>
            Plant Care & Smart Feed ({visiblePlants.length}/{plants.length})
          </Text>
          <TouchableOpacity
            style={[styles.filterToggle, dueOnlyFilter && styles.filterToggleActive]}
            onPress={() => setDueOnlyFilter(prev => !prev)}
          >
            <Text
              style={[
                styles.filterToggleText,
                dueOnlyFilter && styles.filterToggleTextActive,
              ]}
            >
              {dueOnlyFilter ? 'Showing Due Only' : 'Due Only'}
            </Text>
          </TouchableOpacity>
        </View>

        {visiblePlants.length === 0 ? (
          <Text style={styles.sub}>
            {dueOnlyFilter
              ? 'No plants are due right now under this weather mode.'
              : 'No plants yet. Add plants on the Plants tab or load sample data on Pulse.'}
          </Text>
        ) : (
          visiblePlants.map(p => {
            const feed = getSmartFeed(p, fertilizers);
            const dueInfo = getWateringDueInfo(p, weatherMode);
            return (
              <View key={p.id} style={styles.plantRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.itemTitle}>
                      {p.variety} {p.name} ({p.quantity})
                    </Text>
                    <Text
                      style={[
                        styles.duePill,
                        dueInfo.isDue ? styles.duePillActive : styles.duePillCalm,
                      ]}
                    >
                      {dueInfo.statusLabel}
                    </Text>
                  </View>
                  <Text style={styles.sub}>
                    {p.site} • {p.stage} • {dueInfo.reason}
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

      {/* Quick Garden Observation Scratchpad */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Quick Yard Scratchpad ({scratchpadNotes.length})</Text>
          <Text style={styles.badgeText}>Fast Notes</Text>
        </View>
        <Text style={styles.sub}>
          Jot down quick observations while walking the pots or raised beds—pin key notes or turn one into a reminder.
        </Text>

        <View style={styles.wrapRow}>
          {SCRATCHPAD_TAGS.map(tag => {
            const active = scratchpadTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.choicePill, active && styles.choicePillActive]}
                onPress={() => setScratchpadTag(tag)}
              >
                <Text style={[styles.choicePillText, active && styles.choicePillTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.wrapRow}>
          {SOIL_SITES.map(spot => {
            const active = scratchpadSite === spot;
            return (
              <TouchableOpacity
                key={spot}
                style={[styles.miniSpotChip, active && styles.miniSpotChipActive]}
                onPress={() => setScratchpadSite(active ? '' : spot)}
              >
                <Text style={[styles.miniSpotText, active && styles.miniSpotTextActive]}>
                  {spot}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.scratchInputRow}>
          <TextInput
            value={scratchpadText}
            onChangeText={setScratchpadText}
            placeholder="e.g. Curled tip on Jalapeño pot, check for mites..."
            style={[styles.input, { flex: 1 }]}
            onSubmitEditing={handleQuickScratchpadAdd}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleQuickScratchpadAdd}>
            <Text style={styles.saveText}>Jot</Text>
          </TouchableOpacity>
        </View>

        {sortedScratchpadNotes.length === 0 ? (
          <Text style={styles.sub}>No yard notes yet. Type a quick observation above and tap Jot.</Text>
        ) : (
          sortedScratchpadNotes.map(note => (
            <View key={note.id} style={styles.scratchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {note.pinned ? '📌 ' : ''}
                  {note.text}
                </Text>
                <Text style={styles.sub}>
                  {note.tag}
                  {note.site ? ` • ${note.site}` : ''} • {note.date}
                </Text>
              </View>
              <View style={styles.rowGap}>
                <TouchableOpacity
                  style={styles.miniActionPill}
                  onPress={() => toggleScratchpadPin(note.id)}
                >
                  <Text style={styles.miniActionText}>{note.pinned ? 'Unpin' : 'Pin'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.miniActionPill}
                  onPress={() => handleCreateTroubleReminder(note.text)}
                >
                  <Text style={styles.miniActionText}>+ Remind</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteScratchpadNote(note.id)}>
                  <Text style={styles.del}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Preservation & Bulk Harvest Batch Log */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Preservation & Bulk Batches ({preservationBatches.length})</Text>
          <TouchableOpacity style={styles.presetBtn} onPress={() => setBatchModalVisible(true)}>
            <Text style={styles.presetBtnText}>+ Log Batch</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sub}>
          Track dehydrating trays, canning jars, pickling brines, bulk harvest weights, and scrap/peel repurposing.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {(['All', ...PRESERVATION_METHODS] as const).map(method => {
            const active = batchMethodFilter === method;
            return (
              <TouchableOpacity
                key={method}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setBatchMethodFilter(method)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {method}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {visibleBatches.length === 0 ? (
          <Text style={styles.sub}>
            No preservation runs logged in this view yet. Tap + Log Batch to record a run.
          </Text>
        ) : (
          visibleBatches.map(batch => (
            <View key={batch.id} style={styles.soilRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {batch.method} • {batch.produce}
                </Text>
                <Text style={styles.sub}>
                  {batch.yieldLabel} • {batch.date}
                </Text>
                {batch.processNote ? <Text style={styles.feedNote}>Run: {batch.processNote}</Text> : null}
                {batch.scrapNote ? <Text style={styles.notesItalic}>Zero-waste / scrap: {batch.scrapNote}</Text> : null}
              </View>
              <View style={styles.rowGap}>
                <TouchableOpacity
                  style={styles.miniActionPill}
                  onPress={() => handleQuickHarvestFromBatch(batch.produce, batch.yieldLabel)}
                >
                  <Text style={styles.miniActionText}>+ Harvest</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deletePreservationBatch(batch.id)}>
                  <Text style={styles.del}>✕</Text>
                </TouchableOpacity>
              </View>
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

      {/* Log Preservation / Bulk Harvest Batch Modal */}
      <Modal visible={batchModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Log Preservation or Bulk Batch</Text>

              <Text style={styles.fieldLabel}>Method</Text>
              <View style={styles.wrapRow}>
                {PRESERVATION_METHODS.map(method => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.choicePill, batchMethod === method && styles.choicePillActive]}
                    onPress={() => setBatchMethod(method)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        batchMethod === method && styles.choicePillTextActive,
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Crop / Harvest Item</Text>
              <TextInput
                value={batchProduce}
                onChangeText={setBatchProduce}
                placeholder="e.g. Chillies, Potatoes, Pineapples, Pickling Cucumbers"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Batch Output / Weight / Jars</Text>
              <TextInput
                value={batchYield}
                onChangeText={setBatchYield}
                placeholder="e.g. 6 jars, 16kg sliced, 4 trays"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Temp / Time / Brine Note (Optional)</Text>
              <TextInput
                value={batchProcessNote}
                onChangeText={setBatchProcessNote}
                placeholder="e.g. 55°C for 8h, brown sugar brine, water-bath"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Zero-Waste / Peel or Scrap Use (Optional)</Text>
              <TextInput
                value={batchScrapNote}
                onChangeText={setBatchScrapNote}
                placeholder="e.g. Candied rind, mash powder, scrap jelly"
                style={styles.input}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setBatchModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBatchLog}>
                  <Text style={styles.saveText}>Save Batch</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

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
    
        {/* Pro Feature Gate Example (canExportData) */}
        <View
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 14,
            backgroundColor: "#f0fdf4",
            borderWidth: 1,
            borderColor: "#bbf7d0",
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#14532d" }}>
            {canExportData ? "Export Logs (Pro Active)" : "Export Logs (Pro)"}
          </Text>
          <Text style={{ fontSize: 12, color: "#166534" }}>
            {canExportData
              ? "Pro access is active — ready to export your care, dehydrator, and canning logs."
              : "Upgrade to Pro to export care logs, dehydrator runs, and preservation batches."}
          </Text>
          {!canExportData ? (
            <TouchableOpacity
              onPress={() => setTestProEnabled(true)}
              style={{
                alignSelf: "flex-start",
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: "#15803d",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                Enable Dev Test Pro
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setTestProEnabled(false)}>
              <Text style={{ fontSize: 11, color: "#475569", fontWeight: "700" }}>
                Reset dev Pro preview
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  rowGap: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
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
  dueAlertBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  weatherNote: { fontSize: 12, color: '#334155', lineHeight: 17 },
  dueActionBtn: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  dueActionBtnText: { fontSize: 12, fontWeight: '800', color: '#0369a1' },
  potActionBtn: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  potActionBtnText: { fontSize: 12, fontWeight: '800', color: '#92400e' },
  filterToggle: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterToggleActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  filterToggleText: { fontSize: 11, fontWeight: '800', color: '#334155' },
  filterToggleTextActive: { color: '#ffffff' },
  linkText: { fontSize: 12, fontWeight: '800', color: '#15803d' },
  itemTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  duePill: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  duePillActive: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  duePillCalm: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
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
  miniSpotChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  miniSpotChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  miniSpotText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  miniSpotTextActive: { color: '#14532d' },
  scratchInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scratchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  miniActionPill: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  miniActionText: { fontSize: 11, fontWeight: '800', color: '#15803d' },
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
