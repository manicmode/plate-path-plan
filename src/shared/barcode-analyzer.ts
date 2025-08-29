// Shared analyzer helper for reusing analyzer endpoint across different input modes

export type AnalyzerResult = {
  quality?: { score?: number };
  flags?: Array<any>;
  ingredientFlags?: Array<any>;
  insights?: string[];
};

export async function analyzeProductForQuality(input: {
  name: string;
  ingredientsText?: string;
  nutrition?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    sugar_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
  };
}): Promise<AnalyzerResult | null> {
  try {
    // This should match what manual/speak uses (taskType: 'full_report' or equivalent)
    const body = {
      taskType: 'full_report',
      text: `Analyze this product:\nName: ${input.name}\nIngredients: ${input.ingredientsText || '(none)'}\nNutrition per 100g (if present): ${JSON.stringify(input.nutrition || {})}`,
      // you can include a structured field too if your edge accepts it:
      product: input
    };
    const res = await fetch('/functions/v1/gpt-smart-food-analyzer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data || null;
  } catch {
    return null;
  }
}

// Nutri-Score maps lower→better. Typical range ~[-15 .. 40].
// We invert and normalize to 0..10 where 10 = best (A), 0 = worst (E).
export const nutriScoreTo10 = (v: any): number | null => {
  const n = Number(v);
  if (!isFinite(n)) return null;
  const MIN = -15;
  const MAX = 40;
  const clamped = Math.max(MIN, Math.min(MAX, n));
  const pct = 1 - (clamped - MIN) / (MAX - MIN); // invert
  return Math.max(0, Math.min(10, +(pct * 10).toFixed(1)));
};