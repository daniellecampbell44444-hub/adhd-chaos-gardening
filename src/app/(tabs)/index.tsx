import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const {
    plants, harvests, expenses, user, syncStatus,
    signUp, signIn, signOut, waterAll, feedAll, addHarvest, addExpense, loadSampleGarden,
  } = useGarden();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [modal, setModal] = useState<'none' | 'harvest' | 'expense' | 'auth'>('none');
  const [crop, setCrop] = useState('');
  const [grams, setGrams] = useState('');
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
  const peakMax = weather ? Math.max(weather.todayMax, weather.tomorrowMax) : null;
  const lowMin = weather ? Math.min(weather.todayMin, weather.tomorrowMin) : null;
  const highRain = weather ? Math.max(weather.todayRain, weather.tomorrowRain) : null;

  const submitHarvest = async () => {
    if (!crop.trim() || !grams.trim()) return;
    await addHarvest(crop.trim(), Number(grams));
    setCrop('');
    setGrams('');
    setModal('none');
  };

  const submitExpense = async () => {
    if (!expItem.trim() || !expCost.trim()) return;
addExpense(expItem.trim(), 'Garden', Number(expCost));
    setExpItem('');
    setExpCost('');
    setModal('none');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f7f4ed' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#20352a' }}>Garden Pulse</Text>
            <Text style={{ marginTop: 4, color: '#6b756f' }}>{syncStatus}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setModal('auth')}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e5ede5', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={user ? 'person-circle' : 'person-circle-outline'} size={26} color="#20352a" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 24, padding: 18, borderRadius: 18, backgroundColor: '#20352a' }}>
          {loadingWeather ? (
            <ActivityIndicator color="#fff" />
          ) : weather ? (
            <>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                {describeWeather(weather.code).icon} {describeWeather(weather.code).label}
              </Text>
              <Text style={{ color: '#fff', fontSize: 38, fontWeight: '800', marginTop: 6 }}>
                {weather.currentTemp}°C
              </Text>
              <Text style={{ color: '#d6dfd8', marginTop: 4 }}>
                {weather.todayMin}°–{weather.todayMax}° · Rain {weather.todayRain}% · Humidity {weather.humidity}%
              </Text>
            </>
          ) : (
            <Text style={{ color: '#fff' }}>Weather unavailable</Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
          {[
            ['Plants', `${totalPlants}`],
            ['Varieties', `${uniqueVarieties}`],
            ['Harvest', `${totalGrams}g`],
            ['Net', `$${netSaved.toFixed(2)}`],
          ].map(([label, value]) => (
            <View key={label} style={{ width: '47%', padding: 16, borderRadius: 16, backgroundColor: '#fff' }}>
              <Text style={{ color: '#7b847f', fontSize: 13 }}>{label}</Text>
              <Text style={{ color: '#20352a', fontSize: 24, fontWeight: '800', marginTop: 4 }}>{value}</Text>
            </View>
          ))}
        </View>

        {readyToPick.length > 0 && (
          <View style={{ marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#fff7dc' }}>
            <Text style={{ fontWeight: '700', color: '#20352a' }}>Ready to pick: {readyToPick.length}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <TouchableOpacity onPress={waterAll} style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#dbe9f3', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: '#20352a' }}>Water all</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={feedAll} style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#e7ecd4', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: '#20352a' }}>Feed all</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <TouchableOpacity onPress={() => setModal('harvest')} style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#20352a', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: '#fff' }}>Log harvest</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModal('expense')} style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#20352a', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: '#fff' }}>Log expense</Text>
          </TouchableOpacity>
        </View>

        {peakMax !== null && lowMin !== null && highRain !== null && (
          <Text style={{ marginTop: 16, color: '#7b847f', textAlign: 'center' }}>
            2-day range: {lowMin}°–{peakMax}° · High rain chance {highRain}%
          </Text>
        )}
      </ScrollView>

      <Modal visible={modal === 'harvest'} transparent animationType="slide" onRequestClose={() => setModal('none')}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View style={{ padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#20352a' }}>Log harvest</Text>
            <TextInput value={crop} onChangeText={setCrop} placeholder="Crop" style={{ marginTop: 16, borderWidth: 1, borderColor: '#dfe4df', borderRadius: 12, padding: 14 }} />
            <TextInput value={grams} onChangeText={setGrams} placeholder="Grams" keyboardType="numeric" style={{ marginTop: 10, borderWidth: 1, borderColor: '#dfe4df', borderRadius: 12, padding: 14 }} />
            <TouchableOpacity onPress={submitHarvest} style={{ marginTop: 12, padding: 16, borderRadius: 12, backgroundColor: '#20352a', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Save harvest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modal === 'expense'} transparent animationType="slide" onRequestClose={() => setModal('none')}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View style={{ padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#20352a' }}>Log expense</Text>
            <TextInput value={expItem} onChangeText={setExpItem} placeholder="Item" style={{ marginTop: 16, borderWidth: 1, borderColor: '#dfe4df', borderRadius: 12, padding: 14 }} />
            <TextInput value={expCost} onChangeText={setExpCost} placeholder="Cost" keyboardType="decimal-pad" style={{ marginTop: 10, borderWidth: 1, borderColor: '#dfe4df', borderRadius: 12, padding: 14 }} />
            <TouchableOpacity onPress={submitExpense} style={{ marginTop: 12, padding: 16, borderRadius: 12, backgroundColor: '#20352a', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Save expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modal === 'auth'} transparent animationType="slide" onRequestClose={() => setModal('none')}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View style={{ padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            {user ? (
              <TouchableOpacity onPress={async () => { await signOut(); setModal('none'); }} style={{ padding: 16, borderRadius: 12, backgroundColor: '#20352a', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Sign out</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <TouchableOpacity onPress={() => setAuthMode('signin')} style={{ flex: 1, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontWeight: authMode === 'signin' ? '800' : '500' }}>Sign in</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setAuthMode('signup')} style={{ flex: 1, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontWeight: authMode === 'signup' ? '800' : '500' }}>Sign up</Text>
                  </TouchableOpacity>
                </View>
                <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={{ borderWidth: 1, borderColor: '#dfe4df', borderRadius: 12, padding: 14 }} />
                <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ marginTop: 10, borderWidth: 1, borderColor: '#dfe4df', borderRadius: 12, padding: 14 }} />
                <TouchableOpacity onPress={handleAuth} disabled={authBusy} style={{ marginTop: 12, padding: 16, borderRadius: 12, backgroundColor: '#20352a', alignItems: 'center' }}>
                  {authBusy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{authMode === 'signin' ? 'Sign in' : 'Create account'}</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}