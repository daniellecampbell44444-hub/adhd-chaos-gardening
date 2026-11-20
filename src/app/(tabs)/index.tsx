import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useGarden } from '../../context/GardenContext';

interface WeatherData {
  currentTemp: number;
  humidity: number;
  code: number;
  todayMax: number;
  todayMin: number;
  todayRain: number;
  tomorrowMax: number;
  tomorrowMin: number;
  tomorrowRain: number;
  updatedAt: string;
}

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-33.765&longitude=150.870&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Australia%2FSydney&forecast_days=2';

function describeWeather(code: number) {
  if (code === 0) return { icon: '☀️', label: 'Clear skies' };
  if (code <= 3) return { icon: '⛅', label: 'Partly cloudy' };
  if (code <= 48) return { icon: '🌫️', label: 'Foggy' };
  if (code <= 67) return { icon: '🌧️', label: 'Rain' };
  if (code <= 82) return { icon: '🌦️', label: 'Showers' };
  if (code >= 95) return { icon: '⛈️', label: 'Storms' };
  return { icon: '🌤️', label: 'Mild' };
}

export default function PulseScreen() {
  const { plants, harvests, expenses, waterAll, feedAll, addHarvest, addExpense, loadSampleGarden } = useGarden();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [modal, setModal] = useState<'none' | 'harvest' | 'expense'>('none');
  const [crop, setCrop] = useState('');
  const [grams, setGrams] = useState('');
  const [expItem, setExpItem] = useState('');
  const [expCost, setExpCost] = useState('');

  const fetchWeather = useCallback(async () => {
    setLoadingWeather(true);
    try {
      const res = await fetch(WEATHER_URL);
      const data = await res.json();
      setWeather({
        currentTemp: Math.round(data.current.temperature_2m),
        humidity: Math.round(data.current.relative_humidity_2m),
        code: data.current.weather_code,
        todayMax: Math.round(data.daily.temperature_2m_max[0]),
        todayMin: Math.round(data.daily.temperature_2m_min[0]),
        todayRain: data.daily.precipitation_probability_max[0] ?? 0,
        tomorrowMax: Math.round(data.daily.temperature_2m_max[1]),
        tomorrowMin: Math.round(data.daily.temperature_2m_min[1]),
        tomorrowRain: data.daily.precipitation_probability_max[1] ?? 0,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {
      // Keeps previous weather or shows offline fallback
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const totalPlants = plants.reduce((s, p) => s + p.quantity, 0);
  const uniqueVarieties = new Set(plants.map(p => `${p.name}-${p.variety}`)).size;
  const totalGrams = harvests.reduce((s, h) => s + h.grams, 0);
  const totalEarned = harvests.reduce((s, h) => s + h.valueAud, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.costAud, 0);
  const netSaved = totalEarned - totalSpent;
  const readyToPick = plants.filter(p => p.stage === 'Fruiting');

  const peakMax = weather ? Math.max(weather.todayMax, weather.tomorrowMax) : 0;
  const lowMin = weather ? Math.min(weather.todayMin, weather.tomorrowMin) : 99;
  const highRain = weather ? Math.max(weather.todayRain, weather.tomorrowRain) : 0;

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

  const wInfo = weather ? describeWeather(weather.code) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTag}>WESTERN SYDNEY • LIVE</Text>
            <Text style={styles.heroTitle}>ADHD Chaos Gardening</Text>
          </View>
          <TouchableOpacity onPress={fetchWeather} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color="#dcfce7" />
          </TouchableOpacity>
        </View>

        {loadingWeather && !weather ? (
          <View style={styles.weatherLoading}>
            <ActivityIndicator color="#86efac" size="small" />
            <Text style={styles.heroSub}>Checking Western Sydney forecast...</Text>
          </View>
        ) : weather && wInfo ? (
          <View style={styles.weatherBox}>
            <View style={styles.weatherMain}>
              <Text style={styles.tempNow}>{wInfo.icon} {weather.currentTemp}°C</Text>
              <View>
                <Text style={styles.weatherLabel}>{wInfo.label} • {weather.humidity}% humidity</Text>
                <Text style={styles.weatherSub}>
                  Today: {weather.todayMin}°–{weather.todayMax}°C • 💧 {weather.todayRain}% rain
                </Text>
                <Text style={styles.weatherSub}>
                  Tomorrow: {weather.tomorrowMin}°–{weather.tomorrowMax}°C • 💧 {weather.tomorrowRain}% rain
                </Text>
              </View>
            </View>
            <Text style={styles.updatedTxt}>Updated {weather.updatedAt}</Text>
          </View>
        ) : (
          <Text style={styles.heroSub}>Offline mode — tap refresh to load live weather.</Text>
        )}
      </View>

      {weather && peakMax >= 38 && (
        <View style={[styles.alertCard, styles.alertHeat]}>
          <Text style={styles.alertTitle}>🔥 HEATWAVE ALERT ({peakMax}°C forecast)</Text>
          <Text style={styles.alertBody}>
            Put up 30% shade cloth, deep-soak pots at dawn, and pause granular fertiliser until temps drop below 35°C.
          </Text>
        </View>
      )}

      {weather && peakMax >= 35 && peakMax < 38 && (
        <View style={[styles.alertCard, styles.alertWarm]}>
          <Text style={styles.alertTitle}>☀️ HOT DAY CARE ({peakMax}°C forecast)</Text>
          <Text style={styles.alertBody}>
            Water pots early morning and skip granular fertilisers today to avoid root burn.
          </Text>
        </View>
      )}

      {weather && lowMin <= 4 && (
        <View style={[styles.alertCard, styles.alertFrost]}>
          <Text style={styles.alertTitle}>❄️ FROST WATCH ({lowMin}°C overnight)</Text>
          <Text style={styles.alertBody}>
            Cover chillies, capsicums, basil, and young citrus tonight with frost cloth or move pots under shelter.
          </Text>
        </View>
      )}

      {weather && highRain >= 70 && (
        <View style={[styles.alertCard, styles.alertRain]}>
          <Text style={styles.alertTitle}>🌧️ RAIN INCOMING ({highRain}% chance)</Text>
          <Text style={styles.alertBody}>
            You can likely skip watering open raised beds—check pot saucers so roots don’t sit in water.
          </Text>
        </View>
      )}

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
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTag: { color: '#86efac', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: '#ffffff', fontSize: 23, fontWeight: '800', marginTop: 3 },
  heroSub: { color: '#dcfce7', fontSize: 13, marginTop: 8 },
  refreshBtn: { backgroundColor: 'rgba(255,255,255,0.14)', padding: 8, borderRadius: 10 },
  weatherLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  weatherBox: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12 },
  weatherMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tempNow: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  weatherLabel: { color: '#bbf7d0', fontSize: 13, fontWeight: '700' },
  weatherSub: { color: '#dcfce7', fontSize: 12, marginTop: 2 },
  updatedTxt: { color: '#86efac', fontSize: 10, marginTop: 6, textAlign: 'right' },
  alertCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
  alertHeat: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  alertWarm: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  alertFrost: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
  alertRain: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
  alertTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  alertBody: { fontSize: 12, color: '#334155', marginTop: 4, lineHeight: 17 },
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