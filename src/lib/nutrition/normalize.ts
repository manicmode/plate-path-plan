export interface NormalizedNutrition {
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number; };
  servingG: number;
  perServing?: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number; };
}

export function convertEnergyUnits(value?: number, fromUnit?: string): number {
  if (!value) return 0;
  return (fromUnit === 'kJ' || fromUnit === 'kilojoules') ? Math.round(value / 4.184) : value;
}
export const scaleToHundredGrams = (v = 0, g = 100) => (!v || !g || g <= 0) ? 0 : Math.round((v * 100) / g);
export const scaleFromHundredGrams = (v = 0, g = 100) => (!v || !g || g <= 0) ? 0 : Math.round((v * g) / 100);

export function inferServingFromClassId(classId?: string): number {
  const sizes: Record<string, number> = {
    fish_fillet_link: 85, hot_dog_link: 45, club_sandwich: 150, apple_generic: 182,
    banana_generic: 118, bread_slice: 25, egg_large: 50, pizza_slice: 125, chicken_breast: 120, pasta_generic: 140
  };
  return (classId && sizes[classId]) || 100;
}

export function normalizeNutrition(source: any, servingG?: number): NormalizedNutrition {
  const base = servingG || inferServingFromClassId(source?.classId) || 100;
  let kcal = source?.calories ?? source?.energy_kcal;
  if (!kcal && source?.energy_kj) kcal = convertEnergyUnits(source.energy_kj, 'kJ');

  if (source?.per100g) {
    const p = source.per100g;
    const per100g = {
      calories: convertEnergyUnits(p.calories ?? p.energy_kcal, p.energy_unit || 'kcal'),
      protein: p.protein ?? 0, carbs: p.carbs ?? p.carbohydrates ?? 0, fat: p.fat ?? p.total_fat ?? 0,
      fiber: p.fiber ?? p.dietary_fiber ?? 0, sugar: p.sugar ?? p.sugars ?? 0, sodium: p.sodium ?? 0
    };
    return {
      per100g,
      servingG: base,
      perServing: {
        calories: scaleFromHundredGrams(per100g.calories, base),
        protein: scaleFromHundredGrams(per100g.protein, base),
        carbs: scaleFromHundredGrams(per100g.carbs, base),
        fat: scaleFromHundredGrams(per100g.fat, base),
        fiber: scaleFromHundredGrams(per100g.fiber, base),
        sugar: scaleFromHundredGrams(per100g.sugar, base),
        sodium: scaleFromHundredGrams(per100g.sodium, base),
      }
    };
  }

  const per100g = {
    calories: scaleToHundredGrams(kcal || 0, base),
    protein: scaleToHundredGrams(source?.protein || 0, base),
    carbs:   scaleToHundredGrams(source?.carbs || source?.carbohydrates || 0, base),
    fat:     scaleToHundredGrams(source?.fat || source?.total_fat || 0, base),
    fiber:   scaleToHundredGrams(source?.fiber || source?.dietary_fiber || 0, base),
    sugar:   scaleToHundredGrams(source?.sugar || source?.sugars || 0, base),
    sodium:  scaleToHundredGrams(source?.sodium || 0, base),
  };
  return {
    per100g,
    servingG: base,
    perServing: {
      calories: kcal || 0,
      protein: source?.protein || 0,
      carbs:   source?.carbs || source?.carbohydrates || 0,
      fat:     source?.fat || source?.total_fat || 0,
      fiber:   source?.fiber || source?.dietary_fiber || 0,
      sugar:   source?.sugar || source?.sugars || 0,
      sodium:  source?.sodium || 0,
    }
  };
}