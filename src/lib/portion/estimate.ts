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

// Specific food overrides
const SPECIFIC_PORTIONS: Record<string, number> = {
  // Proteins
  'salmon': 150,
  'chicken': 120,
  'beef': 150,
  'pork': 130,
  'egg': 50,
  'tofu': 100,
  
  // Vegetables  
  'asparagus': 85,
  'broccoli': 90,
  'salad': 90,
  'tomato': 80,
  'carrot': 70,
  'spinach': 60,
  
  // Fruits
  'lemon': 15,
  'apple': 180,
  'banana': 120,
  'orange': 150,
  
  // Grains
  'rice': 150,
  'pasta': 140,
  'bread': 30,
  'potato': 150,
  
  // Dairy
  'cheese': 30,
  'yogurt': 120,
  'milk': 250
};

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
  // Check for specific food first
  const specific = SPECIFIC_PORTIONS[name.toLowerCase()];
  const baseGrams = specific || CATEGORY_PORTIONS[category] || 100;
  
  // Parse hint for adjustments
  const result = parsePortionHint(hint, baseGrams);
  
  // Round to sensible steps (5g increments for small portions, 10g for larger)
  const rounded = result.grams < 50 ? 
    Math.round(result.grams / 5) * 5 : 
    Math.round(result.grams / 10) * 10;
  
  return { ...result, grams: Math.max(rounded, 5) }; // Minimum 5g
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