export type ConfirmFoodPayload = {
  name: string;
  barcode: string;
  imageUrl?: string;
  nutrition: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
  };
  ingredients: string[];          // plain, ordered
  additives?: string[];           // codes/names (for chips)
  allergens?: string[];           // optional
  health: {
    score?: number;               // 0–10
    flags: Array<{ kind: string; level: 'danger'|'warn'|'ok'; note?: string }>;
  };
};

export function normalizeToConfirmFood(api: any): ConfirmFoodPayload {
  const p = api?.product ?? api; // support either shape
  return {
    name: p?.productName || p?.name || 'Unknown product',
    barcode: p?.barcode || p?.code || '',
    imageUrl: p?.imageUrl,
    nutrition: {
      calories: coerceNum(p?.nutrition?.calories ?? p?.nutriments?.energy_kcal ?? p?.nutritionSummary?.calories),
      protein_g: coerceNum(p?.nutrition?.protein_g ?? p?.nutriments?.proteins ?? p?.nutritionSummary?.protein),
      carbs_g: coerceNum(p?.nutrition?.carbs_g ?? p?.nutriments?.carbohydrates ?? p?.nutritionSummary?.carbs),
      fat_g: coerceNum(p?.nutrition?.fat_g ?? p?.nutriments?.fat ?? p?.nutritionSummary?.fat),
      fiber_g: coerceNum(p?.nutrition?.fiber_g ?? p?.nutriments?.fiber ?? p?.nutritionSummary?.fiber),
      sugar_g: coerceNum(p?.nutrition?.sugar_g ?? p?.nutriments?.sugars ?? p?.nutritionSummary?.sugar),
      sodium_mg: coerceNum(p?.nutrition?.sodium_mg ?? mgFromSalt(p?.nutriments?.salt) ?? p?.nutritionSummary?.sodium),
    },
    ingredients: Array.isArray(p?.ingredients) ? p.ingredients : splitList(p?.ingredients_text ?? p?.ingredientsText),
    additives: p?.additives_tags || p?.additives || [],
    allergens: p?.allergens_tags || p?.allergens || [],
    health: {
      score: coerceNum(p?.health?.score ?? p?.healthScore),
      flags: (p?.health?.flags || p?.healthFlags || []).map((f: any) => ({
        kind: f.kind || f.id || f.title,
        level: f.level || f.severity || f.type === 'danger' ? 'danger' : f.type === 'warning' ? 'warn' : 'ok',
        note: f.note || f.reason || f.description
      }))
    }
  };
}

function coerceNum(v: any) { 
  const n = Number(v); 
  return Number.isFinite(n) ? n : undefined; 
}

function mgFromSalt(salt?: any) { 
  const n = Number(salt); 
  return Number.isFinite(n) ? Math.round(n * 400) : undefined; 
}

function splitList(txt?: string) { 
  return txt ? txt.split(/[,;•·]/).map(s => s.trim()).filter(Boolean) : []; 
}