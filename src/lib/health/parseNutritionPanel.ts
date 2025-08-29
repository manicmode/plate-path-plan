/**
 * Robust OCR parsing for nutrition panels with unit-safe conversions
 * Extracts ingredients, serving size, and nutrition facts (per-100g & per-serving)
 */

export type ParsedOCR = {
  ingredients_text?: string;
  serving_size_raw?: string;   // e.g., "15 pieces (30 g)" or "2/3 cup (55 g)"
  per100?: Partial<{
    energyKcal: number;
    protein_g: number;
    carbs_g: number;
    sugar_g: number;
    fat_g: number;
    satfat_g: number;
    fiber_g: number;
    sodium_mg: number;
  }>;
  perServing?: Partial<{
    energyKcal: number;
    protein_g: number;
    carbs_g: number;
    sugar_g: number;
    fat_g: number;
    satfat_g: number;
    fiber_g: number;
    sodium_mg: number;
  }>;
};

export function parseNutritionFromOCR(ocrText: string): ParsedOCR {
  // 1) Normalize text: lowercase, collapse spaces, keep units
  const t = ocrText.replace(/\u00A0/g, ' ').replace(/[，、]/g, ',').toLowerCase();
  
  // 2) Serving detection: prefer "(XX g|ml)" inside parentheses
  const servingMatch = /\(([\d.]+)\s*(g|ml)\)/i.exec(t) || /serving[^0-9]*([\d.]+)\s*(g|ml)/i.exec(t);
  const servingSize = servingMatch ? `${servingMatch[1]} ${servingMatch[2]}` : undefined;
  const servingVal = servingMatch ? parseFloat(servingMatch[1]) : undefined;
  const servingIsML = servingMatch ? /ml/i.test(servingMatch[2]) : false;

  // 3) Helpers
  const num = (x: any): number | undefined => (x == null || x === '') ? undefined : +(`${x}`.replace(',', '.'));
  const pick = (re: RegExp): number | undefined => { 
    const mm = re.exec(t); 
    return mm ? num(mm[1]) : undefined; 
  };

  // 4) Extract per 100g/ml values if present
  // Energy: prefer kcal, fallback from kJ
  const kcal100 = pick(/per\s*100[^\n]*?\b(\d{1,4})\s*kcal\b/i) ??
                  (() => {
                    const kj = pick(/per\s*100[^\n]*?\b(\d{2,5})\s*kJ\b/i);
                    return kj != null ? +(kj / 4.184).toFixed(0) : undefined;
                  })();
  
  const sugar100  = pick(/per\s*100[^\n]*?\bsugars?\D{0,8}(\d{1,3}(?:\.\d+)?)[ ]*g\b/i);
  const fat100    = pick(/per\s*100[^\n]*?\bfat\D{0,8}(\d{1,3}(?:\.\d+)?)[ ]*g\b/i);
  const satfat100 = pick(/per\s*100[^\n]*?\bsat(?:urated)?\s*fat\D{0,8}(\d{1,2}(?:\.\d+)?)[ ]*g\b/i);
  const fiber100  = pick(/per\s*100[^\n]*?\bfiber\D{0,8}(\d{1,2}(?:\.\d+)?)[ ]*g\b/i);
  const protein100= pick(/per\s*100[^\n]*?\bprotein\D{0,8}(\d{1,2}(?:\.\d+)?)[ ]*g\b/i);
  const carbs100  = pick(/per\s*100[^\n]*?\bcarbohydrates?\D{0,8}(\d{1,3}(?:\.\d+)?)[ ]*g\b/i);
  
  // Sodium/salt: OFF/US panels often list salt → sodium = salt*0.4
  const sodium100g = (() => {
    const sodG = pick(/per\s*100[^\n]*?\bsodium\D{0,8}(\d{1,2}(?:\.\d+)?)[ ]*g\b/i);
    const sodMG = pick(/per\s*100[^\n]*?\bsodium\D{0,8}(\d{2,5})[ ]*mg\b/i);
    const saltG = pick(/per\s*100[^\n]*?\bsalt\D{0,8}(\d{1,2}(?:\.\d+)?)[ ]*g\b/i);
    if (sodMG != null) return sodMG;
    if (sodG != null) return +(sodG * 1000).toFixed(0);
    if (saltG != null) return +(saltG * 0.4 * 1000).toFixed(0);
    return undefined;
  })();

  // 5) Per-serving derivation if only per-100 present
  const derive = (v100?: number): number | undefined => (servingVal != null && !servingIsML && v100 != null)
    ? +(v100 * (servingVal / 100)).toFixed(v100 >= 50 ? 0 : 2)
    : undefined;

  const per100 = {
    energyKcal: kcal100,
    protein_g: protein100,
    carbs_g: carbs100,
    sugar_g: sugar100,
    fat_g: fat100,
    satfat_g: satfat100,
    fiber_g: fiber100,
    sodium_mg: sodium100g
  };

  const perServing = {
    energyKcal: derive(kcal100),
    protein_g: derive(protein100),
    carbs_g: derive(carbs100),
    sugar_g: derive(sugar100),
    fat_g: derive(fat100),
    satfat_g: derive(satfat100),
    fiber_g: derive(fiber100),
    sodium_mg: derive(sodium100g),
  };

  return {
    ingredients_text: (t.match(/ingredients?:\s*([\s\S]+)/i)?.[1] || '').trim(),
    serving_size_raw: servingSize,
    per100,
    perServing
  };
}
