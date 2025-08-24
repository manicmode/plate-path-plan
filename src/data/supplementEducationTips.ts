export type SupplementTip = {
  id: string;
  title: string;
  blurb: string;
  tag?: string;
  emoji?: string;
  productId?: string;
  productSlug?: string;
};

export const supplementEducationTips: SupplementTip[] = [
  {
    id: 'creatine-monohydrate',
    title: 'Creatine Monohydrate',
    blurb: 'Boosts muscle strength, power output, and exercise recovery. Most researched supplement for athletic performance with proven results.',
    tag: 'Strength',
    emoji: '💪',
    productSlug: 'creatine-monohydrate'
  },
  {
    id: 'omega-3-fish-oil',
    title: 'Omega-3 (Fish Oil)',
    blurb: 'Supports heart health, brain function, and reduces inflammation. Essential fatty acids your body cannot produce naturally.',
    tag: 'Heart Health',
    emoji: '🐟',
    productSlug: 'omega-3'
  },
  {
    id: 'vitamin-d3',
    title: 'Vitamin D3',
    blurb: 'Enhances immune function, bone health, and mood regulation. Crucial for those with limited sun exposure.',
    tag: 'Immunity',
    emoji: '☀️',
    productSlug: 'vitamin-d3'
  },
  {
    id: 'magnesium-glycinate',
    title: 'Magnesium Glycinate',
    blurb: 'Promotes better sleep quality, muscle relaxation, and stress reduction. Gentle on the stomach with high absorption.',
    tag: 'Sleep',
    emoji: '😴',
    productSlug: 'magnesium-glycinate'
  },
  {
    id: 'electrolytes',
    title: 'Electrolytes',
    blurb: 'Maintains hydration balance, prevents muscle cramps, and supports endurance performance. Essential for active individuals.',
    tag: 'Endurance',
    emoji: '💧',
    productSlug: 'electrolytes'
  },
  {
    id: 'probiotic',
    title: 'Probiotic',
    blurb: 'Improves gut health, supports digestion, and boosts immune system. Contains beneficial bacteria for optimal microbiome.',
    tag: 'Gut Health',
    emoji: '🦠',
    productSlug: 'probiotic'
  },
  {
    id: 'whey-protein',
    title: 'Whey Protein',
    blurb: 'Accelerates muscle protein synthesis and recovery after workouts. Complete amino acid profile for muscle building.',
    tag: 'Muscle Building',
    emoji: '🥛',
    productSlug: 'whey-protein'
  },
  {
    id: 'b-complex',
    title: 'B-Complex Vitamins',
    blurb: 'Boosts energy metabolism, supports brain function, and reduces fatigue. Essential for converting food into cellular energy.',
    tag: 'Energy',
    emoji: '⚡',
    productSlug: 'b-complex'
  }
];