import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Category = 'Vegetable' | 'Chilli' | 'Fruit' | 'Herb' | 'Leafy';
export type Stage = 'Seedling' | 'Growing' | 'Flowering' | 'Fruiting' | 'Dormant';
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export interface LibraryPlant {
  id: string; name: string; scientific: string; category: Category;
  potMm: number; potL: number; tempMin: number; tempMax: number;
  heatTip: string; frostTip: string; friends: string[]; enemies: string[]; audPerKg: number;
}
export interface Plant {
  id: string; name: string; variety: string; scientific: string; category: Category;
  quantity: number; site: string; stage: Stage; potSize: string; idealTemp: string;
  waterEveryDays: number; lastWatered?: string; lastFed?: string;
}
export interface Fertilizer {
  id: string; brand: string; name: string; feedType: 'Liquid' | 'Granular' | 'Organic' | 'Potash Boost';
  targets: string[]; potDosage: string; bedDosage: string; freqDays: number;
}
export interface SeedItem {
  id: string; name: string; variety: string; packets: number; approxSeeds: number; season: string; wishlist: boolean;
}
export interface HarvestLog { id: string; crop: string; grams: number; valueAud: number; date: string; }
export interface ExpenseLog { id: string; item: string; category: string; costAud: number; date: string; }
export interface Reminder { id: string; title: string; due: string; done: boolean; }

export const PLANT_LIBRARY: LibraryPlant[] = [
  { id: 'tom', name: 'Tomato', scientific: 'Solanum lycopersicum', category: 'Vegetable', potMm: 400, potL: 35, tempMin: 18, tempMax: 29, heatTip: '30% shade cloth >35°C; mulch deeply & water base at dawn.', frostTip: 'Frost-tender; protect below 5°C.', friends: ['Basil', 'Marigold', 'Carrot'], enemies: ['Potato', 'Fennel'], audPerKg: 7.5 },
  { id: 'chi', name: 'Chilli', scientific: 'Capsicum annuum', category: 'Chilli', potMm: 350, potL: 20, tempMin: 20, tempMax: 32, heatTip: 'Flowers drop >38°C; afternoon shade helps.', frostTip: 'Overwinter in sheltered spot before July frosts.', friends: ['Basil', 'Tomato', 'Oregano'], enemies: ['Fennel', 'Beans'], audPerKg: 28.0 },
  { id: 'cap', name: 'Capsicum', scientific: 'Capsicum annuum', category: 'Vegetable', potMm: 350, potL: 20, tempMin: 18, tempMax: 30, heatTip: 'Shade fruit on western afternoons >38°C.', frostTip: 'Cover with frost cloth <4°C.', friends: ['Basil', 'Onion', 'Carrot'], enemies: ['Fennel'], audPerKg: 9.0 },
  { id: 'lem', name: 'Dwarf Meyer Lemon', scientific: 'Citrus × meyeri', category: 'Fruit', potMm: 500, potL: 60, tempMin: 15, tempMax: 30, heatTip: 'Deep soak every 2nd day in heatwaves; keep mulch off trunk.', frostTip: 'Protect young trees <2°C.', friends: ['Nasturtium', 'Marigold', 'Garlic'], enemies: ['Fennel'], audPerKg: 6.5 },
  { id: 'str', name: 'Strawberry', scientific: 'Fragaria × ananassa', category: 'Fruit', potMm: 250, potL: 10, tempMin: 14, tempMax: 26, heatTip: 'Move pots to dappled shade >35°C.', frostTip: 'Frost-hardy in Western Sydney.', friends: ['Spinach', 'Borage', 'Thyme'], enemies: ['Brassicas'], audPerKg: 16.0 },
  { id: 'blu', name: 'Blueberry', scientific: 'Vaccinium corymbosum', category: 'Fruit', potMm: 450, potL: 45, tempMin: 14, tempMax: 28, heatTip: 'Acidic azalea mix; never let roots dry >35°C.', frostTip: 'Loves Western Sydney winter chill.', friends: ['Thyme', 'Basil', 'Strawberry'], enemies: ['Tomato'], audPerKg: 24.0 },
  { id: 'spi', name: 'Spinach', scientific: 'Spinacia oleracea', category: 'Leafy', potMm: 250, potL: 10, tempMin: 10, tempMax: 22, heatTip: 'Bolts fast >28°C; grow autumn–winter.', frostTip: 'Frost-hardy; cold sweetens leaves.', friends: ['Strawberry', 'Peas', 'Radish'], enemies: ['Potato'], audPerKg: 14.0 },
  { id: 'bok', name: 'Bok Choy', scientific: 'Brassica rapa', category: 'Leafy', potMm: 250, potL: 10, tempMin: 12, tempMax: 24, heatTip: 'Best sown March–August.', frostTip: 'Handles light frosts well.', friends: ['Onion', 'Garlic', 'Beetroot'], enemies: ['Strawberry', 'Tomato'], audPerKg: 8.0 },
  { id: 'cuc', name: 'Cucumber', scientific: 'Cucumis sativus', category: 'Vegetable', potMm: 400, potL: 30, tempMin: 18, tempMax: 30, heatTip: 'Water mornings only to prevent powdery mildew.', frostTip: 'Warm-season only.', friends: ['Beans', 'Peas', 'Nasturtium'], enemies: ['Potato', 'Sage'], audPerKg: 7.0 },
  { id: 'zuc', name: 'Zucchini', scientific: 'Cucurbita pepo', category: 'Vegetable', potMm: 450, potL: 45, tempMin: 18, tempMax: 30, heatTip: 'Water soil deeply at dawn on 38°C days.', frostTip: 'Plant Sept–Feb.', friends: ['Corn', 'Beans', 'Nasturtium'], enemies: ['Potato'], audPerKg: 6.5 },
  { id: 'swp', name: 'Sweet Potato', scientific: 'Ipomoea batatas', category: 'Vegetable', potMm: 500, potL: 65, tempMin: 21, tempMax: 34, heatTip: 'Thrives in Western Sydney summers.', frostTip: 'Harvest before May frosts.', friends: ['Beans', 'Thyme'], enemies: ['Squash'], audPerKg: 5.0 },
  { id: 'car', name: 'Carrot', scientific: 'Daucus carota', category: 'Vegetable', potMm: 300, potL: 18, tempMin: 12, tempMax: 24, heatTip: 'Keep seedbed damp until sprouted.', frostTip: 'Frost-hardy; sweet in winter.', friends: ['Tomato', 'Onion', 'Lettuce'], enemies: ['Dill', 'Fennel'], audPerKg: 3.5 },
  { id: 'pea', name: 'Snow Peas', scientific: 'Pisum sativum', category: 'Vegetable', potMm: 300, potL: 15, tempMin: 10, tempMax: 22, heatTip: 'Sow March–July.', frostTip: 'Tolerates light frosts.', friends: ['Carrot', 'Spinach', 'Radish'], enemies: ['Onion', 'Garlic'], audPerKg: 14.0 },
  { id: 'lmg', name: 'Lemongrass', scientific: 'Cymbopogon citratus', category: 'Herb', potMm: 400, potL: 35, tempMin: 18, tempMax: 34, heatTip: 'Loves full sun & summer water.', frostTip: 'Cut back brown tips in spring.', friends: ['Chilli', 'Tomato'], enemies: ['None'], audPerKg: 18.0 },
  { id: 'bas', name: 'Sweet Basil', scientific: 'Ocimum basilicum', category: 'Herb', potMm: 200, potL: 6, tempMin: 18, tempMax: 30, heatTip: 'Afternoon shade on 40°C days.', frostTip: 'Blackens <5°C; shelter near brick wall.', friends: ['Tomato', 'Chilli', 'Capsicum'], enemies: ['Rue'], audPerKg: 35.0 },
];

