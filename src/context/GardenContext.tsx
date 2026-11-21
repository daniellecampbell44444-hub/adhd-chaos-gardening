import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  { id: 'jal', name: 'Jalapeño Chilli', scientific: 'Capsicum annuum', category: 'Chilli', potMm: 350, potL: 20, tempMin: 20, tempMax: 32, heatTip: 'Afternoon shade in >36°C heat stops blossom drop.', frostTip: 'Shelter or overwinter before winter frosts.', friends: ['Basil', 'Tomato', 'Oregano'], enemies: ['Fennel', 'Beans'], audPerKg: 26.0 },
  { id: 'hab', name: 'Habanero Chilli', scientific: 'Capsicum chinense', category: 'Chilli', potMm: 380, potL: 25, tempMin: 22, tempMax: 34, heatTip: 'Give dappled afternoon shade above 38°C.', frostTip: 'Very frost-sensitive; shelter on cold nights.', friends: ['Basil', 'Marigold', 'Chives'], enemies: ['Fennel'], audPerKg: 32.0 },
  { id: 'cay', name: 'Cayenne Chilli', scientific: 'Capsicum annuum', category: 'Chilli', potMm: 320, potL: 18, tempMin: 20, tempMax: 32, heatTip: 'Keep soil evenly moist during fruiting; mulch deeply.', frostTip: 'Protect young plants below 5°C.', friends: ['Basil', 'Carrot', 'Tomato'], enemies: ['Fennel'], audPerKg: 28.0 },
  { id: 'bro', name: 'Broccoli', scientific: 'Brassica oleracea var. italica', category: 'Vegetable', potMm: 350, potL: 22, tempMin: 12, tempMax: 24, heatTip: 'Heat makes heads bolt; best in cooler months.', frostTip: 'Handles light frosts once established.', friends: ['Dill', 'Chamomile', 'Onion'], enemies: ['Strawberry', 'Tomato'], audPerKg: 7.5 },
  { id: 'oni', name: 'Spring Onion', scientific: 'Allium fistulosum', category: 'Vegetable', potMm: 220, potL: 8, tempMin: 12, tempMax: 26, heatTip: 'Keep consistently damp in warm weather.', frostTip: 'Hardy; grows slowly through cold snaps.', friends: ['Carrot', 'Tomato', 'Lettuce'], enemies: ['Peas', 'Beans'], audPerKg: 10.0 },
  { id: 'egg', name: 'Eggplant', scientific: 'Solanum melongena', category: 'Vegetable', potMm: 400, potL: 30, tempMin: 20, tempMax: 32, heatTip: 'Thrives in summer heat; water at the base.', frostTip: 'Frost-tender; wait until warm weather settles.', friends: ['Beans', 'Thyme', 'Spinach'], enemies: ['Fennel'], audPerKg: 8.5 },
  { id: 'thy', name: 'Thyme', scientific: 'Thymus vulgaris', category: 'Herb', potMm: 220, potL: 6, tempMin: 12, tempMax: 30, heatTip: 'Use free-draining soil; avoid waterlogging.', frostTip: 'Hardy in mild frosts once established.', friends: ['Cabbage', 'Strawberry', 'Tomato'], enemies: ['None'], audPerKg: 38.0 },
  { id: 'ros', name: 'Rosemary', scientific: 'Salvia rosmarinus', category: 'Herb', potMm: 300, potL: 15, tempMin: 12, tempMax: 32, heatTip: 'Let top soil dry slightly between waterings.', frostTip: 'Hardy in light frosts.', friends: ['Bean', 'Carrot', 'Sage'], enemies: ['None'], audPerKg: 30.0 },
  { id: 'min', name: 'Mint', scientific: 'Mentha', category: 'Herb', potMm: 300, potL: 15, tempMin: 12, tempMax: 28, heatTip: 'Give afternoon shade in extreme heat.', frostTip: 'Dies back lightly in cold and rebounds in spring.', friends: ['Tomato', 'Cabbage'], enemies: ['Parsley'], audPerKg: 34.0 },
