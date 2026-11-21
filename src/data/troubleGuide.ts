export type TroubleCategory =
  | 'Leaf Curl & Distortion'
  | 'Yellowing & Pale Leaves'
  | 'Wilting & Heat Stress'
  | 'Chewed Leaves & Pests'
  | 'Spots, Powdery & Fungus'
  | 'Flower & Fruit Drop';

export interface TroubleEntry {
  id: string;
  title: string;
  category: TroubleCategory;
  affectedCrops: string[];
  symptoms: string;
  likelyCauses: string[];
  quickFixes: string[];
  reminderTitle: string;
}

export const TROUBLE_GUIDE: TroubleEntry[] = [
  {
    id: 'leaf-curl-mites-aphids',
    title: 'Curled or Bubbled New Leaves',
    category: 'Leaf Curl & Distortion',
    affectedCrops: ['Chilli', 'Capsicum', 'Tomato', 'Peach', 'Leafy'],
    symptoms: 'New growth curls inward or upward, looks puckered/distorted, or stays stunted.',
    likelyCauses: [
      'Broad mites or spider mites on undersides of leaves',
      'Aphids clustering on tender tips or buds',
      'Sharp temperature swings or harsh afternoon heat',
    ],
    quickFixes: [
      'Check leaf undersides with bright light or a lens for tiny moving mites or aphids.',
      'Blast pests off with a firm morning water spray and prune heavily curled tips.',
      'Use eco-oil or insecticidal soap in early morning or dusk (never in >32°C midday sun).',
    ],
    reminderTitle: 'Check underside of curled leaves & spray early morning if pests found',
  },
  {
    id: 'yellowing-lower-vs-new',
    title: 'Yellowing Leaves (Lower vs. New Growth)',
    category: 'Yellowing & Pale Leaves',
    affectedCrops: ['Tomato', 'Chilli', 'Capsicum', 'Cucumber', 'Zucchini', 'Citrus', 'Spinach'],
    symptoms: 'Older lower leaves turn yellow, or new leaves turn pale yellow-green.',
    likelyCauses: [
      'Lower leaves yellowing: nitrogen hunger or natural aging on heavy feeders',
      'New leaves pale yellow: overwatering/waterlogged roots or nutrient lockout in pots',
      'Citrus yellowing between veins: magnesium or trace-element hunger',
    ],
    quickFixes: [
      'Stick a finger 3–5 cm into the soil before watering—let soggy pot mix breathe.',
      'Feed with a balanced veg/tomato liquid feed or seaweed tonic once moisture is balanced.',
      'Trim spent yellow lower leaves to improve airflow and reduce fungal splash.',
    ],
    reminderTitle: 'Check pot drainage & apply balanced liquid feed if dry enough',
  },
  {
    id: 'wilting-heat-soak',
    title: 'Afternoon Wilting or Droop',
    category: 'Wilting & Heat Stress',
    affectedCrops: ['Tomato', 'Chilli', 'Capsicum', 'Zucchini', 'Cucumber', 'Sweet Basil', 'Strawberry'],
    symptoms: 'Leaves droop in hot afternoon sun but perk up overnight, or stay limp first thing in the morning.',
    likelyCauses: [
      'Normal midday transpiration on hot days in pots or raised beds',
      'Root zone drying out in smaller pots or coarse potting mix',
      'Morning limpness: overwatered/suffocated roots or root pest/disease',
    ],
    quickFixes: [
      'Only water midday if soil is genuinely dry or leaves stay limp after dusk; otherwise deep-soak at dawn.',
      'Add shade cloth (30%–50%) on scorching afternoons and top up mulch.',
      'If limp first thing in the morning with wet soil, pause watering and check drainage.',
    ],
    reminderTitle: 'Deep soak pots at dawn & check afternoon shade/mulch',
  },
  {
    id: 'chewed-holes-caterpillars-snails',
    title: 'Chewed Holes, Notches, or Eaten Seedlings',
    category: 'Chewed Leaves & Pests',
    affectedCrops: ['Bok Choy', 'Broccoli', 'Spinach', 'Snow Peas', 'Strawberry', 'Tomato', 'Zucchini'],
    symptoms: 'Irregular holes, ragged edges, or whole seedlings vanished overnight.',
    likelyCauses: [
      'Caterpillars/loopers (especially on brassicas and leafy greens)',
      'Snails, slugs, or earwigs feeding after dark or around mulch',
      'Grasshoppers or beetles chewing leaves in sunny spots',
    ],
    quickFixes: [
      'Do a quick dusk or torch check—hand-pick caterpillars, snails, and slugs.',
      'Use fine insect netting over brassicas/seedlings so moths can’t lay eggs.',
      'Pull thick mulch a couple of centimetres back from tender seedling stems.',
    ],
    reminderTitle: 'Evening pest check & inspect under leaves for caterpillars/snails',
  },
  {
    id: 'powdery-mildew-spots',
    title: 'White Powder or Leaf Spots',
    category: 'Spots, Powdery & Fungus',
    affectedCrops: ['Zucchini', 'Cucumber', 'Tomato', 'Strawberry', 'Sweet Basil'],
    symptoms: 'White powdery patches on leaves or dark/yellow spots on older foliage.',
    likelyCauses: [
      'Powdery mildew from warm days, cool/humid nights, and crowded leaves',
      'Fungal leaf spot from splashing water or poor airflow',
    ],
    quickFixes: [
      'Remove heavily spotted or powdery leaves (bin them rather than composting diseased foliage).',
      'Water at the soil base in the morning—keep leaves dry heading into evening.',
      'Space plants or prune crowded inner leaves for better airflow.',
    ],
    reminderTitle: 'Remove spotted/mildew leaves & water at base in morning',
  },
  {
    id: 'blossom-drop-no-fruit',
    title: 'Flowers Dropping Without Setting Fruit',
    category: 'Flower & Fruit Drop',
    affectedCrops: ['Tomato', 'Chilli', 'Capsicum', 'Eggplant', 'Zucchini'],
    symptoms: 'Blossoms open and fall off cleanly instead of swelling into fruit.',
    likelyCauses: [
      'Extreme heat (>35–38°C) drying pollen or stressing blossoms',
      'Poor pollination or lack of gentle movement/bees',
      'Too much high-nitrogen feed pushing leafy growth over fruit set',
    ],
    quickFixes: [
      'Provide afternoon shade during heatwaves and keep roots evenly hydrated.',
      'Gently tap or vibrate flowering stems in the morning to help pollen release.',
      'Switch to a flowering/fruiting potash boost once plants are established.',
    ],
    reminderTitle: 'Gently tap flowering stems in morning & check heat shade',
  },
];
