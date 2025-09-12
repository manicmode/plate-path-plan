/**
 * Candidate deduplication and merging utilities for manual food entry
 */

export interface CandidateKey {
  name: string;
  classId?: string;
  brandName?: string;
  providerRef?: string;
}

/**
 * Create canonical key for deduplication - combines name, classId, brand, and provider
 */
export function makeCanonicalKey(candidate: CandidateKey): string {
  const name = normalize(candidate.name);
  const brand = (candidate.brandName || '').toLowerCase().trim();
  const ref = (candidate.providerRef || '').toLowerCase().trim(); 
  const cls = (candidate.classId || '').toLowerCase().trim();
  
  return `${name}|${cls}|${brand}|${ref}`;
}

/**
 * Normalize text for consistent comparison
 */
function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Merge and deduplicate candidate lists using canonical keys
 */
export function mergeCandidates<T extends CandidateKey>(
  cheapCandidates: T[], 
  edgeCandidates: T[]
): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();
  
  // Process in order: cheap first, then edge
  const allCandidates = [...cheapCandidates, ...edgeCandidates];
  
  for (const candidate of allCandidates) {
    const key = makeCanonicalKey(candidate);
    
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(candidate);
    }
  }
  
  console.log('[CANDIDATES][MERGE]', { 
    cheap: cheapCandidates.length, 
    edge: edgeCandidates.length, 
    merged: merged.length 
  });
  
  return merged.slice(0, 8); // Cap final results
}

/**
 * Infer classId from query for generic fallback
 */
export function inferClassId(query: string): string | null {
  const normalized = normalize(query);
  
  // Common food mappings
  const classMap: Record<string, string> = {
    'hot dog': 'hot_dog_link',
    'hotdog': 'hot_dog_link',
    'frankfurter': 'hot_dog_link',
    'sausage': 'sausage_link',
    'hamburger': 'hamburger_sandwich',
    'burger': 'hamburger_sandwich',
    'pizza': 'pizza_slice',
    'apple': 'apple_fresh',
    'banana': 'banana_fresh',
    'egg': 'chicken_egg_whole',
    'eggs': 'chicken_egg_whole',
    'chicken': 'chicken_breast_cooked',
    'rice': 'rice_white_cooked',
    'bread': 'bread_white_slice',
    'milk': 'milk_whole',
    'cheese': 'cheese_cheddar'
  };
  
  return classMap[normalized] || null;
}

/**
 * Generic fallback candidate generator
 */
export function createGenericFallback(query: string, classId?: string): any | null {
  const inferredClassId = classId || inferClassId(query);
  
  if (!inferredClassId) {
    return null;
  }
  
  // Stable macros per 100g for common foods
  const stableMacros: Record<string, any> = {
    hot_dog_link: { calories: 250, protein: 11, carbs: 2, fat: 22, fiber: 0 },
    hamburger_sandwich: { calories: 250, protein: 13, carbs: 25, fat: 12, fiber: 2 },
    pizza_slice: { calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2 },
    apple_fresh: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 },
    banana_fresh: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 },
    chicken_egg_whole: { calories: 155, protein: 13, carbs: 1, fat: 11, fiber: 0 },
    chicken_breast_cooked: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
    rice_white_cooked: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  };
  
  const macros = stableMacros[inferredClassId];
  if (!macros) {
    return null;
  }
  
  return {
    name: `${query} (generic estimate)`,
    classId: inferredClassId,
    source: 'generic',
    kind: 'generic',
    isGeneric: true,
    servingGrams: 100,
    canonicalKey: `generic_${inferredClassId}`,
    ...macros
  };
}

/**
 * Enhanced subtitle generation for candidate display
 */
export function generateCandidateSubtitle(candidate: any): string {
  // Show brand when available
  if (candidate.brand || candidate.brandName) {
    return `Via ${candidate.brand || candidate.brandName}`;
  }
  
  // Show provider for non-generic items
  if (!candidate.isGeneric && candidate.provider && candidate.provider !== 'generic') {
    return `Via ${candidate.provider}`;
  }
  
  // Generic estimate
  if (candidate.isGeneric || candidate.kind === 'generic') {
    return 'Generic estimate';
  }
  
  // Fallback
  return candidate.servingText || `${candidate.servingGrams || 100}g default`;
}