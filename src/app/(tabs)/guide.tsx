import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert, Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PLANT_LIBRARY, useGarden } from '../../context/GardenContext';

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

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
}

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_KEY}`;

async function askGemini(prompt: string, imageBase64?: string | null) {
  if (!GEMINI_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env. Add your free key and restart Expo.');
  }
  const parts: any[] = [{ text: prompt }];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } });
  }
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'AI request failed.');
  }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
}

export default function GuideScreen() {
  const { plants, addPlant } = useGarden();
  const [sub, setSub] = useState<'ai' | 'library' | 'diagnose'>('ai');
  const [search, setSearch] = useState('');
  const [part, setPart] = useState<string>('Leaves');

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: 'ai', text: 'G’day! Snap a photo of any plant or leaf problem above, or ask me anything about gardening in Western Sydney.' },
  ]);

  const pickPhoto = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera/photo access to identify plants.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoB64(result.assets[0].base64 || null);
      setAiResult('');
    }
  };

  const analyzePhoto = async (mode: 'id' | 'diagnose') => {
    if (!photoB64) return;
    setBusy(true);
    setAiResult('');
    const prompt = mode === 'id'
      ? 'Identify this plant for an edible home gardener in Western Sydney, NSW Australia. Reply concisely with: 1) Common & scientific name, 2) Ideal pot size in mm and litres, 3) Ideal temp °C + heatwave/frost note, 4) Quick care tip.'
      : 'Diagnose any pest, disease, nutrient deficiency, or heat/frost stress on this plant for a Western Sydney, NSW Australia gardener. Reply concisely with: 1) Likely cause, 2) Immediate organic/Aussie-available fix (e.g. Eco-Oil, Seasol, Dipel, shade cloth), 3) Prevention tip.';
    try {
      const reply = await askGemini(prompt, photoB64);
      setAiResult(reply);
    } catch (e: any) {
      Alert.alert('AI Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async () => {
    const q = question.trim();
    if (!q || busy) return;
    setQuestion('');
    setChat(prev => [...prev, { role: 'user', text: q }]);
    setBusy(true);
    const gardenSummary = plants.length
      ? `User currently grows: ${plants.map(p => `${p.quantity}x ${p.name} (${p.variety}, ${p.stage} in ${p.site})`).join(', ')}.`
      : 'User has not added plants yet.';
    try {
      const reply = await askGemini(
        `You are a practical, friendly edible gardening assistant for Western Sydney, NSW Australia (metric units, Aussie brands like Bunnings/Yates/Richgro/Seasol/Eco-Oil, hot summers >38°C, light winter frosts). ${gardenSummary}\n\nQuestion: ${q}\nKeep the answer concise and practical.`
      );
      setChat(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (e: any) {
      setChat(prev => [...prev, { role: 'ai', text: `⚠️ ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const filtered = PLANT_LIBRARY.filter(p =>
    `${p.name} ${p.category} ${p.scientific}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        <TouchableOpacity onPress={() => setSub('ai')} style={[styles.segBtn, sub === 'ai' && styles.segOn]}>
          <Text style={[styles.segText, sub === 'ai' && styles.segOnText]}>AI Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSub('library')} style={[styles.segBtn, sub === 'library' && styles.segOn]}>
          <Text style={[styles.segText, sub === 'library' && styles.segOnText]}>Pot Guide</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSub('diagnose')} style={[styles.segBtn, sub === 'diagnose' && styles.segOn]}>
          <Text style={[styles.segText, sub === 'diagnose' && styles.segOnText]}>Symptoms</Text>
        </TouchableOpacity>
      </View>

      {sub === 'ai' && (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.card}>
            <Text style={styles.title}>📸 Snap Plant ID & Leaf Doctor</Text>
            <Text style={styles.sci}>Take a photo of a plant, bug, or sick leaf for instant Western Sydney advice.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => pickPhoto(true)}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#0f766e' }]} onPress={() => pickPhoto(false)}>
                <Ionicons name="images" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {photoUri && (
              <>
                <Image source={{ uri: photoUri }} style={styles.preview} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => analyzePhoto('id')} disabled={busy}>
                    <Text style={styles.addBtnText}>🌿 Identify Plant</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#b45309' }]} onPress={() => analyzePhoto('diagnose')} disabled={busy}>
                    <Text style={styles.addBtnText}>🩺 Diagnose Issue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {busy && <ActivityIndicator color="#15803d" style={{ marginVertical: 8 }} />}
            {!!aiResult && (
              <View style={styles.resultBox}>
                <Text style={styles.tip}>{aiResult}</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>💬 AI Garden Chat</Text>
            {chat.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={m.role === 'user' ? styles.userTxt : styles.tip}>{m.text}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TextInput
                placeholder="Ask about your plants, soil, pests..."
                value={question}
                onChangeText={setQuestion}
                style={[styles.search, { flex: 1 }]}
                onSubmitEditing={sendChat}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={sendChat} disabled={busy}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {sub === 'library' && (
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
      )}

      {sub === 'diagnose' && (
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
  segText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  segOnText: { color: '#ffffff' },
  list: { padding: 14, gap: 12, paddingBottom: 40 },
  search: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dcfce7', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', color: '#14532d' },
  sci: { fontSize: 12, fontStyle: 'italic', color: '#64748b' },
  addBtn: { backgroundColor: '#15803d', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  actionBtn: { backgroundColor: '#15803d', paddingVertical: 11, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  preview: { width: '100%', height: 200, borderRadius: 12, marginTop: 4 },
  resultBox: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#a7f3d0' },
  bubble: { borderRadius: 12, padding: 10, maxWidth: '90%' },
  userBubble: { backgroundColor: '#15803d', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#f1f5f9', alignSelf: 'flex-start' },
  userTxt: { color: '#ffffff', fontSize: 13, lineHeight: 19 },
  sendBtn: { backgroundColor: '#15803d', paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center' },
  badge: { fontSize: 12, fontWeight: '700', color: '#065f46', backgroundColor: '#ecfdf5', padding: 8, borderRadius: 8 },
  tip: { fontSize: 13, color: '#334155', lineHeight: 19 },
  comp: { fontSize: 12, color: '#475569', fontWeight: '600', marginTop: 2 },
  partRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  partChip: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#cbd5e1' },
  partChipOn: { backgroundColor: '#15803d', borderColor: '#15803d' },
  partText: { fontWeight: '700', color: '#334155', fontSize: 13 },
  partTextOn: { fontWeight: '700', color: '#ffffff', fontSize: 13 },
});