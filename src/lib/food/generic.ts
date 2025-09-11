/**
 * Generic Food Resolver for Manual Entry
 * Provides nutrition data for generic food items without API calls
 */

export interface Nutrition {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface PortionDef {
  label: string;
  g: number;
  source?: string;
}

export interface GenericFood {
  per100g: Nutrition;
  portions?: PortionDef[];
}

const GENERIC_TABLE: Record<string, GenericFood> = {
  'club_sandwich': {
    per100g: {
      kcal: 240,
      protein_g: 12,
      carbs_g: 26,
      fat_g: 9,
      fiber_g: 2,
      sugar_g: 4,
      sodium_mg: 680
    },
    portions: [
      { label: '1/2 sandwich', g: 75, source: 'inferred' },
      { label: '1 sandwich', g: 150, source: 'inferred' },
      { label: '2 sandwiches', g: 300, source: 'inferred' }
    ]
  },
  'generic_food': {
    per100g: {
      kcal: 200,
      protein_g: 8,
      carbs_g: 30,
      fat_g: 6,
      fiber_g: 3,
      sugar_g: 5,
      sodium_mg: 400
    },
    portions: [
      { label: '100g', g: 100, source: 'inferred' }
    ]
  }
};

export function enrichFromGeneric(classId: string, key: string): GenericFood {
  const k = classId || (key.toLowerCase().includes('club sand') ? 'club_sandwich' : 'generic_food');
  return GENERIC_TABLE[k] ?? GENERIC_TABLE['generic_food'];
}