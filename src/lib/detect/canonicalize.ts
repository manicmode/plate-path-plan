/**
 * Food Item Canonicalization and Deduplication
 * Maps food variations to canonical names and filters by confidence
 */

interface GptItem {
  name: string;
  category: string;
  confidence: number;
  portion_hint: string | null;
}

// Reject list - expanded from router requirements
const REJECT = new Set([
  'plate', 'dish', 'bowl', 'table', 'tableware', 'cutlery', 'fork', 
  'knife', 'spoon', 'cup', 'glass', 'napkin', 'placemat',
  'packaging', 'label', 'can', 'jar', 'bottle', 'packet', 'wrapper',
  'syrup', 'curd', 'ketchup', 'cookie', 'snack bar', 'cereal bar', 'candy',
  'container', 'bar', 'snack'
]);

// Category-specific confidence minimums
const CONFIDENCE_MINS: Record<string, number> = {
  protein: 0.60,
  vegetable: 0.45, // Lowered from 0.50 to avoid dropping asparagus in bright plates
  fruit: 0.50,
  grain: 0.60,
  dairy: 0.60,
  fat_oil: 0.65,
  sauce_condiment: 0.70
};

export function toCanonicalName(name: string): string {
  const lower = name.toLowerCase().trim();
  
  // Remove common descriptors
  const cleaned = lower
    .replace(/\b(grilled|fresh|cooked|steamed|baked|roasted|sauteed|raw|organic|local)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Map variants to canonical names
  const mappings: Record<string, string> = {
    // Salmon variants
    'salmon fillet': 'salmon',
    'salmon filet': 'salmon',
    'grilled salmon': 'salmon',
    'baked salmon': 'salmon',
    
    // Citrus variants (keep lemon wedge, reject curd/syrup)
    'lime': 'lemon',
    'meyer lemon': 'lemon',
    'lime wedge': 'lemon',
    
    // Salad variants
    'side salad': 'salad',
    'green salad': 'salad',
    'mixed salad': 'salad',
    'garden salad': 'salad',
    
    // Asparagus synonyms
    'asparagus spears': 'asparagus',
    'asparagus tips': 'asparagus',
    'spears': 'asparagus', // when context is clear
    
    // Tomato synonyms
    'cherry tomatoes': 'tomato',
    'tomato slices': 'tomato',
    
    // Common proteins
    'chicken breast': 'chicken',
    'chicken fillet': 'chicken',
    'beef steak': 'beef',
    'pork chop': 'pork',
    
    // Reject mappings (return empty to filter out)
    'lemon curd': '',
    'lemon syrup': '',
    // Special case: keep asparagus from risotto if no grain detected
    'asparagus risotto': 'asparagus'
  };
  
  return mappings[cleaned] || cleaned;
}

export function dedupe(items: GptItem[]): GptItem[] {
  const canonicalMap = new Map<string, GptItem>();
  const hasSalad = items.some(item => toCanonicalName(item.name) === 'salad');
  
  for (const item of items) {
    const canonical = toCanonicalName(item.name);
    if (!canonical) continue; // Skip rejected items
    
    // Special case: keep both "salad" AND "tomato" if tomato has confidence ≥0.65
    if (canonical === 'tomato' && hasSalad && item.confidence >= 0.65) {
      canonicalMap.set('tomato', { ...item, name: 'tomato' });
      continue;
    }
    
    const existing = canonicalMap.get(canonical);
    if (!existing || item.confidence > existing.confidence) {
      canonicalMap.set(canonical, {
        ...item,
        name: canonical,
        portion_hint: existing ? 
          [existing.portion_hint, item.portion_hint].filter(Boolean).join(' + ') : 
          item.portion_hint
      });
    }
  }
  
  return Array.from(canonicalMap.values());
}

export function filterByConfidence(items: GptItem[], globalMin: number = 0.55): GptItem[] {
  return items.filter(item => {
    const categoryMin = CONFIDENCE_MINS[item.category] || globalMin;
    return item.confidence >= categoryMin;
  });
}

export function finalReject(items: GptItem[]): GptItem[] {
  return items.filter(item => {
    const name = item.name.toLowerCase();
    return name && !REJECT.has(name);
  });
}

export function processGptItems(rawItems: GptItem[]): GptItem[] {
  console.info('[GPT][raw_items]', `count=${rawItems.length}`);
  
  // Apply canonicalization and deduplication
  const canonicalized = dedupe(rawItems);
  const filtered = filterByConfidence(canonicalized);
  const final = finalReject(filtered);
  
  console.info('[FILTER][kept]', `count=${final.length}`, `names=[${final.map(i => i.name).join(', ')}]`);
  
  return final;
}