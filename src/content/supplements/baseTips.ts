import { SupplementTip } from '@/types/supplements';

const baseTips: SupplementTip[] = [
  {
    id: 'creatine-performance',
    productSlug: 'creatine-monohydrate',
    title: 'Creatine Monohydrate',
    blurb: 'Boosts muscle strength, power output, and exercise recovery. Most researched supplement for athletic performance with proven results.',
    tag: 'Strength',
    emoji: '💪',
    priority: 95
  },
  {
    id: 'omega3-health',
    productSlug: 'omega-3',
    title: 'Omega-3 (Fish Oil)',
    blurb: 'Supports heart health, brain function, and reduces inflammation. Essential fatty acids your body cannot produce naturally.',
    tag: 'Heart Health',
    emoji: '🐟',
    priority: 90
  },
  {
    id: 'vitd3-immune',
    productSlug: 'vitamin-d3',
    title: 'Vitamin D3',
    blurb: 'Enhances immune function, bone health, and mood regulation. Crucial for those with limited sun exposure.',
    tag: 'Immunity',
    emoji: '☀️',
    priority: 85
  },
  {
    id: 'magnesium-sleep',
    productSlug: 'magnesium-glycinate',
    title: 'Magnesium Glycinate',
    blurb: 'Promotes better sleep quality, muscle relaxation, and stress reduction. Gentle on the stomach with high absorption.',
    tag: 'Sleep',
    emoji: '😴',
    priority: 80
  },
  {
    id: 'electrolytes-hydration',
    productSlug: 'electrolytes',
    title: 'Electrolytes',
    blurb: 'Maintains hydration balance, prevents muscle cramps, and supports endurance performance. Essential for active individuals.',
    tag: 'Endurance',
    emoji: '💧',
    priority: 75
  },
  {
    id: 'probiotic-gut',
    productSlug: 'probiotic',
    title: 'Probiotic',
    blurb: 'Improves gut health, supports digestion, and boosts immune system. Contains beneficial bacteria for optimal microbiome.',
    tag: 'Gut Health',
    emoji: '🦠',
    priority: 70
  },
  {
    id: 'protein-muscle',
    productSlug: 'whey-protein',
    title: 'Whey Protein',
    blurb: 'Accelerates muscle protein synthesis and recovery after workouts. Complete amino acid profile for muscle building.',
    tag: 'Muscle Building',
    emoji: '🥛',
    priority: 65
  },
  {
    id: 'bcomplex-energy',
    productSlug: 'b-complex',
    title: 'B-Complex Vitamins',
    blurb: 'Boosts energy metabolism, supports brain function, and reduces fatigue. Essential for converting food into cellular energy.',
    tag: 'Energy',
    emoji: '⚡',
    priority: 60
  }
];

export default baseTips;