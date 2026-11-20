import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGarden, getSmartFeed, AUSSIE_FERT_PRESETS } from '../../context/GardenContext';

export default function CareScreen() {
  const { plants, fertilizers, reminders, feedPlant, addFertilizer, deleteFertilizer, addReminder, toggleReminder } = useGarden();
  const [sub, setSub] = useState<'smart' | 'ferts' | 'reminders'>('smart');
  const [fBrand, setFBrand] = useState('');
  const [fName, setFName] = useState('');
  const [remTitle, setRemTitle] = useState('');
  const [remDue, setRemDue] = useState('Tomorrow');

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        {(['smart', 'ferts', 'reminders'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setSub(t)} style={[styles.segBtn, sub === t && styles.segOn]}>
            <Text style={[styles.segText, sub === t && styles.segOnText]}>
              {t === 'smart' ? 'Smart Feed' : t === 'ferts' ? 'My Fertilisers' : 'Reminders'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {sub === 'smart' && (
          <>
            <View style={styles.heatBanner}>
              <Text style={styles.heatText}>☀️ Western Sydney Rule: Skip granular fertilisers on &gt;35°C days; water soil first.</Text>
            </View>
            {plants.length === 0 ? (
              <Text style={styles.empty}>Add plants (or load the Starter Garden on Pulse) to see automatic fertiliser plans.</Text>
            ) : plants.map(p => {
              const plan = getSmartFeed(p, fertilizers);
              return (
                <View key={p.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View>
                      <Text style={styles.title}>{p.name} ({p.variety})</Text>
                      <Text style={styles.sub}>{p.site} • {p.stage}</Text>
                    </View>
                    <TouchableOpacity onPress={() => feedPlant(p.id)} style={styles.feedBtn}>
                      <Text style={styles.feedBtnText}>{p.lastFed ? 'Fed ✓' : 'Log Feed'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.planMain}>
                    {plan.primary ? `🌿 ${plan.primary.brand} ${plan.primary.name}` : '⏸️ No feed assigned'}
                  </Text>
                  {plan.boost && <Text style={styles.boost}>⚡ Stage Boost: {plan.boost.brand} {plan.boost.name}</Text>}
                  <Text style={styles.note}>{plan.note}</Text>
                </View>
              );
            })}
          </>
        )}

        {sub === 'ferts' && (
          <>
            <Text style={styles.secTitle}>1-Tap Quick-Add Aussie Brands</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              {AUSSIE_FERT_PRESETS.map(p => (
                <TouchableOpacity key={p.name} onPress={() => addFertilizer(p)} style={styles.presetChip}>
                  <Text style={styles.presetText}>+ {p.brand} {p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.card}>
              <Text style={styles.secTitle}>Add Custom Fertiliser</Text>
              <TextInput placeholder="Brand (e.g. Charlie Carp)" value={fBrand} onChangeText={setFBrand} style={styles.input} />
              <TextInput placeholder="Product Name" value={fName} onChangeText={setFName} style={styles.input} />
              <TouchableOpacity style={styles.addBtn} onPress={() => {
                if (!fName.trim()) return;
                addFertilizer({ brand: fBrand.trim() || 'Custom', name: fName.trim(), feedType: 'Liquid', targets: ['All'], potDosage: '1 cap / 9L', bedDosage: '2 caps / 9L', freqDays: 14 });
                setFBrand(''); setFName('');
              }}>
                <Text style={styles.addBtnText}>Add to Shed</Text>
              </TouchableOpacity>
            </View>

            {fertilizers.map(f => (
              <View key={f.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{f.brand} — {f.name}</Text>
                    <Text style={styles.sub}>{f.feedType} • Pot: {f.potDosage} • Bed: {f.bedDosage}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteFertilizer(f.id)}>
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {sub === 'reminders' && (
          <>
            <View style={styles.card}>
              <TextInput placeholder="New reminder (e.g. Spray Eco-Oil on citrus)" value={remTitle} onChangeText={setRemTitle} style={styles.input} />
              <TextInput placeholder="When (e.g. Tomorrow 7am)" value={remDue} onChangeText={setRemDue} style={styles.input} />
              <TouchableOpacity style={styles.addBtn} onPress={() => {
                if (!remTitle.trim()) return;
                addReminder(remTitle.trim(), remDue.trim() || 'Soon');
                setRemTitle('');
              }}>
                <Text style={styles.addBtnText}>+ Add Reminder</Text>
              </TouchableOpacity>
            </View>
            {reminders.map(r => (
              <TouchableOpacity key={r.id} onPress={() => toggleReminder(r.id)} style={[styles.card, r.done && { opacity: 0.55 }]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, r.done && { textDecorationLine: 'line-through' }]}>{r.title}</Text>
                    <Text style={styles.sub}>⏰ {r.due}</Text>
                  </View>
                  <Ionicons name={r.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color="#15803d" />
                </View>
              </TouchableOpacity>
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
  segText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  segOnText: { color: '#ffffff' },
  list: { padding: 14, gap: 12, paddingBottom: 40 },
  heatBanner: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  heatText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dcfce7', gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', color: '#14532d' },
  sub: { fontSize: 12, color: '#64748b' },
  feedBtn: { backgroundColor: '#15803d', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  feedBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  planMain: { fontSize: 14, fontWeight: '700', color: '#065f46', marginTop: 4 },
  boost: { fontSize: 13, fontWeight: '700', color: '#b45309' },
  note: { fontSize: 12, color: '#475569' },
  secTitle: { fontSize: 14, fontWeight: '800', color: '#14532d' },
  presetChip: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginRight: 8 },
  presetText: { fontSize: 12, fontWeight: '700', color: '#14532d' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, fontSize: 14 },
  addBtn: { backgroundColor: '#15803d', padding: 11, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 30, fontSize: 14 },
});