export const AUSSIE_FERT_PRESETS: Omit<Fertilizer, 'id'>[] = [
  { brand: 'Seasol', name: 'Seaweed Health Tonic', feedType: 'Organic', targets: ['All', 'Seedling'], potDosage: '30mL / 9L can', bedDosage: '40mL / 9L can', freqDays: 14 },
  { brand: 'Yates Thrive', name: 'Tomato & Veg Liquid', feedType: 'Liquid', targets: ['Vegetable', 'Chilli', 'Leafy', 'Herb'], potDosage: '1 cap / 9L water', bedDosage: '2 caps / 9L water', freqDays: 10 },
  { brand: 'Richgro', name: 'Black Marvel Fruit & Citrus', feedType: 'Granular', targets: ['Fruit', 'Vegetable', 'Chilli'], potDosage: '1/2 scoop / pot', bedDosage: '100g / m²', freqDays: 28 },
  { brand: 'Neutrog', name: 'Sudden Impact for Fruiting', feedType: 'Potash Boost', targets: ['Fruit', 'Chilli', 'Vegetable'], potDosage: '30g around drip line', bedDosage: '80g / plant', freqDays: 28 },
  { brand: 'Manutec', name: 'Sulphate of Potash', feedType: 'Potash Boost', targets: ['Vegetable', 'Chilli', 'Fruit'], potDosage: '1 tsp / 9L water', bedDosage: '2 tsp / 9L water', freqDays: 14 },
];