// Extra Chillies (note: 'Chilli' category feeds into getSmartFeed & companion checks)
  {
    id: 'jal',
    name: 'Jalapeño Chilli',
    scientific: 'Capsicum annuum',
    category: 'Chilli',
    potMm: 350,
    potL: 20,
    tempMin: 20,
    tempMax: 32,
    heatTip: 'Afternoon shade in >36°C heat stops blossom drop and sunscald.',
    frostTip: 'Shelter or overwinter in a protected spot before winter frosts.',
    friends: ['Basil', 'Tomato', 'Oregano'],
    enemies: ['Fennel', 'Beans'],
    audPerKg: 26.0,
  },
  {
    id: 'hab',
    name: 'Habanero Chilli',
    scientific: 'Capsicum chinense',
    category: 'Chilli',
    potMm: 380,
    potL: 25,
    tempMin: 22,
    tempMax: 34,
    heatTip: 'Loves warmth, but give dappled afternoon shade above 38°C.',
    frostTip: 'Very frost-sensitive; bring pots under cover on cold nights.',
    friends: ['Basil', 'Marigold', 'Chives'],
    enemies: ['Fennel'],
    audPerKg: 32.0,
  },
  {
    id: 'cay',
    name: 'Cayenne Chilli',
    scientific: 'Capsicum annuum',
    category: 'Chilli',
    potMm: 320,
    potL: 18,
    tempMin: 20,
    tempMax: 32,
    heatTip: 'Keep soil evenly moist during fruiting; mulch pots deeply.',
    frostTip: 'Protect young or unhardened plants below 5°C.',
    friends: ['Basil', 'Carrot', 'Tomato'],
    enemies: ['Fennel'],
    audPerKg: 28.0,
  },

  // Extra Vegetables
  {
    id: 'bro',
    name: 'Broccoli',
    scientific: 'Brassica oleracea var. italica',
    category: 'Vegetable',
    potMm: 350,
    potL: 22,
    tempMin: 12,
    tempMax: 24,
    heatTip: 'Heat makes heads bolt or turn loose; best in cooler months.',
    frostTip: 'Handles light frosts once established.',
    friends: ['Dill', 'Chamomile', 'Onion'],
    enemies: ['Strawberry', 'Tomato', 'Pole Beans'],
    audPerKg: 7.5,
  },
  {
    id: 'oni',
    name: 'Spring Onion',
    scientific: 'Allium fistulosum',
    category: 'Vegetable',
    potMm: 220,
    potL: 8,
    tempMin: 12,
    tempMax: 26,
    heatTip: 'Keep consistently damp in warm weather so stalks stay tender.',
    frostTip: 'Fairly hardy; grows slowly through cold snaps.',
    friends: ['Carrot', 'Tomato', 'Lettuce'],
    enemies: ['Peas', 'Beans'],
    audPerKg: 10.0,
  },
  {
    id: 'egg',
    name: 'Eggplant',
    scientific: 'Solanum melongena',
    category: 'Vegetable',
    potMm: 400,
    potL: 30,
    tempMin: 20,
    tempMax: 32,
    heatTip: 'Thrives in summer heat; water at the base to protect foliage.',
    frostTip: 'Frost-tender; wait until warm weather settles.',
    friends: ['Beans', 'Thyme', 'Spinach'],
    enemies: ['Fennel'],
    audPerKg: 8.5,
  },

  // Extra Herbs
  {
    id: 'thy',
    name: 'Thyme',
    scientific: 'Thymus vulgaris',
    category: 'Herb',
    potMm: 220,
    potL: 6,
    tempMin: 12,
    tempMax: 30,
    heatTip: 'Uses free-draining soil; avoid waterlogging in summer storms.',
    frostTip: 'Hardy in mild frosts once established.',
    friends: ['Cabbage', 'Strawberry', 'Tomato'],
    enemies: ['None'],
    audPerKg: 38.0,
  },
  {
    id: 'ros',
    name: 'Rosemary',
    scientific: 'Salvia rosmarinus',
    category: 'Herb',
    potMm: 300,
    potL: 15,
    tempMin: 12,
    tempMax: 32,
    heatTip: 'Tolerates heat well; let top soil dry slightly between waterings.',
    frostTip: 'Hardy in light frosts.',
    friends: ['Bean', 'Carrot', 'Sage'],
    enemies: ['None'],
    audPerKg: 30.0,
  },
  {
    id: 'min',
    name: 'Mint',
    scientific: 'Mentha',
    category: 'Herb',
    potMm: 300,
    potL: 15,
    tempMin: 12,
    tempMax: 28,
    heatTip: 'Give afternoon shade in extreme heat and keep soil moist.',
    frostTip: 'Dies back lightly in cold weather and rebounds in spring.',
    friends: ['Tomato', 'Cabbage'],
    enemies: ['Parsley'],
    audPerKg: 34.0,
  },];

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
  return { primary, boost, note: `${isPot ? 'Pot' : 'Bed'} dose: ${dose}${boost ? ` + ${boost.name} for ${plant.stage.toLowerCase()}` : ''}` };
}

