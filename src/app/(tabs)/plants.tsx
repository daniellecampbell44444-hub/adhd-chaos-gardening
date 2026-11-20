import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGarden, PLANT_LIBRARY, getSmartFeed, Category, Stage } from '../../context/GardenContext';

const SITES = ['Raised Beds', 'Pots', 'Standing Bed', 'Front Yard', 'In-Ground'];
const CATEGORIES: Category[] = ['Vegetable', 'Chilli', 'Fruit', 'Leafy', 'Herb'];
const STAGES: Stage[] = ['Seedling', 'Growing', 'Flowering', 'Fruiting', 'Dormant'];

export default function PlantsScreen() {
  const { plants, fertilizers, addPlant, updatePlantQty, cyclePlantStage, deletePlant, waterPlant, feedPlant } = useGarden();
  const [view, setView] = useState<'plants' | 'sites'>('plants');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);

  const [name, setName] = useState('');
  const [variety, setVariety] = useState('');
  const [scientific, setScientific] = useState('');
  const [category, setCategory] = useState<Category>('Vegetable');
  const [qty, setQty] = useState('1');
  const [site, setSite] = useState('Raised Beds');
  const [stage, setStage] = useState<Stage>('Seedling');
  const [potSize, setPotSize] = useState('350mm (20L)');
  const [idealTemp, setIdealTemp] = useState('18–30°C');

  const quickFill = (libId: string) => {
    const m = PLANT_LIBRARY.find(x => x.id === libId);
    if (!m) return;
    setName(m.name); setScientific(m.scientific); setCategory(m.category);
    setPotSize(`${m.potMm}mm (${m.potL}L)`); setIdealTemp(`${m.tempMin}–${m.tempMax}°C`);
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    addPlant({
      name: name.trim(),
      variety: variety.trim() || 'Standard',
      scientific: scientific.trim(),
      category,
      quantity: Math.max(1, Number(qty) || 1),
      site,
      stage,
      potSize,
      idealTemp,
      waterEveryDays: 2,
    });
    setName(''); setVariety(''); setScientific(''); setQty('1'); setModal(false);
  };

  const filtered = plants.filter(p =>
    `${p.name} ${p.variety} ${p.site}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.segment}>
          <TouchableOpacity style={[styles.segBtn, view === 'plants' && styles.segActive]} onPress={() => setView('plants')}>
            <Text style={[styles.segText, view === 'plants' && styles.segTextActive]}>My Plants ({plants.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segBtn, view === 'sites' && styles.segActive]} onPress={() => setView('sites')}>
            <Text style={[styles.segText, view === 'sites' && styles.segTextActive]}>Sites</Text>
          </TouchableOpacity>
        </View>
        <TextInput placeholder="Search plants, varieties, sites..." value={search} onChangeText={setSearch} style={styles.search} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {view === 'plants' ? (
          filtered.map(p => {
            const smart = getSmartFeed(p, fertilizers);
            return (
              <View key={p.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.plantName}>{p.name} <Text style={styles.varietyTag}>• {p.variety}</Text></Text>
                    {!!p.scientific && <Text style={styles.sci}>{p.scientific}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => cyclePlantStage(p.id)} style={styles.stageBadge}>
                    <Text style={styles.stageText}>{p.stage} ↻</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaChip}>📍 {p.site}</Text>
                  <Text style={styles.metaChip}>🪴 {p.potSize}</Text>
                  <Text style={styles.metaChip}>🌡️ {p.idealTemp}</Text>
                </View>

                <View style={styles.smartPill}>
                  <Text style={styles.smartText}>✨ Smart Feed: {smart.primary ? smart.primary.name : smart.note}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.qtyBox}>
                    <TouchableOpacity onPress={() => updatePlantQty(p.id, -1)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>−</Text></TouchableOpacity>
                    <Text style={styles.qtyVal}>{p.quantity}</Text>
                    <TouchableOpacity onPress={() => updatePlantQty(p.id, 1)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => waterPlant(p.id)} style={styles.miniBtn}>
                      <Text style={styles.miniBtnText}>💧 {p.lastWatered ? 'Done' : 'Water'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => feedPlant(p.id)} style={styles.miniBtn}>
                      <Text style={styles.miniBtnText}>🌿 {p.lastFed ? 'Fed' : 'Feed'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deletePlant(p.id)} style={[styles.miniBtn, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="trash-outline" size={14} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          SITES.map(s => {
            const items = filtered.filter(p => p.site === s);
            const count = items.reduce((sum, p) => sum + p.quantity, 0);
            return (
              <View key={s} style={styles.card}>
                <Text style={styles.plantName}>{s} ({count} plants)</Text>
                {items.length === 0 ? <Text style={styles.sci}>No plants in this site yet.</Text> : items.map(p => (
                  <Text key={p.id} style={styles.siteItem}>• {p.quantity}× {p.name} ({p.variety}) — {p.stage}</Text>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Plant & Variety</Text>
            <Text style={styles.label}>Quick-Fill from Western Sydney Guide:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              {PLANT_LIBRARY.map(l => (
                <TouchableOpacity key={l.id} onPress={() => quickFill(l.id)} style={styles.quickChip}>
                  <Text style={styles.quickText}>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput placeholder="Plant Name (e.g. Tomato)" value={name} onChangeText={setName} style={styles.input} />
            <TextInput placeholder="Variety (e.g. Tommy Toe, Black Krim)" value={variety} onChangeText={setVariety} style={styles.input} />
            <TextInput placeholder="Quantity (e.g. 4)" value={qty} onChangeText={setQty} keyboardType="numeric" style={styles.input} />
            <Text style={styles.label}>Site:</Text>
            <View style={styles.chipWrap}>
              {SITES.map(s => (
                <TouchableOpacity key={s} onPress={() => setSite(s)} style={[styles.choice, site === s && styles.choiceOn]}>
                  <Text style={site === s ? styles.choiceOnText : styles.choiceText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Category & Stage:</Text>
            <View style={styles.chipWrap}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.choice, category === c && styles.choiceOn]}>
                  <Text style={category === c ? styles.choiceOnText : styles.choiceText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.chipWrap}>
              {STAGES.map(st => (
                <TouchableOpacity key={st} onPress={() => setStage(st)} style={[styles.choice, stage === st && styles.choiceOn]}>
                  <Text style={stage === st ? styles.choiceOnText : styles.choiceText}>{st}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalRow}>
              <TouchableOpacity onPress={() => setModal(false)} style={styles.cancelBtn}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAdd} style={styles.saveBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>Save Plant</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  topBar: { padding: 12, gap: 8, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#dcfce7' },
  segment: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segActive: { backgroundColor: '#15803d' },
  segText: { fontWeight: '700', color: '#475569' },
  segTextActive: { color: '#ffffff' },
  search: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  list: { padding: 14, gap: 12, paddingBottom: 90 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dcfce7', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  plantName: { fontSize: 17, fontWeight: '800', color: '#14532d' },
  varietyTag: { fontSize: 14, fontWeight: '600', color: '#15803d' },
  sci: { fontSize: 12, fontStyle: 'italic', color: '#64748b' },
  stageBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stageText: { fontSize: 12, fontWeight: '700', color: '#14532d' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 12, color: '#334155' },
  smartPill: { backgroundColor: '#ecfdf5', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#a7f3d0' },
  smartText: { fontSize: 12, color: '#065f46', fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10 },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  qtyBtnText: { fontSize: 16, fontWeight: '800', color: '#14532d' },
  qtyVal: { fontWeight: '800', paddingHorizontal: 6, color: '#0f172a' },
  miniBtn: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  miniBtnText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  siteItem: { fontSize: 14, color: '#334155', marginTop: 4 },
  fab: { position: 'absolute', right: 18, bottom: 18, backgroundColor: '#15803d', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#14532d' },
  label: { fontSize: 12, fontWeight: '700', color: '#475569' },
  quickChip: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginRight: 6 },
  quickText: { fontSize: 12, fontWeight: '700', color: '#14532d' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, fontSize: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f5f9' },
  choiceOn: { backgroundColor: '#15803d' },
  choiceText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  choiceOnText: { fontSize: 12, color: '#ffffff', fontWeight: '700' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  saveBtn: { backgroundColor: '#15803d', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
});
