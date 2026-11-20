import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useGarden, PLANT_LIBRARY } from '../../context/GardenContext';

const DIAGNOSES: Record<string, { issue: string; fix: string }[]> = {
  Leaves: [
    { issue: 'Yellow lower leaves', fix: 'Likely nitrogen deficiency or overwatering. Check soil moisture 5cm down; feed liquid seaweed + nitrogen.' },
    { issue: 'White powdery coating', fix: 'Powdery mildew (common in Western Sydney humidity). Water soil only in mornings; spray 1:9 milk-to-water or Eco-Fungicide.' },
    { issue: 'Silvery trails on citrus leaves', fix: 'Citrus leafminer. Spray Eco-Oil on new flush growth every 10 days.' },
  ],
  Fruit: [
    { issue: 'Black sunken bottom on tomatoes/capsicums', fix: 'Blossom End Rot from uneven watering. Mulch heavily, water consistently at dawn, add calcium/gypsum.' },
    { issue: 'Stings or maggots in fruit', fix: 'Queensland Fruit Fly (active Oct–May in Western Sydney). Bag fruit early or hang Eco-Lure traps.' },
  ],
  Pests: [
    { issue: 'Clusters of green/black bugs on new tips', fix: 'Aphids. Blast off with hose water or spray pyrethrum/Eco-Oil at dusk.' },
    { issue: 'Holes in Bok Choy / brassicas', fix: 'Cabbage white butterfly caterpillars. Cover with fine netting or spray Dipel (organic Bt).' },
  ],
  'Whole Plant': [
    { issue: 'Drooping on 38°C afternoon', fix: 'Heat stress. Shade with 30% cloth and deep soak root zone at dawn; do not fertilise until temp drops.' },
    { issue: 'Blackened soft tips after winter night', fix: 'Frost burn. Wait until spring to prune dead tips so they shield lower stems.' },
  ],
};

export default function GuideScreen() {
  const { addPlant } = useGarden();
  const [sub, setSub] = useState<'library' | 'diagnose'>('library');
  const [search, setSearch] = useState('');
  const [part, setPart] = useState<string>('Leaves');

  const filtered = PLANT_LIBRARY.filter(p =>
    `${p.name} ${p.category} ${p.scientific}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        <TouchableOpacity onPress={() => setSub('library')} style={[styles.segBtn, sub === 'library' && styles.segOn]}>
          <Text style={[styles.segText, sub === 'library' && styles.segOnText]}>Pot & Temp Guide</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSub('diagnose')} style={[styles.segBtn, sub === 'diagnose' && styles.segOn]}>
          <Text style={[styles.segText, sub === 'diagnose' && styles.segOnText]}>Symptom Diagnoser</Text>
        </TouchableOpacity>
      </View>

      {sub === 'library' ? (
        <ScrollView contentContainerStyle={styles.list}>
          <TextInput placeholder="Search Western Sydney crops..." value={search} onChangeText={setSearch} style={styles.search} />
          {filtered.map(p => (
            <View key={p.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{p.name}</Text>
                  <Text style={styles.sci}>{p.scientific} • {p.category}</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => {
                  addPlant({
                    name: p.name, variety: 'Standard', scientific: p.scientific, category: p.category,
                    quantity: 1, site: 'Pots', stage: 'Seedling', potSize: `${p.potMm}mm (${p.potL}L)`,
                    idealTemp: `${p.tempMin}–${p.tempMax}°C`, waterEveryDays: 2,
                  });
                  Alert.alert('Added!', `${p.name} added to My Plants.`);
                }}>
                  <Text style={styles.addBtnText}>+ Garden</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.badge}>🪴 Best Pot: {p.potMm}mm ({p.potL}L)   •   🌡️ Ideal: {p.tempMin}–{p.tempMax}°C</Text>
              <Text style={styles.tip}>☀️ Heat (&gt;38°C): {p.heatTip}</Text>
              <Text style={styles.tip}>❄️ Frost (&lt;4°C): {p.frostTip}</Text>
              <Text style={styles.comp}>🤝 Friends: {p.friends.join(', ')}  |  🚫 Avoid: {p.enemies.join(', ')}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.partRow}>
            {Object.keys(DIAGNOSES).map(k => (
              <TouchableOpacity key={k} onPress={() => setPart(k)} style={[styles.partChip, part === k && styles.partChipOn]}>
                <Text style={part === k ? styles.partTextOn : styles.partText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {DIAGNOSES[part].map(d => (
            <View key={d.issue} style={styles.card}>
              <Text style={styles.title}>🩺 {d.issue}</Text>
              <Text style={styles.tip}>{d.fix}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  segment: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 10, gap: 6, borderBottomWidth: 1, borderColor: '#dcfce7' },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#f1f5f9' },
  segOn: { backgroundColor: '#15803d' },
  segText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  segOnText: { color: '#ffffff' },
  list: { padding: 14, gap: 12, paddingBottom: 40 },
  search: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dcfce7', gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', color: '#14532d' },
  sci: { fontSize: 12, fontStyle: 'italic', color: '#64748b' },
  addBtn: { backgroundColor: '#15803d', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  badge: { fontSize: 12, fontWeight: '700', color: '#065f46', backgroundColor: '#ecfdf5', padding: 8, borderRadius: 8 },
  tip: { fontSize: 13, color: '#334155', lineHeight: 19 },
  comp: { fontSize: 12, color: '#475569', fontWeight: '600', marginTop: 2 },
  partRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  partChip: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#cbd5e1' },
  partChipOn: { backgroundColor: '#15803d', borderColor: '#15803d' },
  partText: { fontWeight: '700', color: '#334155', fontSize: 13 },
  partTextOn: { fontWeight: '700', color: '#ffffff', fontSize: 13 },
});
