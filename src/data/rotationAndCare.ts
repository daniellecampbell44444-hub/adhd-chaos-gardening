import { SeasonName } from './westernSydneyCalendar';

export type CropFamily =
  | 'Solanaceae (Tomato / Chilli / Capsicum / Eggplant)'
  | 'Brassicaceae (Broccoli / Cabbage / Bok Choy)'
  | 'Cucurbitaceae (Cucumber / Zucchini / Melon / Pumpkin)'
  | 'Legumes & Roots (Peas / Beans / Carrot / Onion / Garlic)'
  | 'Perennials & Herbs (Citrus / Berry / Basil / Mint / Lemon)';

export interface RotationRule {
  family: CropFamily;
  shortLabel: string;
  restYearsRecommended: number;
  followWith: string;
  soilNote: string;
}

export interface YardChecklistItem {
  id: string;
  title: string;
  seasons: SeasonName[];
  zoneTag: string;
  detail: string;
}

export const CROP_ROTATION_RULES: RotationRule[] = [
  {
    family: 'Solanaceae (Tomato / Chilli / Capsicum / Eggplant)',
    shortLabel: 'Nightshades (Tomato, Chilli, Capsicum)',
    restYearsRecommended: 2,
    followWith: 'Legumes & Roots or Leafy Greens',
    soilNote: 'Heavy feeders—top up compost and potash; rotate beds to reduce soil-borne disease and root pests.',
  },
  {
    family: 'Brassicaceae (Broccoli / Cabbage / Bok Choy)',
    shortLabel: 'Brassicas (Broccoli, Cabbage, Bok Choy)',
    restYearsRecommended: 2,
    followWith: 'Roots, Alliums, or Fruiting Crops',
    soilNote: 'Likes steady nitrogen and lime/calcium balance; net early against white cabbage butterfly and caterpillars.',
  },
  {
    family: 'Cucurbitaceae (Cucumber / Zucchini / Melon / Pumpkin)',
    shortLabel: 'Cucurbits (Cucumber, Zucchini, Melon)',
    restYearsRecommended: 1,
    followWith: 'Roots or Leafy Greens',
    soilNote: 'Hungry and water-thirsty in Western Sydney heat—mulch deeply and keep leaves dry when watering.',
  },
  {
    family: 'Legumes & Roots (Peas / Beans / Carrot / Onion / Garlic)',
    shortLabel: 'Legumes & Roots (Peas, Beans, Carrot)',
    restYearsRecommended: 1,
    followWith: 'Nightshades or Brassicas',
    soilNote: 'Legumes help rebuild nitrogen; root crops prefer loose, uncompacted soil without fresh heavy manure right before sowing.',
  },
  {
    family: 'Perennials & Herbs (Citrus / Berry / Basil / Mint / Lemon)',
    shortLabel: 'Perennials & Herbs (Citrus, Berry, Herbs)',
    restYearsRecommended: 0,
    followWith: 'Stay Put (or Keep Mint in Own Pot)',
    soilNote: 'Don’t dig up permanent trees, berries, or perennial herbs every season—refresh top mulch and feed seasonally.',
  },
];

export const WESTERN_SYDNEY_YARD_CHECKLIST: YardChecklistItem[] = [
  {
    id: 'ws-spring-1',
    title: 'Refresh drip lines, emitters & pot saucers before warm spells',
    seasons: ['Spring', 'Summer'],
    zoneTag: 'Pots & Drip System',
    detail: 'Check for clogged drippers, loose tubing, and dry pot corners before Western Sydney temperatures climb.',
  },
  {
    id: 'ws-spring-2',
    title: 'Top up sugarcane or pea-straw mulch over bare soil',
    seasons: ['Spring', 'Autumn'],
    zoneTag: 'Raised Beds & Pots',
    detail: 'Keep mulch a few centimetres clear of tender stems and tree trunks while locking in soil moisture.',
  },
  {
    id: 'ws-summer-1',
    title: 'Deep soak containers early at dawn on 35°C+ days',
    seasons: ['Summer', 'Spring'],
    zoneTag: 'Heatwave Prep',
    detail: 'Water thoroughly in the cool morning rather than light splashes; deploy shade cloth on harsh western afternoons.',
  },
  {
    id: 'ws-summer-2',
    title: 'Prune lower spent leaves & check undersides for mites/pests',
    seasons: ['Summer', 'Autumn'],
    zoneTag: 'Canopy & Airflow',
    detail: 'Improves airflow around tomatoes, chillies, and cucurbits and spots early pest/leaf-curl issues fast.',
  },
  {
    id: 'ws-autumn-1',
    title: 'Clear summer-spent crops & plan next bed rotation',
    seasons: ['Autumn'],
    zoneTag: 'Bed Rotation',
    detail: 'Pull exhausted warm-season beds, top with compost, and rotate cool-season greens, brassicas, or garlic/shallots.',
  },
  {
    id: 'ws-autumn-2',
    title: 'Shelter tender chillies & basil ahead of cool nights',
    seasons: ['Autumn', 'Winter'],
    zoneTag: 'Cold & Frost Prep',
    detail: 'Move vulnerable pots to a sheltered microclimate or prep frost cloth before Western Sydney’s coldest snaps.',
  },
  {
    id: 'ws-winter-1',
    title: 'Prune deciduous fruit trees & feed citrus/berries',
    seasons: ['Winter'],
    zoneTag: 'Fruit & Perennials',
    detail: 'Winter is ideal for structural pruning on dormant fruit trees and feeding citrus/berries for spring flush.',
  },
  {
    id: 'ws-winter-2',
    title: 'Plan spring seed & pot layout while growth slows',
    seasons: ['Winter', 'Spring'],
    zoneTag: 'Seed & Pot Planning',
    detail: 'Check seed packets, pot sizes, and companion pairings before spring planting ramps up.',
  },
];

export function getChecklistForSeason(season: SeasonName): YardChecklistItem[] {
  return WESTERN_SYDNEY_YARD_CHECKLIST.filter(item => item.seasons.includes(season));
}
