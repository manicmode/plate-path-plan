type MappedFood = {
  barcode: string | null;
  name: string;           // 'Unknown Product' only if truly missing
  brand: string | null;
  imageUrl: string | null;
  ingredientsText: string | null;
  servingG: number | null;
  nutrition: {
    per100g?: Partial<Record<string, number | null>>;
    perServing?: Partial<Record<string, number | null>>;
    basis: 'perServing' | 'per100g'; // which set UI should display
  };
  hasNutrition: boolean;
};

// Null-safe numeric coercion
export function asNum(x: any): number | null {
  if (typeof x === 'number' && isFinite(x)) return x;
  if (typeof x === 'string') {
    const v = +x.trim();
    if (!Number.isNaN(v) && isFinite(v)) return v;
  }
  return null;
}

const first = (...vals: any[]) =>
  vals.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? null;

export function mapLookupToLoggedFood(raw: any): MappedFood {
  const r = raw || {};
  const p = r.product || r.data || r.item || r.details || {};

  // ids
  const barcode = first(r.barcode, r.code, p.barcode, p.code, r.upc, r.ean);

  // text fields
  const name = first(p.name, p.product_name, r.product_name, r.title, r.itemName, r.name) || 'Unknown Product';
  const brand = first(p.brand, p.brand_name, p.brands, r.brand, r.brands);

  // image candidates (prefer large/front)
  const imageUrl = first(
    p.image_url, p.image_large_url, p.image_front_url, p.image,
    p.images?.front, p.images?.large, p.images?.thumb,
    r.image_url, r.image
  );

  // ingredients
  const ingredientsText = first(
    p.ingredients_text, r.ingredients_text,
    Array.isArray(p.ingredients) ? p.ingredients.map((i:any)=>i.text || i.name).filter(Boolean).join(', ') : null,
    Array.isArray(r.ingredients) ? r.ingredients.map((i:any)=>i.text || i.name).filter(Boolean).join(', ') : null
  );

  // serving (grams)
  let servingG = first(p.serving_size_g, r.serving_size_g) as number | null;
  if (!servingG) {
    const ss = first(p.serving_size, r.serving_size);
    if (typeof ss === 'string') {
      const m = ss.toLowerCase().match(/(\d+(?:\.\d+)?)\s*g/);
      if (m) servingG = Number(m[1]);
    }
  }

  // nutriments
  const nutr = p.nutrition || p.nutriments || r.nutrition || {};
  const n100 = nutr.per_100g || nutr.per100g || undefined;
  const nServ = nutr.per_serving || nutr.perServing || undefined;

  const pick = (obj:any, keys:string[]) => keys.reduce((v,k)=> v ?? obj?.[k], null);

  const per100g = n100 ?? {
    calories:  pick(nutr, ['calories_100g','energy-kcal_100g','energy_kcal_100g','kcal_100g','calories']),
    protein_g: pick(nutr, ['proteins_100g','protein_100g','protein']),
    carbs_g:   pick(nutr, ['carbohydrates_100g','carbs_100g','carbohydrates','carbs']),
    fat_g:     pick(nutr, ['fat_100g','fats_100g','fat']),
    sugar_g:   pick(nutr, ['sugars_100g','sugar_100g','sugars']),
    fiber_g:   pick(nutr, ['fiber_100g','fibre_100g','fiber']),
    sodium_mg: (() => {
      const sNa = pick(nutr, ['sodium_100g']);
      const sSalt = pick(nutr, ['salt_100g']);
      if (sNa != null) return Number(sNa) * 1000;        // g -> mg if provider uses grams
      if (sSalt != null) return Number(sSalt) * 400;     // salt(g) -> sodium(mg)
      return null;
    })(),
  };

  // derive perServing from per100g if needed and we have servingG
  let perServing = nServ as any;
  if (!perServing && per100g && servingG) {
    const scale = Number(servingG) / 100;
    perServing = Object.fromEntries(
      Object.entries(per100g).map(([k,v]) => [k, typeof v === 'number' ? Number((v * scale).toFixed(2)) : v])
    );
  }

  const basis: 'perServing' | 'per100g' = perServing?.calories ? 'perServing' : 'per100g';
  const hasNutrition = !!(perServing?.calories || per100g?.calories);

  return {
    barcode: barcode ?? null,
    name: String(name),
    brand: brand ? String(brand) : null,
    imageUrl: imageUrl ?? null,
    ingredientsText: ingredientsText ?? null,
    servingG: servingG ?? null,
    nutrition: { per100g, perServing, basis },
    hasNutrition,
  };
}

// Legacy compatibility functions for existing code
export function normalizeNutrition(raw: any) {
  const mapped = mapLookupToLoggedFood(raw);
  const nutrition = mapped.nutrition.basis === 'perServing' 
    ? mapped.nutrition.perServing 
    : mapped.nutrition.per100g;
  
  return {
    calories: nutrition?.calories || null,
    protein_g: nutrition?.protein_g || null,
    carbs_g: nutrition?.carbs_g || null,
    fat_g: nutrition?.fat_g || null,
    sodium_mg: nutrition?.sodium_mg || null,
  };
}