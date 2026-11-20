import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGarden } from '../../context/GardenContext';

const SEASONS: Record<string, { range: string; tip: string }> = {
  Spring: { range: '11–26°C', tip: 'Prime planting for tomatoes, chillies & cucumbers. Watch late Sept chilly nights.' },
  Summer: { range: '18–40°C+', tip: '30% shade cloth on >38°C days. Water pots at dawn; pause granular fertiliser >35°C.' },
  Autumn: { range: '11–25°C', tip: 'Best time to sow spinach, bok choy, carrots, beetroot & snow peas.' },
  Winter: { range: '2–17°C', tip: 'Light frosts possible in Western Sydney. Protect chillies & young citrus overnight.' },
};

export default function PulseScreen() {
  const { plants, harvests, expenses, waterAll, feedAll, addHarvest, addExpense, loadSampleGarden } = useGarden();
  const [season, setSeason] = useState<'Spring' | 'Summer' | 'Autumn' | 'Winter'>('Spring');
  const [modal, setModal] = useState<'none' | 'harvest' | 'expense'>('none');
  const [crop, setCrop] = useState('');
  const [grams, setGrams] = useState('');
  const [expItem, setExpItem] = useState('');
  const [expCost, setExpCost] = useState('');

  const totalPlants = plants.reduce((s, p) => s + p.quantity, 0);
  const uniqueVarieties = new Set(plants.map(p => `${p.name}-${p.variety}`)).size;
  const totalGrams = harvests.reduce((s, h) => s + h.grams, 0);
  const totalEarned = harvests.reduce((s, h) => s + h.valueAud, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.costAud, 0);
  const netSaved = totalEarned - totalSpent;
  const readyToPick = plants.filter(p => p.stage === 'Fruiting');

  const saveHarvest = () => {
    if (!crop.trim() || !Number(grams)) return;
    addHarvest(crop.trim(), Number(grams));
    setCrop(''); setGrams(''); setModal('none');
  };

  const saveExpense = () => {
    if (!expItem.trim() || !Number(expCost)) return;
    addExpense(expItem.trim(), 'Garden', Number(expCost));
    setExpItem(''); setExpCost(''); setModal('none');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTag}>WESTERN SYDNEY • NSW</Text>
        <Text style={styles.heroTitle}>ADHD Chaos Gardening</Text>
        <Text style={styles.heroSub}>{SEASONS[season].range} • {SEASONS[season].tip}</Text>
        <View style={styles.seasonRow}>
          {(['Spring', 'Summer', 'Autumn', 'Winter'] as const).map(s => (
            <TouchableOpacity key={s} onPress={() => setSeason(s)} style={[styles.seasonPill, season === s && styles.seasonPillActive]}>
              <Text style={[styles.seasonText, season === s && styles.seasonTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { waterAll(); Alert.alert('Watered!', 'All plants logged as watered today.'); }}>
          <Ionicons name="water" size={20} color="#0284c7" />
          <Text style={styles.actionLabel}>Water All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { feedAll(); Alert.alert('Fed!', 'All active plants logged as fed today.'); }}>
          <Ionicons name="leaf" size={20} color="#15803d" />
          <Text style={styles.actionLabel}>Bulk Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('harvest')}>
          <Ionicons name="basket" size={20} color="#d97706" />
          <Text style={styles.actionLabel}>Log Yield</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('expense')}>
          <Ionicons name="cash" size={20} color="#7c3aed" />
          <Text style={styles.actionLabel}>Expense</Text>
        </TouchableOpacity>
      </View>

      {readyToPick.length > 0 && (
        <View style={styles.harvestBanner}>
          <Text style={styles.bannerTitle}>READY TO HARVEST ({readyToPick.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {readyToPick.map(p => (
              <TouchableOpacity key={p.id} style={styles.pickChip} onPress={() => { setCrop(`${p.variety} ${p.name}`); setModal('harvest'); }}>
                <Text style={styles.pickChipText}>{p.variety} {p.name} → Pick</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.statNum}>{totalPlants}</Text>
          <Text style={styles.statLabel}>Active Plants</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.statNum}>{uniqueVarieties}</Text>
          <Text style={styles.statLabel}>Varieties</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.statNum}>{totalGrams >= 1000 ? `${(totalGrams / 1000).toFixed(2)}kg` : `${totalGrams}g`}</Text>
          <Text style={styles.statLabel}>Total Harvest</Text>
        </View>
        <View style={styles.card}>
          <Text style={[styles.statNum, { color: netSaved >= 0 ? '#15803d' : '#dc2626' }]}>
            {netSaved >= 0 ? `$${netSaved.toFixed(2)}` : `-$${Math.abs(netSaved).toFixed(2)}`}
          </Text>
          <Text style={styles.statLabel}>Net Saved (AUD)</Text>
        </View>
      </View>

      {plants.length === 0 && (
        <TouchableOpacity style={styles.starterBtn} onPress={loadSampleGarden}>
          <Ionicons name="sparkles" size={18} color="#ffffff" />
          <Text style={styles.starterText}>Load Western Sydney Starter Garden</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modal !== 'none'} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modal === 'harvest' ? 'Log Harvest Yield' : 'Log Garden Expense'}</Text>
            {modal === 'harvest' ? (
              <>
                <TextInput placeholder="Crop name (e.g. Tommy Toe Tomato)" value={crop} onChangeText={setCrop} style={styles.input} />
                <TextInput placeholder="Weight in grams (e.g. 500)" value={grams} onChangeText={setGrams} keyboardType="numeric" style={styles.input} />
                <View style={styles.modalRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal('none')}><Text>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveHarvest}><Text style={styles.saveText}>Save Harvest</Text></TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TextInput placeholder="Item (e.g. Mulch, Potting Mix)" value={expItem} onChangeText={setExpItem} style={styles.input} />
                <TextInput placeholder="Cost in $ AUD (e.g. 15.50)" value={expCost} onChangeText={setExpCost} keyboardType="numeric" style={styles.input} />
                <View style={styles.modalRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal('none')}><Text>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveExpense}><Text style={styles.saveText}>Save Expense</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  hero: { backgroundColor: '#14532d', borderRadius: 20, padding: 18 },
  heroTag: { color: '#86efac', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  heroSub: { color: '#dcfce7', fontSize: 13, marginTop: 6, lineHeight: 18 },
  seasonRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  seasonPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)' },
  seasonPillActive: { backgroundColor: '#86efac' },
  seasonText: { color: '#dcfce7', fontSize: 12, fontWeight: '600' },
  seasonTextActive: { color: '#14532d' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  actionBtn: { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#dcfce7', gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: '#1e293b' },
  harvestBanner: { backgroundColor: '#fef3c7', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fde68a' },
  bannerTitle: { fontSize: 12, fontWeight: '800', color: '#92400e' },
  pickChip: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#fcd34d' },
  pickChipText: { fontSize: 13, fontWeight: '700', color: '#78350f' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#dcfce7' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#15803d' },
  statLabel: { fontSize: 13, color: '#475569', marginTop: 4 },
  starterBtn: { backgroundColor: '#15803d', borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  starterText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#14532d' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 15 },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  saveBtn: { backgroundColor: '#15803d', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  saveText: { color: '#ffffff', fontWeight: '700' },
});
