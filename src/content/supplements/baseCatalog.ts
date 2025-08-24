import { SupplementCatalogItem } from '@/types/supplements';

const baseCatalog: SupplementCatalogItem[] = [
  {
    slug: 'creatine-monohydrate',
    name: 'Creatine Monohydrate',
    shortDesc: 'Increases muscle strength, power, and exercise performance',
    tags: ['strength', 'performance', 'muscle-building'],
    defaultPrice: 24.99
  },
  {
    slug: 'omega-3',
    name: 'Omega-3 Fish Oil',
    shortDesc: 'Supports heart health, brain function, and reduces inflammation',
    tags: ['heart-health', 'brain-health', 'anti-inflammatory'],
    defaultPrice: 29.99
  },
  {
    slug: 'vitamin-d3',
    name: 'Vitamin D3',
    shortDesc: 'Supports immune function, bone health, and mood regulation',
    tags: ['immunity', 'bone-health', 'mood'],
    defaultPrice: 19.99
  },
  {
    slug: 'magnesium-glycinate',
    name: 'Magnesium Glycinate',
    shortDesc: 'Promotes better sleep, muscle relaxation, and stress reduction',
    tags: ['sleep', 'relaxation', 'stress-relief'],
    defaultPrice: 22.99
  },
  {
    slug: 'electrolytes',
    name: 'Electrolyte Complex',
    shortDesc: 'Maintains hydration balance and supports endurance performance',
    tags: ['hydration', 'endurance', 'recovery'],
    defaultPrice: 26.99
  },
  {
    slug: 'probiotic',
    name: 'Multi-Strain Probiotic',
    shortDesc: 'Supports digestive health and immune system function',
    tags: ['gut-health', 'digestion', 'immunity'],
    defaultPrice: 34.99
  },
  {
    slug: 'whey-protein',
    name: 'Whey Protein Isolate',
    shortDesc: 'High-quality protein for muscle building and recovery',
    tags: ['protein', 'muscle-building', 'recovery'],
    defaultPrice: 39.99
  },
  {
    slug: 'b-complex',
    name: 'B-Complex Vitamins',
    shortDesc: 'Supports energy metabolism and nervous system function',
    tags: ['energy', 'metabolism', 'nervous-system'],
    defaultPrice: 18.99
  }
];

export default baseCatalog;