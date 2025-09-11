type Confidence = "high" | "medium" | "estimated";

const DENSITY: Record<string, number> = {
  beverage_cold: 1.0,
  beverage_hot: 1.0,
  soup: 1.05,
  smoothie: 1.15,
  milk: 1.03,
  iced_coffee: 0.92,
  protein_shake: 1.08,
  thick_soup: 1.12,
  chili: 1.08,
  sauce_thick: 1.15,

  // cups → grams (treated via multipliers below)
  cereal: 30,
  rice_cooked: 180,
  pasta_cooked: 140,
  yogurt: 245,

  min_density: 0.8,
  max_density: 1.6,
};

export function mlToGrams(ml: number, classId?: string): { grams: number; confidence: Confidence } {
  let density = DENSITY[classId || 'beverage_cold'] ?? 1.0;
  density = Math.min(Math.max(density, DENSITY.min_density), DENSITY.max_density);
  return { grams: Math.round(ml * density), confidence: density === 1 ? "high" : "medium" };
}

export function cupToGrams(cups: number, classId?: string): { grams: number; confidence: Confidence } {
  const perCup = DENSITY[classId || 'cereal'];
  if (!perCup || typeof perCup !== "number") return { grams: Math.round(cups * 240), confidence: "estimated" };
  return { grams: Math.round(cups * perCup), confidence: "medium" };
}