export function getSmartFeed(plant: Plant, ferts: Fertilizer[]) {
  if (plant.stage === 'Dormant') return { primary: null, boost: null, note: 'Paused — plant is dormant for winter.' };
  if (ferts.length === 0) return { primary: null, boost: null, note: 'Add fertilisers in My Fertilisers to auto-match.' };
  const isPot = plant.site.toLowerCase().includes('pot') || plant.site.toLowerCase().includes('bag');
  if (plant.stage === 'Seedling') {
    const gentle = ferts.find(f => f.feedType === 'Organic' || f.targets.includes('Seedling')) || ferts.find(f => f.feedType === 'Liquid');
    return { primary: gentle || null, boost: null, note: gentle ? `Half-strength seedling safe (${isPot ? gentle.potDosage : gentle.bedDosage}).` : 'Use a gentle seaweed tonic.' };
  }
  const primary = ferts.find(f => f.feedType !== 'Potash Boost' && (f.targets.includes(plant.category) || f.targets.includes('All'))) || ferts[0];
  const needsBoost = plant.stage === 'Flowering' || plant.stage === 'Fruiting';
  const boost = needsBoost ? ferts.find(f => f.feedType === 'Potash Boost' && (f.targets.includes(plant.category) || f.targets.includes('All'))) || null : null;
  const dose = primary ? (isPot ? primary.potDosage : primary.bedDosage) : '';
  return { primary, boost, note: `${isPot ? 'Pot' : 'Bed'} dose: ${dose}${boost ? ` + ${boost.name} for${plant.stage.toLowerCase()}` : ''}` };
}

interface GardenContextType {
  plants: Plant[]; fertilizers: Fertilizer[]; seeds: SeedItem[]; harvests: HarvestLog[]; expenses: ExpenseLog[]; reminders: Reminder[];
  user: User | null; syncStatus: SyncStatus;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  addPlant: (p: Omit<Plant, 'id'>) => void; updatePlantQty: (id: string, delta: number) => void;
  cyclePlantStage: (id: string) => void; deletePlant: (id: string) => void;
  waterPlant: (id: string) => void; feedPlant: (id: string) => void; waterAll: () => void; feedAll: () => void;
  addFertilizer: (f: Omit<Fertilizer, 'id'>) => void; deleteFertilizer: (id: string) => void;
  addSeed: (s: Omit<SeedItem, 'id'>) => void; updateSeedCount: (id: string, field: 'packets' | 'approxSeeds', delta: number) => void;
  sowSeed: (id: string) => void; deleteSeed: (id: string) => void;
  addHarvest: (crop: string, grams: number, valueAud?: number) => void;
  addExpense: (item: string, category: string, costAud: number) => void;
  addReminder: (title: string, due: string) => void; toggleReminder: (id: string) => void;
  loadSampleGarden: () => void;
}

const GardenContext = createContext<GardenContextType | null>(null);
const STORAGE_KEY = 'adhd_chaos_gardening_v1';

export function GardenProvider({ children }: { children: React.ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [seeds, setSeeds] = useState<SeedItem[]>([]);
  const [harvests, setHarvests] = useState<HarvestLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const skipNextPush = useRef(false);

  // Load local backup first
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const d = JSON.parse(raw);
          setPlants(d.plants || []); setFertilizers(d.fertilizers || []); setSeeds(d.seeds || []);
          setHarvests(d.harvests || []); setExpenses(d.expenses || []); setReminders(d.reminders || []);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  // Listen to Supabase auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Pull cloud garden when user signs in
  useEffect(() => {
    if (!loaded || !user) {
      setSyncStatus('local');
      return;
    }
    let active = true;
    (async () => {
      setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('gardens')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setSyncStatus('error');
        return;
      }

      const cloud = data?.data as any;
      const hasCloudData = cloud && ((cloud.plants?.length || 0) > 0 || (cloud.seeds?.length || 0) > 0 || (cloud.harvests?.length || 0) > 0);
      if (hasCloudData) {
        skipNextPush.current = true;
        setPlants(cloud.plants || []);
        setFertilizers(cloud.fertilizers || []);
        setSeeds(cloud.seeds || []);
        setHarvests(cloud.harvests || []);
        setExpenses(cloud.expenses || []);
        setReminders(cloud.reminders || []);
        setSyncStatus('synced');
      } else {
        // Upload existing local garden to cloud on first sign-in
        const payload = { plants, fertilizers, seeds, harvests, expenses, reminders };
        const { error: upErr } = await supabase
          .from('gardens')
          .upsert({ user_id: user.id, data: payload, updated_at: new Date().toISOString() });
        setSyncStatus(upErr ? 'error' : 'synced');
      }
    })();
    return () => { active = false; };
  }, [user, loaded]);

  // Save locally + auto-sync to Supabase when signed in
  useEffect(() => {
    if (!loaded) return;
    const payload = { plants, fertilizers, seeds, harvests, expenses, reminders };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    if (!user) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }

    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from('gardens')
        .upsert({ user_id: user.id, data: payload, updated_at: new Date().toISOString() });
      setSyncStatus(error ? 'error' : 'synced');
    }, 600);

    return () => clearTimeout(timer);
  }, [plants, fertilizers, seeds, harvests, expenses, reminders, loaded, user]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase