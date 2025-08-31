/**
 * User-friendly suggestion copy formatter
 * Maps internal engine triggers to readable explanations
 */

// Types for context data
type Ctx = {
  ingredientCount?: number;
  sugarPerPortion?: number;      // g
  sodiumPerPortion?: number;     // mg
  satFatPerPortion?: number;     // g
  fiberPerPortion?: number;      // g
  proteinPerPortion?: number;    // g
  additives?: string[];
  allergens?: string[];
  user?: {
    goals?: string[];            // e.g., ['weight_loss','heart_health']
    allergies?: string[];
    prefs?: string[];            // e.g., ['low_sugar','high_protein']
  };
};

export const reasonCopy: Record<
  string,
  (ctx: Ctx) => string | undefined
> = {
  category_swap_general: () =>
    "This product is in a highly processed category. Swapping to simpler options usually means fewer additives and less sugar.",

  ingredient_count_high: ({ ingredientCount }) =>
    ingredientCount && ingredientCount >= 10
      ? `It has ${ingredientCount}+ ingredients, which often means more processing.`
      : undefined,

  sugar_high: ({ sugarPerPortion, user }) => {
    const base = sugarPerPortion != null
      ? `High in sugar (${sugarPerPortion}g per portion).`
      : "High in sugar for the portion size.";
    if (user?.prefs?.includes("low_sugar") || user?.goals?.includes("weight_loss")) {
      return `${base} Lower-sugar choices can better match your goals.`;
    }
    return base;
  },

  sodium_high: ({ sodiumPerPortion }) =>
    sodiumPerPortion != null
      ? `High in sodium (${sodiumPerPortion} mg per portion).`
      : "High in sodium for the portion size.",

  sat_fat_high: ({ satFatPerPortion }) =>
    satFatPerPortion != null
      ? `High in saturated fat (${satFatPerPortion}g).`
      : "High in saturated fat.",

  fiber_low: ({ fiberPerPortion }) =>
    fiberPerPortion != null
      ? `Low in fiber (${fiberPerPortion}g). Picking higher-fiber items supports fullness and gut health.`
      : "Low in fiber. Higher-fiber options support fullness and gut health.",

  protein_low: ({ proteinPerPortion }) =>
    proteinPerPortion != null
      ? `Low in protein (${proteinPerPortion}g).`
      : "Low in protein.",

  additives_present: ({ additives }) =>
    additives && additives.length > 0
      ? `Contains ${additives.length} additive${additives.length > 1 ? "s" : ""}.`
      : undefined,

  allergen_present: ({ allergens, user }) => {
    if (user?.allergies?.length && allergens?.length) {
      const hits = allergens.filter(a => user.allergies!.includes(a));
      if (hits.length) return `Contains your allergen(s): ${hits.join(", ")}.`;
    }
    return undefined;
  },

  // Additional common triggers
  very_high_sugar: ({ sugarPerPortion }) =>
    sugarPerPortion != null
      ? `Very high sugar content (${sugarPerPortion}g per portion).`
      : "Very high sugar content for the portion size.",

  very_high_sodium: ({ sodiumPerPortion }) =>
    sodiumPerPortion != null
      ? `Very high sodium levels (${sodiumPerPortion}mg per portion).`
      : "Very high sodium levels for the portion size.",

  ultra_processed: () =>
    "Contains multiple processed additives and preservatives.",

  weight_loss_calories: ({ sugarPerPortion, user }) => {
    if (user?.goals?.includes("weight_loss")) {
      return "High calories for your weight loss goal. Consider smaller portions or alternatives.";
    }
    return undefined;
  },

  sugar_protein_pairing: () =>
    "Benefits from protein pairing to help balance blood sugar response.",

  high_fiber_positive: ({ fiberPerPortion }) =>
    fiberPerPortion != null
      ? `Good fiber content (${fiberPerPortion}g) supports digestive health.`
      : "Good fiber content supports digestive health.",
};

// Helper to select up to N clear reasons from a list of trigger keys
export function reasonsForTriggers(triggers: string[], ctx: Ctx, max = 2): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  
  for (const key of triggers) {
    if (seen.has(key)) continue;
    const fn = reasonCopy[key];
    const msg = fn?.(ctx);
    if (msg) {
      out.push(msg);
      seen.add(key);
    }
    if (out.length >= max) break;
  }
  
  return out;
}