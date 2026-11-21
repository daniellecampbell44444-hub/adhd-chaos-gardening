import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

function getPreservationIdea(cropName: string, grams: number): string {
  const name = cropName.toLowerCase();
  const weightLabel = grams >= 1000 ? `${(grams / 1000).toFixed(2)}kg` : `${grams}g`;
  if (name.includes('tomato')) {
    return `${cropName} (${weightLabel}): Simmer into rich passata, BBQ sauce, or dehydrate slices into sundried tomatoes.`;
  }
  if (name.includes('chilli') || name.includes('pepper') || name.includes('capsicum')) {
    return `${cropName} (${weightLabel}): Dehydrate for chilli flakes/powder, blend into hot sauce, or pickle whole.`;
  }
  if (name.includes('lemon') || name.includes('orange') || name.includes('citrus')) {
    return `${cropName} (${weightLabel}): Juice & freeze in cubes, make curd, or candy the peels and save scraps for pectin.`;
  }
  if (name.includes('strawberry') || name.includes('blueberry') || name.includes('berry') || name.includes('fruit')) {
    return `${cropName} (${weightLabel}): Dehydrate fruit leather/slices, simmer into jam/compote, or freeze on trays.`;
  }
  if (name.includes('cucumber') || name.includes('onion') || name.includes('zucchini')) {
    return `${cropName} (${weightLabel}): Quick-pickle in spiced brine, grate & freeze for baking, or slice for dehydrating.`;
  }
  if (name.includes('potato') || name.includes('carrot') || name.includes('sweet potato')) {
    return `${cropName} (${weightLabel}): Dehydrate into slices or mash powder, roast & freeze, or store cool and dark.`;
  }
  return `${cropName} (${weightLabel}): Dehydrate, blanch & freeze, or turn surplus into sauces/powders before it spoils.`;
}

