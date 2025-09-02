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
  'container', 'bar', 'snack', 'haze', 'mist', 'text', 'brand', 'logo'
]);

// Canonicalization mappings
const CANON_MAP: Record<string, string> = {
  // citrus
  'meyer lemon': 'lemon',
  'sweet lemon': 'lemon', 
  'key lime': 'lime',
  'persian lime': 'lime',
  'lime wedge': 'lime',
  'lemon wedge': 'lemon',
  // greens
  'greens': 'salad',
  'mixed greens': 'salad',
  'spring mix': 'salad',
  // asparagus
  'asparagus spears': 'asparagus',
  'asparagus tips': 'asparagus',
  'spears': 'asparagus',
  // tomato
  'cherry tomatoes': 'tomato',
  'tomato slices': 'tomato',
  // salad variants
  'side salad': 'salad',
  'green salad': 'salad',
  'mixed salad': 'salad',
  'garden salad': 'salad',
};

// Citrus deduplication - never both lemon and lime
const MAX_ONE_KEYS = new Set(['lemon', 'lime']);

// Non-food terms vocabulary
export const NON_FOOD_TERMS = new Set([
  'ground','soil','gravel','concrete','asphalt','road','carpet','mat','tile','floor','table','tableware','fork','knife','spoon','plate','bowl','cup','glass','napkin','utensil',
  'mist','haze','fog','smog','smoke','cloud','sky','shadow','reflection','glare','blur','noise','grain','gray','grey','monochrome','bokeh',
  'package','packaging','label','barcode','can','jar','bottle','wrapper','packet','box'
]);

// Food dictionary for validation
const FOOD_TERMS = new Set([
  // Proteins
  'salmon','chicken','beef','pork','fish','turkey','duck','lamb','tuna','cod','shrimp','crab','lobster','egg','tofu','tempeh','beans','lentils','chickpeas',
  // Vegetables  
  'asparagus','tomato','carrot','broccoli','spinach','lettuce','onion','garlic','pepper','cucumber','zucchini','potato','sweet potato','corn','peas','celery','mushroom','cabbage','kale','arugula','salad',
  // Fruits
  'apple','banana','orange','lemon','lime','berry','strawberry','blueberry','grape','pineapple','mango','avocado','peach','pear','cherry','melon','watermelon',
  // Grains
  'rice','pasta','bread','quinoa','oats','barley','wheat','noodles','couscous','bulgur','risotto',
  // Dairy
  'cheese','milk','yogurt','butter','cream','mozzarella','cheddar','parmesan','feta',
  // Fats/oils
  'oil','olive oil','coconut oil','nuts','almonds','walnuts','seeds',
  // Sauces/condiments
  'sauce','dressing','vinegar','mustard','mayo','pesto','salsa'
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
  
  // Apply canonical mappings
  const canonical = CANON_MAP[cleaned] || cleaned;
  
  // Reject mappings (return empty to filter out)
  if (canonical === 'lemon curd' || canonical === 'lemon syrup') return '';
  
  return canonical;
}

// Score items for ranking (protein first, asparagus boost, citrus penalty)
export function scoreItem(item: GptItem): number {
  let score = item.confidence ?? 0.5;
  
  if (item.name === 'salmon') score += 0.35;
  if (item.name === 'asparagus') score += 0.20;
  if (item.name === 'lemon' || item.name === 'lime') score -= 0.10; // prevent citrus dominating
  
  return score;
}

export function dedupe(items: GptItem[]): GptItem[] {
  const canonicalMap = new Map<string, GptItem>();
  const hasSalad = items.some(item => toCanonicalName(item.name) === 'salad');
  
  for (const item of items) {
    const canonical = toCanonicalName(item.name);
    if (!canonical) {
      console.info('[ROUTER][drop:reason]', 'empty-canonical', `name=${item.name}`);
      continue; // Skip rejected items
    }
    
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
  
  // Handle citrus deduplication - never both lemon and lime
  const citrusItems = Array.from(canonicalMap.entries()).filter(([name]) => MAX_ONE_KEYS.has(name));
  if (citrusItems.length > 1) {
    // Keep the one with higher confidence
    const bestCitrus = citrusItems.reduce((best, current) => 
      current[1].confidence > best[1].confidence ? current : best
    );
    
    // Remove all other citrus items
    for (const [name, item] of citrusItems) {
      if (name !== bestCitrus[0]) {
        canonicalMap.delete(name);
        console.info('[ROUTER][drop:reason]', 'citrus-collision', `name=${name}`);
      }
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

export function filterNonFood(items: GptItem[]): GptItem[] {
  const filtered = items.filter(item => {
    const name = (item.name || '').toLowerCase();
    for (const term of NON_FOOD_TERMS) {
      if (name.includes(term)) return false;
    }
    return true;
  });
  
  const removedCount = items.length - filtered.length;
  if (removedCount > 0) {
    console.info('[FILTER][nonfood_removed]', `count=${removedCount}`);
  }
  
  return filtered;
}

export function isLikelyFoodName(name: string): boolean {
  const lowerName = name.toLowerCase();
  for (const foodTerm of FOOD_TERMS) {
    if (lowerName.includes(foodTerm)) return true;
  }
  return false;
}

export function processGptItems(rawItems: GptItem[]): GptItem[] {
  console.info('[GPT][raw_items]', `count=${rawItems.length}`);
  
  // Apply canonicalization and deduplication
  let items = dedupe(rawItems);
  
  // Apply filtering pipeline
  const strictFilters = import.meta.env.VITE_DETECT_STRICT_NONFOOD === 'true';
  if (strictFilters) {
    items = filterNonFood(items);
    items = items.filter(i => {
      const isFood = isLikelyFoodName(i.name);
      if (!isFood) {
        console.info('[ROUTER][drop:reason]', 'not-food', `name=${i.name}`);
      }
      return isFood;
    });
  }
  
  items = filterByConfidence(items);
  items = finalReject(items);
  
  // Score and sort items (protein first, then by score)
  items = items
    .map(item => ({ ...item, score: scoreItem(item) }))
    .sort((a, b) => {
      // Salmon and asparagus are "sticky" - never drop them
      const aSalmonAsp = a.name === 'salmon' || a.name === 'asparagus';
      const bSalmonAsp = b.name === 'salmon' || b.name === 'asparagus';
      
      if (aSalmonAsp && !bSalmonAsp) return -1;
      if (!aSalmonAsp && bSalmonAsp) return 1;
      
      return (b as any).score - (a as any).score;
    })
    .slice(0, 5) // Keep top 5, but sticky items are protected
    .map(({ score, ...item }) => item); // Remove score field
  
  console.info('[FILTER][kept]', `count=${items.length}`, `names=[${items.map(i => i.name).join(', ')}]`);
  
  return items;
}