export function checkPlantPlacementWarnings(
  candidate: { name: string; site: string; potSize: string },
  existingPlants: Plant[],
  library: LibraryPlant[] = PLANT_LIBRARY
) {
  const warnings: string[] = [];
  const highlights: string[] = [];

  const libMatch = library.find(
    item =>
      item.name.toLowerCase() === candidate.name.toLowerCase() ||
      candidate.name.toLowerCase().includes(item.name.toLowerCase())
  );

  const sameSitePlants = existingPlants.filter(
    p => p.site.trim().toLowerCase() === candidate.site.trim().toLowerCase()
  );

  if (libMatch) {
    for (const other of sameSitePlants) {
      const otherName = other.name.toLowerCase();
      const isEnemy = libMatch.enemies.some(
        e => e !== 'None' && (otherName.includes(e.toLowerCase()) || e.toLowerCase().includes(otherName))
      );
      const isFriend = libMatch.friends.some(
        f => otherName.includes(f.toLowerCase()) || f.toLowerCase().includes(otherName)
      );

      if (isEnemy) {
        warnings.push(
          `${candidate.name} and ${other.variety} ${other.name} in "${candidate.site}" aren't ideal neighbours.`
        );
      }
      if (isFriend) {
        highlights.push(
          `Great buddy nearby: ${other.variety} ${other.name} in "${candidate.site}".`
        );
      }
    }

    const isContainer =
      candidate.site.toLowerCase().includes('pot') || candidate.site.toLowerCase().includes('bag');
    if (isContainer) {
      const litreMatch = candidate.potSize.match(/(\d+(?:\.\d+)?)\s*L/i);
      const mmMatch = candidate.potSize.match(/(\d+)\s*mm/i);
      const chosenL = litreMatch ? Number(litreMatch[1]) : null;
      const chosenMm = mmMatch ? Number(mmMatch[1]) : null;

      if (chosenL !== null && chosenL < libMatch.potL) {
        warnings.push(
          `${candidate.name} likes ~${libMatch.potL}L (${libMatch.potMm}mm) — this container is ${chosenL}L, so it may dry out faster.`
        );
      } else if (chosenMm !== null && chosenMm < libMatch.potMm) {
        warnings.push(
          `${candidate.name} prefers at least ${libMatch.potMm}mm (${libMatch.potL}L) width — ${chosenMm}mm is snug.`
        );
      }
    }
  }

  return { warnings, highlights };
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
  addReminder: (title: string, due: string) => void; toggleReminder: (id: string) => void; catchUpReminders: () => void;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
        const payload = { plants, fertilizers, seeds, harvests, expenses, reminders };
        const { error: upErr } = await supabase
          .from('gardens')
          .upsert({ user_id: user.id, data: payload, updated_at: new Date().toISOString() });
        setSyncStatus(upErr ? 'error' : 'synced');
      }
    })();
    return () => { active = false; };
  }, [user, loaded]);

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
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    return error ? error.message : null;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? error.message : null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSyncStatus('local');
  };

  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const stages: Stage[] = ['Seedling', 'Growing', 'Flowering', 'Fruiting', 'Dormant'];

  const addPlant = (p: Omit<Plant, 'id'>) => setPlants(prev => [{ ...p, id: uid() }, ...prev]);
  const updatePlantQty = (id: string, delta: number) => setPlants(prev => prev.map(p => p.id === id ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p));
  const cyclePlantStage = (id: string) => setPlants(prev => prev.map(p => p.id === id ? { ...p, stage: stages[(stages.indexOf(p.stage) + 1) % stages.length] } : p));
  const deletePlant = (id: string) => setPlants(prev => prev.filter(p => p.id !== id));
  const waterPlant = (id: string) => setPlants(prev => prev.map(p => p.id === id ? { ...p, lastWatered: today() } : p));
  const feedPlant = (id: string) => setPlants(prev => prev.map(p => p.id === id ? { ...p, lastFed: today() } : p));
  const waterAll = () => setPlants(prev => prev.map(p => ({ ...p, lastWatered: today() })));
  const feedAll = () => setPlants(prev => prev.map(p => p.stage === 'Dormant' ? p : { ...p, lastFed: today() }));
  const addFertilizer = (f: Omit<Fertilizer, 'id'>) => setFertilizers(prev => [{ ...f, id: uid() }, ...prev]);
  const deleteFertilizer = (id: string) => setFertilizers(prev => prev.filter(f => f.id !== id));
  const addSeed = (s: Omit<SeedItem, 'id'>) => setSeeds(prev => [{ ...s, id: uid() }, ...prev]);
  const updateSeedCount = (id: string, field: 'packets' | 'approxSeeds', delta: number) =>
    setSeeds(prev => prev.map(s => s.id === id ? { ...s, [field]: Math.max(0, s[field] + delta) } : s));
  const sowSeed = (id: string) => {
    const s = seeds.find(x => x.id === id);
    if (!s) return;
    const m = PLANT_LIBRARY.find(l => s.name.toLowerCase().includes(l.name.toLowerCase()));
    addPlant({ name: s.name, variety: s.variety || 'Standard', scientific: m?.scientific || '', category: m?.category || 'Vegetable', quantity: 1, site: 'Pots', stage: 'Seedling', potSize: m ? `${m.potMm}mm (${m.potL}L)` : '300mm (15L)', idealTemp: m ? `${m.tempMin}–${m.tempMax}°C` : '16–28°C', waterEveryDays: 2 });
    updateSeedCount(id, 'approxSeeds', -5);
  };
  const deleteSeed = (id: string) => setSeeds(prev => prev.filter(s => s.id !== id));
  const addHarvest = (crop: string, grams: number, valueAud?: number) => {
    const m = PLANT_LIBRARY.find(l => crop.toLowerCase().includes(l.name.toLowerCase()));
    const est = valueAud ?? Number(((grams / 1000) * (m?.audPerKg || 8)).toFixed(2));
    setHarvests(prev => [{ id: uid(), crop, grams, valueAud: est, date: today() }, ...prev]);
  };
  const addExpense = (item: string, category: string, costAud: number) => setExpenses(prev => [{ id: uid(), item, category, costAud, date: today() }, ...prev]);
  const addReminder = (title: string, due: string) => setReminders(prev => [{ id: uid(), title, due, done: false }, ...prev]);
  const toggleReminder = (id: string) => setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r));
  const catchUpReminders = () =>
    setReminders(prev => prev.map(r => (r.done ? r : { ...r, due: 'Rescheduled — Today' })));

  const loadSampleGarden = () => {
    setPlants([
      { id: uid(), name: 'Tomato', variety: 'Tommy Toe', scientific: 'Solanum lycopersicum', category: 'Vegetable', quantity: 4, site: 'Raised Beds', stage: 'Fruiting', potSize: '400mm (35L)', idealTemp: '18–29°C', waterEveryDays: 2, lastWatered: today() },
      { id: uid(), name: 'Chilli', variety: 'Jalapeño', scientific: 'Capsicum annuum', category: 'Chilli', quantity: 3, site: 'Pots', stage: 'Flowering', potSize: '350mm (20L)', idealTemp: '20–32°C', waterEveryDays: 2 },
      { id: uid(), name: 'Dwarf Meyer Lemon', variety: 'Meyer', scientific: 'Citrus × meyeri', category: 'Fruit', quantity: 1, site: 'Pots', stage: 'Fruiting', potSize: '500mm (60L)', idealTemp: '15–30°C', waterEveryDays: 3 },
      { id: uid(), name: 'Strawberry', variety: 'Albion', scientific: 'Fragaria × ananassa', category: 'Fruit', quantity: 6, site: 'Standing Bed', stage: 'Fruiting', potSize: '250mm (10L)', idealTemp: '14–26°C', waterEveryDays: 2 },
      { id: uid(), name: 'Spinach', variety: 'Ironman', scientific: 'Spinacia oleracea', category: 'Leafy', quantity: 8, site: 'Raised Beds', stage: 'Growing', potSize: '250mm (10L)', idealTemp: '10–22°C', waterEveryDays: 2 },
      { id: uid(), name: 'Bok Choy', variety: 'Shanghai', scientific: 'Brassica rapa', category: 'Leafy', quantity: 5, site: 'Front Yard', stage: 'Seedling', potSize: '250mm (10L)', idealTemp: '12–24°C', waterEveryDays: 2 },
    ]);
    setFertilizers(AUSSIE_FERT_PRESETS.slice(0, 4).map(f => ({ ...f, id: uid() })));
    setSeeds([
      { id: uid(), name: 'Tomato', variety: 'Black Krim', packets: 2, approxSeeds: 60, season: 'Spring/Summer', wishlist: false },
      { id: uid(), name: 'Chilli', variety: 'Carolina Reaper', packets: 1, approxSeeds: 15, season: 'Spring', wishlist: false },
      { id: uid(), name: 'Zucchini', variety: 'Gold Max', packets: 1, approxSeeds: 20, season: 'Spring/Summer', wishlist: false },
      { id: uid(), name: 'Blueberry', variety: 'Sunshine Blue', packets: 0, approxSeeds: 0, season: 'Winter/Spring', wishlist: true },
    ]);
    setHarvests([
      { id: uid(), crop: 'Tommy Toe Tomato', grams: 850, valueAud: 6.38, date: today() },
      { id: uid(), crop: 'Strawberry', grams: 400, valueAud: 6.40, date: today() },
    ]);
    setExpenses([{ id: uid(), item: 'Sugar Cane Mulch Bale', category: 'Soil', costAud: 16.00, date: today() }]);
    setReminders([
      { id: uid(), title: 'Deep soak pots before 38°C afternoon', due: 'Today 7:00 AM', done: false },
      { id: uid(), title: 'Feed fruiting tomatoes with Potash', due: 'Sunday', done: false },
    ]);
  };

  return (
    <GardenContext.Provider value={{
      plants, fertilizers, seeds, harvests, expenses, reminders,
      user, syncStatus, signUp, signIn, signOut,
      addPlant, updatePlantQty, cyclePlantStage, deletePlant, waterPlant, feedPlant, waterAll, feedAll,
      addFertilizer, deleteFertilizer, addSeed, updateSeedCount, sowSeed, deleteSeed,
      addHarvest, addExpense, addReminder, toggleReminder, catchUpReminders, loadSampleGarden,
    }}>
      {children}
    </GardenContext.Provider>
  );
}

export function useGarden() {
  const ctx = useContext(GardenContext);
  if (!ctx) throw new Error('useGarden must be inside GardenProvider');
  return ctx;
}