export default function PulseScreen() {
  const {
    plants, harvests, expenses, reminders, seeds, user, syncStatus,
    signUp, signIn, signOut, waterAll, feedAll, addHarvest, addExpense,
    toggleReminder, catchUpReminders, loadSampleGarden,
  } = useGarden();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [modal, setModal] = useState<'none' | 'harvest' | 'expense' | 'auth'>('none');
  const [crop, setCrop] = useState('');
const HARVEST_PLANT_CHIPS = Array.from(new Set(plants.map(p => (p.variety ? `${p.variety} ${p.name}` : p.name).trim()))).filter(Boolean).slice(0, 12);
  const [grams, setGrams] = useState('');
const QUICK_HARVEST_WEIGHTS = [{"label":"100g","grams":100},{"label":"250g","grams":250},{"label":"500g","grams":500},{"label":"1kg","grams":1000},{"label":"2kg","grams":2000}];
  const [expItem, setExpItem] = useState('');
  const [expCost, setExpCost] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

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
      // Keep previous weather on error
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const handleAuth = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Check details', 'Enter a valid email and a password of at least 6 characters.');
      return;
    }
    setAuthBusy(true);
    const err = authMode === 'signup' ? await signUp(email, password) : await signIn(email, password);
    setAuthBusy(false);
    if (err) {
      Alert.alert('Account Error', err);
    } else {
      setEmail('');
      setPassword('');
      setModal('none');
      Alert.alert(
        authMode === 'signup' ? 'Account Created!' : 'Welcome Back!',
        'Your garden will now auto-sync to the cloud.'
      );
    }
  };

  const totalPlants = plants.reduce((s, p) => s + p.quantity, 0);
  const uniqueVarieties = new Set(plants.map(p => `${p.name}-${p.variety}`)).size;
  const totalGrams = harvests.reduce((s, h) => s + h.grams, 0);
  const totalEarned = harvests.reduce((s, h) => s + h.valueAud, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.costAud, 0);
  const netSaved = totalEarned - totalSpent;
  const readyToPick = plants.filter(p => p.stage === 'Fruiting');
  const openReminders = reminders.filter(r => !r.done);
  const peakMax = weather ? Math.max(weather.todayMax, weather.tomorrowMax) : 0;
  const lowMin = weather ? Math.min(weather.todayMin, weather.tomorrowMin) : 99;
  const highRain = weather ? Math.max(weather.todayRain, weather.tomorrowRain) : 0;
  const wInfo = weather ? describeWeather(weather.code) : null;
  const syncLabel = !user ? 'Cloud Backup' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Error' : 'Synced ✓';

  // Surplus harvests (>= 400g) that can be preserved or turned into kitchen staples
  const surplusHarvests = harvests
    .filter(h => h.grams >= 400)
    .slice(0, 3)
    .map(h => ({
      id: h.id,
      text: getPreservationIdea(h.crop, h.grams),
    }));

  // Low-seed alerts for stocked seeds running low (excluding pure wishlist items)
  const lowSeedItems = seeds.filter(
    s => !s.wishlist && (s.packets <= 1 || s.approxSeeds <= 15)
  );

  // Build up to 3 high-impact focus items without overwhelming the screen
  const focusItems: { id: string; label: string; meta: string; onPress: () => void }[] = [];
  if (peakMax >= 35) {
    focusItems.push({
      id: 'heat-soak',
      label: `Deep-soak pots & check shade (${peakMax}°C forecast)`,
      meta: 'Heat priority',
      onPress: () => {
        waterAll();
        Alert.alert('Soaked!', 'All plants marked watered ahead of the heat.');
      },
    });
  }
  if (readyToPick.length > 0) {
    const firstCrop = readyToPick[0];
    focusItems.push({
      id: 'pick-ripe',
      label: `Pick ripe ${firstCrop.variety} ${firstCrop.name} (${readyToPick.length} fruiting)`,
      meta: 'Quick win',
      onPress: () => {
        setCrop(`${firstCrop.variety} ${firstCrop.name}`);
        setModal('harvest');
      },
    });
  }
  for (const rem of openReminders) {
    if (focusItems.length >= 3) break;
    focusItems.push({
      id: rem.id,
      label: rem.title,
      meta: rem.due,
      onPress: () => toggleReminder(rem.id),
    });
  }
  if (focusItems.length < 3 && plants.length > 0 && !focusItems.some(i => i.id === 'heat-soak')) {
    focusItems.push({
      id: 'quick-water',
      label: 'Quick 2-minute pot & bed check-in',
      meta: 'Low-pressure',
      onPress: () => {
        waterAll();
        Alert.alert('Watered!', 'All plants logged as watered today.');
      },
    });
  }
  const topThree = focusItems.slice(0, 3);

  const saveHarvest = () => {
    if (!crop.trim() || !Number(grams)) return;
    addHarvest(crop.trim(), Number(grams));
    setCrop('');
    setGrams('');
    setModal('none');
  };

  const saveExpense = () => {
    if (!expItem.trim() || !Number(expCost)) return;
    addExpense(expItem.trim(), 'Garden', Number(expCost));
    setExpItem('');
    setExpCost('');
    setModal('none');
  };

  const handleCatchUpReset = () => {
    if (openReminders.length === 0) {
      Alert.alert('All caught up!', 'No overdue reminders waiting—zero guilt.');
      return;
    }
    catchUpReminders();
    Alert.alert('Fresh slate!', `${openReminders.length} open task(s) rolled smoothly into today with zero guilt.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTag}>WESTERN SYDNEY • LIVE</Text>
            <Text style={styles.heroTitle}>ADHD Chaos Gardening</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={() => setModal('auth')} style={styles.cloudBtn}>
              <Ionicons name={user ? 'cloud-done' : 'cloud-outline'} size={16} color="#dcfce7" />
              <Text style={styles.cloudTxt}>{syncLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={fetchWeather} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={16} color="#dcfce7" />
            </TouchableOpacity>
          </View>
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
                <Text style={styles.weatherSub}>Today: {weather.todayMin}°–{weather.todayMax}°C • 💧 {weather.todayRain}% rain</Text>
                <Text style={styles.weatherSub}>Tomorrow: {weather.tomorrowMin}°–{weather.tomorrowMax}°C • 💧 {weather.tomorrowRain}% rain</Text>
              </View>
            </View>
            <Text style={styles.updatedTxt}>Updated {weather.updatedAt}</Text>
          </View>
        ) : (
          <Text style={styles.heroSub}>Offline mode — tap refresh to load live weather.</Text>
        )}
      </View>

      <View style={styles.focusCard}>
        <View style={styles.focusHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.focusTag}>NO OVERWHELM • MAX 3</Text>
            <Text style={styles.focusTitle}>🎯 Top-3 Today</Text>
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={handleCatchUpReset}>
            <Ionicons name="sparkles-outline" size={14} color="#14532d" />
            <Text style={styles.resetBtnText}>Catch-Up Reset</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.focusHint}>
          Tap an item to mark it done. Life got busy? Hit Catch-Up Reset—missed tasks roll forward with zero guilt.
        </Text>

        {topThree.length === 0 ? (
          <Text style={styles.emptyFocus}>Load your starter garden or add a plant to get gentle daily focus picks.</Text>
        ) : (
          topThree.map((item, idx) => (
            <TouchableOpacity key={item.id} style={styles.focusRow} onPress={item.onPress}>
              <View style={styles.focusNum}>
                <Text style={styles.focusNumText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.focusItemText}>{item.label}</Text>
                <Text style={styles.focusMeta}>{item.meta}</Text>
              </View>
              <Ionicons name="checkmark-circle-outline" size={22} color="#15803d" />
            </TouchableOpacity>
          ))
        )}
      </View>

      {surplusHarvests.length > 0 && (
        <View style={styles.pantryCard}>
          <Text style={styles.pantryTitle}>🫙 Surplus Preservation Ideas</Text>
          {surplusHarvests.map(tip => (
            <Text key={tip.id} style={styles.pantryLine}>• {tip.text}</Text>
          ))}
        </View>
      )}

      {lowSeedItems.length > 0 && (
        <View style={styles.seedAlertCard}>
          <Text style={styles.seedAlertTitle}>🌱 Low-Seed Alerts ({lowSeedItems.length})</Text>
          {lowSeedItems.slice(0, 4).map(s => (
            <Text key={s.id} style={styles.seedAlertLine}>
              • {s.variety} {s.name}: {s.packets} pkt (~{s.approxSeeds} seeds left)
            </Text>
          ))}
        </View>
      )}

      {weather && peakMax >= 38 && (
        <View style={[styles.alertCard, styles.alertHeat]}>
          <Text style={styles.alertTitle}>🔥 HEATWAVE ALERT ({peakMax}°C forecast)</Text>
          <Text style={styles.alertBody}>Put up 30% shade cloth, deep-soak pots at dawn, and pause granular fertiliser until temps drop below 35°C.</Text>
        </View>
      )}
      {weather && peakMax >= 35 && peakMax < 38 && (
        <View style={[styles.alertCard, styles.alertWarm]}>
          <Text style={styles.alertTitle}>☀️ HOT DAY CARE ({peakMax}°C forecast)</Text>
          <Text style={styles.alertBody}>Water pots early morning and skip granular fertilisers today to avoid root burn.</Text>
        </View>
      )}
      {weather && lowMin <= 4 && (
        <View style={[styles.alertCard, styles.alertFrost]}>
          <Text style={styles.alertTitle}>❄️ FROST WATCH ({lowMin}°C overnight)</Text>
          <Text style={styles.alertBody}>Cover chillies, capsicums, basil, and young citrus tonight or move pots under shelter.</Text>
        </View>
      )}
      {weather && highRain >= 70 && (
        <View style={[styles.alertCard, styles.alertRain]}>
          <Text style={styles.alertTitle}>🌧️ RAIN INCOMING ({highRain}% chance)</Text>
          <Text style={styles.alertBody}>You can likely skip watering open raised beds—check pot saucers so roots don’t sit in water.</Text>
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
        <View style={styles.card}><Text style={styles.statNum}>{totalPlants}</Text><Text style={styles.statLabel}>Active Plants</Text></View>
        <View style={styles.card}><Text style={styles.statNum}>{uniqueVarieties}</Text><Text style={styles.statLabel}>Varieties</Text></View>
        <View style={styles.card}><Text style={styles.statNum}>{totalGrams >= 1000 ? `${(totalGrams / 1000).toFixed(2)}kg` : `${totalGrams}g`}</Text><Text style={styles.statLabel}>Total Harvest</Text></View>
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
            {modal === 'auth' ? (
              user ? (
                <>
                  <Text style={styles.modalTitle}>☁️ Cloud Sync Active</Text>
                  <Text style={styles.alertBody}>Signed in as {user.email}</Text>
                  <Text style={styles.alertBody}>Status: {syncLabel}</Text>
                  <View style={styles.modalRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal('none')}><Text>Close</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#dc2626' }]} onPress={async () => { await signOut(); setModal('none'); }}>
                      <Text style={styles.saveText}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>{authMode === 'signup' ? 'Create Free Account' : 'Sign In to Cloud Sync'}</Text>
                  <Text style={styles.alertBody}>Back up your plants, seeds, and harvests safely across devices.</Text>
                  <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
                  <TextInput placeholder="Password (6+ chars)" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
                  <TouchableOpacity onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}>
                    <Text style={styles.switchAuth}>{authMode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}</Text>
                  </TouchableOpacity>
                  <View style={styles.modalRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal('none')}><Text>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleAuth} disabled={authBusy}>
                      <Text style={styles.saveText}>{authBusy ? 'Please wait...' : authMode === 'signup' ? 'Sign Up' : 'Sign In'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )
            ) : modal === 'harvest' ? (
              <>
                <Text style={styles.modalTitle}>Log Harvest Yield</Text>
                <TextInput placeholder="Crop name (e.g. Tommy Toe Tomato)" value={crop} onChangeText={setCrop} style={styles.input} />
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, marginBottom: 4 }}>{HARVEST_PLANT_CHIPS.map(label => (<TouchableOpacity key={label} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6, backgroundColor: crop === label ? "#15803d" : "#f0fdf4", borderWidth: 1, borderColor: crop === label ? "#15803d" : "#bbf7d0" }} onPress={() => setCrop(label)}><Text style={{ fontSize: 12, fontWeight: "800", color: crop === label ? "#ffffff" : "#14532d" }}>{label}</Text></TouchableOpacity>))}</ScrollView>
                <TextInput placeholder="Weight in grams (e.g. 500)" value={grams} onChangeText={setGrams} keyboardType="numeric" style={styles.input} />
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 4 }}>{QUICK_HARVEST_WEIGHTS.map(w => (<TouchableOpacity key={w.label} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: grams === String(w.grams) ? "#15803d" : "#f0fdf4", borderWidth: 1, borderColor: grams === String(w.grams) ? "#15803d" : "#bbf7d0" }} onPress={() => setGrams(String(w.grams))}><Text style={{ fontSize: 12, fontWeight: "800", color: grams === String(w.grams) ? "#ffffff" : "#14532d" }}>{w.label}</Text></TouchableOpacity>))}</View>
                <View style={styles.modalRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal('none')}><Text>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveHarvest}><Text style={styles.saveText}>Save Harvest</Text></TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Log Garden Expense</Text>
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
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  heroTag: { color: '#86efac', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: '#ffffff', fontSize: 21, fontWeight: '800', marginTop: 3 },
  heroSub: { color: '#dcfce7', fontSize: 13, marginTop: 8 },
  cloudBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  cloudTxt: { color: '#dcfce7', fontSize: 11, fontWeight: '700' },
  refreshBtn: { backgroundColor: 'rgba(255,255,255,0.14)', padding: 7, borderRadius: 10 },
  weatherLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  weatherBox: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12 },
  weatherMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tempNow: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  weatherLabel: { color: '#bbf7d0', fontSize: 13, fontWeight: '700' },
  weatherSub: { color: '#dcfce7', fontSize: 12, marginTop: 2 },
  updatedTxt: { color: '#86efac', fontSize: 10, marginTop: 6, textAlign: 'right' },
  focusCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#bbf7d0', gap: 10 },
  focusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  focusTag: { fontSize: 10, fontWeight: '800', color: '#15803d', letterSpacing: 0.8 },
  focusTitle: { fontSize: 18, fontWeight: '800', color: '#14532d', marginTop: 2 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  resetBtnText: { fontSize: 12, fontWeight: '700', color: '#14532d' },
  focusHint: { fontSize: 12, color: '#475569', lineHeight: 17 },
  emptyFocus: { fontSize: 13, color: '#64748b', fontStyle: 'italic' },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', padding: 11, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  focusNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center' },
  focusNumText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  focusItemText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  focusMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  pantryCard: { backgroundColor: '#ecfdf5', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#6ee7b7', gap: 6 },
  pantryTitle: { fontSize: 13, fontWeight: '800', color: '#065f46' },
  pantryLine: { fontSize: 12, color: '#064e3b', lineHeight: 17 },
  seedAlertCard: { backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#fcd34d', gap: 5 },
  seedAlertTitle: { fontSize: 13, fontWeight: '800', color: '#92400e' },
  seedAlertLine: { fontSize: 12, color: '#78350f', lineHeight: 17 },
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
  switchAuth: { color: '#15803d', fontWeight: '700', fontSize: 13, textAlign: 'center', marginTop: 2 },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  saveBtn: { backgroundColor: '#15803d', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  saveText: { color: '#ffffff', fontWeight: '700' },
});