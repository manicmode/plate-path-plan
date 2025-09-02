/**
 * Portion Estimation v2 - Light but useful heuristics
 * Maps food names, categories, and hints to gram estimates
 */

interface PortionResult {
  grams: number;
  source: 'est' | 'user-default' | 'hint-parsed';
}

// Base portion heuristics by category (grams)
const CATEGORY_PORTIONS: Record<string, number> = {
  protein: 120,
  vegetable: 80,
  fruit: 80,
  grain: 150,
  dairy: 100,
  fat_oil: 15,
  sauce_condiment: 20
};

// Portion defaults v2 - improved defaults with hints
const DEFAULT_PORTIONS_G: Record<string, number> = {
  salmon: 160,            // 140–180g typical fillet; we pick 160g
  asparagus: 85,          // ~7 spears * 12g = 84g
  salad: 120,             // side salad
  tomato: 80,             // medium chopped/sliced
  lemon: 30,              // 1–2 wedges
  lime: 25,
  chicken: 120,
  beef: 150,
  pork: 130,
  egg: 50,
  tofu: 100,
  broccoli: 90,
  carrot: 70,
  spinach: 60,
  apple: 180,
  banana: 120,
  orange: 150,
  rice: 150,
  pasta: 140,
  bread: 30,
  potato: 150,
  cheese: 30,
  yogurt: 120,
  milk: 250
};

// Parse hints for portion adjustments
function fromHints(name: string, hint?: string): number | undefined {
  if (!hint) return;
  
  const mSpears = hint.match(/(\d+)\s*(spears?)/i);
  if (mSpears && name === 'asparagus') return Number(mSpears[1]) * 12;
  
  const mFillet = /fillet|filet/i.test(hint) && name === 'salmon' ? 160 : undefined;
  return mFillet;
}

function parsePortionHint(hint: string | null, baseGrams: number): PortionResult {
  if (!hint) return { grams: baseGrams, source: 'est' };
  
  const lower = hint.toLowerCase();
  
  // Parse spear counts for asparagus (15-18g per spear)
  const spearMatch = lower.match(/(\d+)\s*spears?/);
  if (spearMatch) {
    const count = parseInt(spearMatch[1]);
    return { grams: Math.round(count * 16), source: 'hint-parsed' };
  }
  
  // Parse wedge counts for citrus (15g per wedge)  
  const wedgeMatch = lower.match(/(\d+)\s*wedges?/);
  if (wedgeMatch) {
    const count = parseInt(wedgeMatch[1]);
    return { grams: Math.round(count * 15), source: 'hint-parsed' };
  }
  
  // Size descriptors
  if (lower.includes('palm-sized')) {
    return { grams: Math.round(baseGrams * 1.0), source: 'hint-parsed' };
  }
  if (lower.includes('small')) {
    return { grams: Math.round(baseGrams * 0.7), source: 'hint-parsed' };
  }
  if (lower.includes('large')) {
    return { grams: Math.round(baseGrams * 1.4), source: 'hint-parsed' };
  }
  if (lower.includes('side')) {
    return { grams: Math.round(baseGrams * 0.6), source: 'hint-parsed' };
  }
  
  return { grams: baseGrams, source: 'est' };
}

export function estimatePortion(name: string, category: string, hint: string | null): PortionResult {
  // Try hint parsing first
  const hintGrams = fromHints(name, hint || '');
  if (hintGrams) {
    console.info('[ROUTER][portion:applied]', `name=${name}`, `grams=${hintGrams}`, `source=hint`);
    return { grams: hintGrams, source: 'hint-parsed' };
  }
  
  // Check for specific food defaults
  const specific = DEFAULT_PORTIONS_G[name.toLowerCase()];
  const baseGrams = specific || CATEGORY_PORTIONS[category] || 100;
  
  // Parse hint for size adjustments
  const result = parsePortionHint(hint, baseGrams);
  
  // Round to sensible steps (5g increments for small portions, 10g for larger)
  const rounded = result.grams < 50 ? 
    Math.round(result.grams / 5) * 5 : 
    Math.round(result.grams / 10) * 10;
  
  const finalGrams = Math.max(rounded, 5); // Minimum 5g
  console.info('[ROUTER][portion:applied]', `name=${name}`, `grams=${finalGrams}`, `source=${result.source}`);
  
  return { ...result, grams: finalGrams };
}

export async function checkUserDefaults(name: string): Promise<number | null> {
  // TODO: Integrate with existing user preference system
  // For now, return null to use estimates
  return null;
}

export async function estimatePortionWithDefaults(name: string, category: string, hint: string | null): Promise<PortionResult> {
  // Check user defaults first
  const userDefault = await checkUserDefaults(name);
  if (userDefault) {
    return { grams: userDefault, source: 'user-default' };
  }
  
  // Fall back to heuristics
  return estimatePortion(name, category, hint);
}