/**
 * New robust serving size parser per spec requirements
 * Handles US/EU formats with comprehensive pattern matching
 */

// Enhanced filter to include serving phrases (order matters, use word boundaries)
export const NUTRIENT_OR_SERVING = /\b(serving\s*size|servings?\s*(?:per\s*container)?|per\s*(?:serving|portion)|calories?|energy|total\s*fat|saturated\s*fat|trans\s*fat|cholesterol|sodium|(?:total\s*)?carb(?:ohydrate)?s?|dietary\s*fibre?|sugars?|protein)\b/i;

export function extractServingGramsFromText(raw: string): number | null {
  if (!raw) return null;
  
  // Normalize text - remove non-breaking spaces, commas, lowercase
  const text = raw.replace(/\u00A0/g, ' ').replace(/[,]/g, '').toLowerCase();

  // Stitch wrapped lines like "(55 g)" onto the previous line
  const stitched = text.replace(/\n\((\s*\d+(?:\.\d+)?\s*(?:g|ml))\)\s*/g, ' ($1) ');

  // Log the interesting lines that match our filter
  const lines = stitched.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const interestingLines = lines
    .map((line, i) => ({ line, index: i + 1, match: NUTRIENT_OR_SERVING.test(line) }))
    .filter(l => l.match)
    .slice(0, 5); // Top 5 interesting lines
  
  console.log('[PORTION][OCR] Interesting lines:', interestingLines);

  // Pattern 1: Serving size ... (55 g)
  const SERVING_PAREN = /\bserving\s*size[^()\n]*\(\s*(\d+(?:\.\d+)?)\s*(g|ml)\s*\)/i;
  const m1 = SERVING_PAREN.exec(stitched);
  if (m1) {
    const grams = normalizeUnits(parseFloat(m1[1]), m1[2]);
    if (grams) {
      console.log('[PORTION][OCR] Winner: serving_parentheses', { grams, match: m1[0] });
      return grams;
    }
  }

  // Pattern 2: Per serving / per portion 30 g
  const PER_PORTION = /\bper\s*(?:serving|portion)\s*(\d+(?:\.\d+)?)\s*(g|ml)\b/i;
  const m2 = PER_PORTION.exec(stitched);
  if (m2) {
    const grams = normalizeUnits(parseFloat(m2[1]), m2[2]);
    if (grams) {
      console.log('[PORTION][OCR] Winner: per_portion', { grams, match: m2[0] });
      return grams;
    }
  }

  // Pattern 3: "Serving size … 55 g" without parentheses
  const SERVING_INLINE = /\bserving\s*size[^\n]*?(\d+(?:\.\d+)?)\s*(g|ml)\b/i;
  const m3 = SERVING_INLINE.exec(stitched);
  if (m3) {
    const grams = normalizeUnits(parseFloat(m3[1]), m3[2]);
    if (grams) {
      console.log('[PORTION][OCR] Winner: inline', { grams, match: m3[0] });
      return grams;
    }
  }

  // Pattern 4: EU panels: prefer "per portion" over "per 100 g"
  const EU_PORTION = /\bper\s*portion[^\n]*?(\d+(?:\.\d+)?)\s*(g|ml)\b/i;
  const m4 = EU_PORTION.exec(stitched);
  if (m4) {
    const grams = normalizeUnits(parseFloat(m4[1]), m4[2]);
    if (grams) {
      console.log('[PORTION][OCR] Winner: eu_portion', { grams, match: m4[0] });
      return grams;
    }
  }

  console.log('[PORTION][OCR] No serving size patterns matched');
  return null;
}

function normalizeUnits(value: number, unit: string): number | null {
  if (unit.toLowerCase() === 'g') return value;
  // If ml and category has density override, convert later; otherwise null so fallback table can decide
  return null;
}

// Brand detection patterns - never treat these as categories
const BRAND_PATTERNS = /\b(trader joe'?s|kirkland|great value|whole foods|aldi|costco|target|publix|wegmans|kroger)\b/i;

export function inferCategory({ title, ingredients }: { title?: string; ingredients?: string }): string {
  const text = `${title || ''} ${ingredients || ''}`.toLowerCase();
  
  // Skip if it's a brand name
  if (BRAND_PATTERNS.test(text)) {
    console.log('[PORTION][CATEGORY] Skipped brand as category:', text.match(BRAND_PATTERNS)?.[0]);
    return 'unknown';
  }
  
  // Category heuristics
  if (/(granola|rolled oats|oat clusters|cereal)/.test(text)) return 'cereal_granola';
  if (/(chips|crisps)/.test(text)) return 'chips';
  if (/(nuts|almonds|cashews|peanuts)/.test(text)) return 'nuts';
  if (/(yogurt|yoghurt)/.test(text)) return 'yogurt';
  if (/(candy|chocolate|sweet)/.test(text)) return 'candy';
  
  console.log('[PORTION][CATEGORY] No specific category matched, using unknown');
  return 'unknown';
}

// Portion fallback table (used only when OCR fails to find grams)
const CATEGORY_PORTION_GRAMS: Record<string, number> = {
  cereal_granola: 60,
  cereal: 55,
  chips: 28,
  nuts: 28,
  candy: 40,
  yogurt: 170,
  unknown: 30, // last resort
};

export function fallbackServingGramsByCategory(cat?: string): number {
  const category = cat ?? 'unknown';
  const grams = CATEGORY_PORTION_GRAMS[category] ?? 30;
  console.log('[PORTION][OCR] Using fallback:', { category, grams });
  return grams;
}