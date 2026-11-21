export type SeasonName = 'Summer' | 'Autumn' | 'Winter' | 'Spring';

export interface MonthlyPlantingEntry {
  crop: string;
  varietyHint: string;
  action: 'Sow Seed' | 'Plant Seedlings' | 'Plant Tubers / Slips' | 'Prune & Prep';
  months: number[]; // 1 = Jan ... 12 = Dec
  windowLabel: string;
  westernSydneyTip: string;
}

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getSeasonForMonth(month: number): SeasonName {
  if (month === 12 || month === 1 || month === 2) return 'Summer';
  if (month >= 3 && month <= 5) return 'Autumn';
  if (month >= 6 && month <= 8) return 'Winter';
  return 'Spring';
}

export function getSeasonNotes(month: number): string {
  const season = getSeasonForMonth(month);
  if (season === 'Summer') {
    return 'Western Sydney summers get hot and humid—water pots/beds early at dawn, mulch deeply, and use afternoon shade cloth on 35°C+ days.';
  }
  if (season === 'Autumn') {
    return 'Warm soil with milder sun makes early–mid autumn ideal for cool-season greens, brassicas, root crops, and garlic/onion prep before cooler nights.';
  }
  if (season === 'Winter') {
    return 'Cool days and frosty pockets in Western Sydney suit broad beans, peas, brassicas, and bare-root/fruit tree planting while tender chillies/tomatoes rest or overwinter.';
  }
  return 'Warming soil in spring wakes up tomatoes, chillies, capsicums, cucumbers, zucchinis, and herbs—harden off tender starts and watch for sudden heat spikes.';
}

export const WESTERN_SYDNEY_CALENDAR: MonthlyPlantingEntry[] = [
  {
    crop: 'Tomato',
    varietyHint: 'Cherry, Roma, Beefsteak',
    action: 'Plant Seedlings',
    months: [8, 9, 10, 11, 12, 1],
    windowLabel: 'Aug–Jan (best Aug–Nov)',
    westernSydneyTip: 'Plant deep in rich mix; add afternoon shade cloth once summer heat climbs past 35°C.',
  },
  {
    crop: 'Chilli & Capsicum',
    varietyHint: 'Jalapeño, Cayenne, Habanero, Bell',
    action: 'Plant Seedlings',
    months: [9, 10, 11, 12],
    windowLabel: 'Sep–Dec',
    westernSydneyTip: 'Love warm soil; give afternoon shade above 36–38°C to prevent flower and fruit drop.',
  },
  {
    crop: 'Cucumber & Zucchini',
    varietyHint: 'Lebanese, Bush/Trailing Zucchini',
    action: 'Sow Seed',
    months: [9, 10, 11, 12, 1, 2],
    windowLabel: 'Sep–Feb',
    westernSydneyTip: 'Direct sow in warm soil or large pots; water at the soil base in the morning to curb mildew.',
  },
  {
    crop: 'Sweet Potato',
    varietyHint: 'Gold, Red, Beauregard Slips',
    action: 'Plant Tubers / Slips',
    months: [10, 11, 12, 1],
    windowLabel: 'Oct–Jan',
    westernSydneyTip: 'Thrives in Western Sydney heat in deep pots or raised beds; harvest before May frosts.',
  },
  {
    crop: 'Basil, Mint & Lemongrass',
    varietyHint: 'Genovese, Greek, Spearmint, Lemongrass',
    action: 'Plant Seedlings',
    months: [9, 10, 11, 12, 1, 2],
    windowLabel: 'Sep–Feb',
    westernSydneyTip: 'Keep mint contained in its own pot; give basil afternoon shade on 40°C days.',
  },
  {
    crop: 'Spinach, Bok Choy & Leafy Greens',
    varietyHint: 'Ironman Spinach, Shanghai Bok Choy',
    action: 'Sow Seed',
    months: [3, 4, 5, 6, 7, 8],
    windowLabel: 'Mar–Aug',
    westernSydneyTip: 'Bolts quickly in hot sun—best in cooler months or lightly shaded spots in early autumn/late winter.',
  },
  {
    crop: 'Broccoli, Cabbage & Brussels Sprouts',
    varietyHint: 'Sprouting Broccoli, Sugarloaf',
    action: 'Plant Seedlings',
    months: [3, 4, 5, 6],
    windowLabel: 'Mar–Jun',
    westernSydneyTip: 'Net early against cabbage moths/caterpillars; cool nights give crisp heads and sprouts.',
  },
  {
    crop: 'Snow Peas & Broad Beans',
    varietyHint: 'Sugar/Snow Peas, Coles Dwarf',
    action: 'Sow Seed',
    months: [3, 4, 5, 6],
    windowLabel: 'Mar–Jun',
    westernSydneyTip: 'Great cool-season soil builders; give trellising or wind shelter in exposed spots.',
  },
  {
    crop: 'Carrot, Beetroot & Spring Onion',
    varietyHint: 'Purple/Orange Carrot, Bunching Onion',
    action: 'Sow Seed',
    months: [2, 3, 4, 5, 6, 7, 8, 9],
    windowLabel: 'Feb–Sep',
    westernSydneyTip: 'Keep seedbeds consistently moist until germination; loosen soil well for straight roots.',
  },
  {
    crop: 'Garlic & Shallots',
    varietyHint: 'Hardneck/Softneck Cloves, Eschalots',
    action: 'Plant Tubers / Slips',
    months: [3, 4, 5],
    windowLabel: 'Mar–May',
    westernSydneyTip: 'Plant plump cloves pointy-end up in free-draining soil so they get winter chill before bulbing.',
  },
  {
    crop: 'Potatoes',
    varietyHint: 'Dutch Cream, Desiree, Royal Blue',
    action: 'Plant Tubers / Slips',
    months: [1, 2, 7, 8, 9],
    windowLabel: 'Jul–Sep (spring) & Jan–Feb (late summer)',
    westernSydneyTip: 'Hill up stems or top up soil/straw as shoots grow to keep tubers covered and green-free.',
  },
  {
    crop: 'Fruit Trees & Strawberries',
    varietyHint: 'Citrus, Berry Bushes, Strawberry Runners',
    action: 'Prune & Prep',
    months: [6, 7, 8],
    windowLabel: 'Jun–Aug (planting/pruning)',
    westernSydneyTip: 'Ideal winter window for planting bare-root/potted fruit trees and pruning deciduous trees.',
  },
];

export function getPlantingForMonth(month: number): MonthlyPlantingEntry[] {
  return WESTERN_SYDNEY_CALENDAR.filter(entry => entry.months.includes(month));
}
