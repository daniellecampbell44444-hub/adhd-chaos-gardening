import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    signUp, signIn, signOut,
    waterAll, feedAll, addHarvest, addExpense, loadSampleGarden,
  } = useGarden();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [modal, setModal] = useState<'none' | 'harvest' | 'expense' | 'auth'>('none');
  const [crop, setCrop] = useState('');
  const [grams, setGrams] = useState('');
  const [expItem, setExpItem] = useState('');
  const [expCost, setExpCost] = useState('');

  // Auth modal state
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
      // Keeps previous weather
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
    const err = authMode === 'signup'
      ? await signUp(email, password)
      : await signIn(email, password);
    setAuthBusy(false);

    if (err) {
      Alert.alert('Account Error', err);
    } else {
      setEmail('');
      setPassword('');
      setModal('none');
      Alert.alert(
        authMode === 'signup' ? 'Account Created!' : 'Welcome Back!',
        'Your garden will now automatically sync to the cloud.'
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
  const syncLabel = !user ? 'Cloud Backup' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Error' : 'Synced ✓';

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
          <Ionicons name="cash" size={20} color="#7c3aed"