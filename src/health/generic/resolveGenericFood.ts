import generic from '@/data/generic_foods.json';

export type GenericFood = typeof generic[number];

export function resolveGenericFood(name: string): GenericFood | null {
  const q = name?.toLowerCase().trim();
  if (!q) return null;
  
  console.log('[GENERIC][DEBUG] Looking up:', q);

  // exact slug/display match
  const direct = generic.find(g =>
    g.slug === q || g.display_name.toLowerCase() === q
  );
  if (direct) {
    console.log('[GENERIC][DEBUG] Direct match found:', direct.slug);
    return direct;
  }

  // alias / contains
  for (const g of generic) {
    console.log('[GENERIC][DEBUG] Checking:', g.slug);
    if (g.aliases?.some(a => a.toLowerCase() === q)) {
      console.log('[GENERIC][DEBUG] Alias match:', g.slug);
      return g;
    }
    if (g.slug.includes(q) || q.includes(g.slug)) {
      console.log('[GENERIC][DEBUG] Contains match:', g.slug, 'for query:', q);
      return g;
    }
  }
  console.log('[GENERIC][DEBUG] No match found for:', q);
  return null;
}

// Batch resolver for multiple food items
export function resolveGenericFoodBatch(names: string[]): GenericFood[] {
  console.log('[GENERIC][BATCH] Resolving batch:', names.length, 'items');
  const results = names.map(name => resolveGenericFood(name));
  const foundCount = results.filter(Boolean).length;
  console.log('[GENERIC][BATCH] Found', foundCount, 'of', names.length, 'items');
  return results;
}