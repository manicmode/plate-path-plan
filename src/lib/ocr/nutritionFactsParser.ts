/* Robust serving-size extraction + shared regex */

export const NUTRIENT_OR_SERVING: RegExp = /\b(serving\s*size|servings?\s*(?:per\s*container)?|per\s*(?:serving|portion)|calories?|energy|total\s*fat|saturated\s*fat|trans\s*fat|cholesterol|sodium|(?:total\s*)?carb(?:ohydrate)?s?|dietary\s*fibre?|sugars?|protein)\b/i;

function normalizeUnits(value: number, unit: string): number | null {
  if (unit.toLowerCase() === 'g') return value;
  return null; // ml handled by category density elsewhere
}

/** Accepts raw OCR text (any locale casing/line breaks) and returns serving grams or null */
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

export default extractServingGramsFromText;