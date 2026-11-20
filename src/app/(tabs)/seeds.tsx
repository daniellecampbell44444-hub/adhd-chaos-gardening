import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGarden } from '../../context/GardenContext';

export default function SeedsScreen() {
  const { seeds, harvests, expenses, addSeed, updateSeedCount, sowSeed, deleteSeed } = useGarden();
  const [sub, setSub] = useState<'seeds' | 'money'>('seeds');
  const [name, setName] = useState('');
  const [variety, setVariety] = useState('');
  const [packets, setPackets] = useState('1');
  const [approx, setApprox] = useState('50');

  const earned = harvests.reduce((s, h) => s + h.valueAud, 0);
  const spent = expenses.reduce((s, e) => s + e.costAud, 0);
  const net = earned - spent;

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        <TouchableOpacity onPress={() => setSub('seeds')} style={[styles.segBtn, sub === 'seeds' && styles.segOn]}>
          <Text style={[styles.segText, sub === 'seeds' && styles.segOnText]}>Seed Stash ({seeds.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSub('money')} style={[styles.segBtn, sub === 'money' && styles.segOn]}>
          <Text style={[styles.segText, sub === 'money' && styles.segOnText]}>Money & ROI</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {sub === 'seeds' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.secTitle}>Add Seeds to Inventory</Text>
              <TextInput placeholder="Plant (e.g. Tomato)" value={name} onChangeText={setName} style={styles.input} />
              <TextInput placeholder="Variety (e.g. Black Krim)" value={variety} onChangeText={setVariety} style={styles.input} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput placeholder="Packets" value={packets} onChangeText={setPackets} keyboardType="numeric" style={[styles.input, { flex: 1 }]} />
                <TextInput placeholder="Approx Seeds" value={approx} onChangeText={setApprox} keyboardType="numeric" style={[styles.input, { flex: 1 }]} />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => {
                if (!name.trim()) return;
                addSeed({ name: name.trim(), variety: variety.trim() || 'Standard', packets: Number(packets) || 1, approxSeeds: Number(approx) || 30, season: 'Spring/Summer', wishlist: false });
                setName(''); setVariety('');
              }}>
                <Text style={styles.addBtnText}>+ Save Seeds</Text>
              </TouchableOpacity>
            </View>

            {seeds.map(s => (
              <View key={s.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{s.name} — {s.variety}</Text>
                    <Text style={styles.sub}>{s.wishlist ? '⭐ Wishlist' : `📦 ${s.packets} pkt • 🌱 ~${s.approxSeeds} seeds`}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteSeed(s.id)}>
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity onPress={() => updateSeedCount(s.id, 'approxSeeds', -5)} style={styles.mini}><Text style={styles.miniTxt}>-5 seeds</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => updateSeedCount(s.id, 'approxSeeds', 10)} style={styles.mini}><Text style={styles.miniTxt}>+10</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.sowBtn} onPress={() => { sowSeed(s.id); Alert.alert('Sown!', `${s.variety} ${s.name} added to My Plants as a Seedling.`); }}>
                    <Text style={styles.sowTxt}>🌱 Sow into Garden</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.roiGrid}>
              <View style={styles.roiCard}><Text style={styles.roiNum}>${earned.toFixed(2)}</Text><Text style={styles.sub}>Harvest Value</Text></View>
              <View style={styles.roiCard}><Text style={[styles.roiNum, { color: '#dc2626' }]}>${spent.toFixed(2)}</Text><Text style={styles.sub}>Total Spent</Text></View>
              <View style={styles.roiCard}><Text style={[styles.roiNum, { color: net >= 0 ? '#15803d' : '#dc2626' }]}>${net.toFixed(2)}</Text><Text style={styles.sub}>Net Saved</Text></View>
            </View>
            <Text style={styles.secTitle}>Recent Harvests</Text>
            {harvests.length === 0 ? <Text style={styles.sub}>Tap Log Yield on the Pulse tab to track harvests.</Text> : harvests.map(h => (
              <View key={h.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.title}>{h.crop} ({h.grams}g)</Text>
                  <Text style={{ color: '#15803d', fontWeight: '800' }}>+${h.valueAud.toFixed(2)}</Text>
                </View>
                <Text style={styles.sub}>{h.date}</Text>
              </View>
            ))}
            <Text style={styles.secTitle}>Recent Expenses</Text>
            {expenses.length === 0 ? <Text style={styles.sub}>Tap Expense on the Pulse tab to log costs.</Text> : expenses.map(e => (
              <View key={e.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.title}>{e.item}</Text>
                  <Text style={{ color: '#dc2626', fontWeight: '800' }}>-${e.costAud.toFixed(2)}</Text>
                </View>
                <Text style={styles.sub}>{e.date}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
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
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dcfce7', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  secTitle: { fontSize: 14, fontWeight: '800', color: '#14532d' },
  title: { fontSize: 15, fontWeight: '800', color: '#14532d' },
  sub: { fontSize: 12, color: '#64748b' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, fontSize: 14 },
  addBtn: { backgroundColor: '#15803d', padding: 11, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '700' },
  mini: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  miniTxt: { fontSize: 12, fontWeight: '700', color: '#334155' },
  sowBtn: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  sowTxt: { fontSize: 12, fontWeight: '800', color: '#14532d' },
  roiGrid: { flexDirection: 'row', gap: 8 },
  roiCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#dcfce7' },
  roiNum: { fontSize: 18, fontWeight: '800', color: '#15803d' },
});
