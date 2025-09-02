import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish, rankSource } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';

// If some caller returns items without a source, default them using _debug.from
function ensureSources(items: any[], dbgFrom?: string) {
  const fallback: 'object' | 'label' = dbgFrom === 'objects' ? 'object' : 'label';
  return items.map((i: any) =>
    (i && i.source) ? i : { ...i, source: fallback }
  );
}

export async function analyzePhotoForLyfV1(supabase: any, base64: string) {
  const { items: rawItems, _debug } = await analyzeLyfV1(supabase, base64);
  const items = ensureSources(rawItems ?? [], _debug?.from);
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] resp:', {
      from: _debug?.from,
      rawObjectsCount: _debug?.rawObjectsCount || _debug?.rawObjects || 0,
      rawLabelsCount: _debug?.rawLabelsCount || _debug?.rawLabels || 0
    });
  }
  
  // Build single candidate list from all normalized items
  const candidates = items.filter(i => i?.name && looksFoodish(i.name, i.source, i.confidence || i.score));
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] raw:', items.map(i => i.name));
    console.info('[LYF][v1] candidates', candidates.map(c => `${c.name}:${(c.score || c.confidence || 0).toFixed(2)}:${c.source}`));
  }
  
  // Add canonical names to candidates
  const candidatesWithCanonical = candidates.map(c => ({
    ...c,
    canonicalName: canonicalizeName(c.name)
  }));
  
  // Apply deduplication and prefer specific over generic
  const dedupedCandidates = preferSpecific(candidatesWithCanonical).slice(0, 8); // Cap at 8 after dedup
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] keep:', dedupedCandidates.map(c => c.canonicalName));
  }
  
  // NEVER DROP unmapped items - include all candidates that pass filters
  const results: any[] = [];
  let mapped = 0, unmapped = 0;
  
  for (const c of dedupedCandidates) {
    const hit = await mapVisionNameToFood(c.canonicalName);
    if (hit) {
      results.push({ 
        vision: c.name, 
        canonicalName: c.canonicalName,
        hit, 
        source: c.source, 
        mapped: true,
        grams: getDefaultGrams(c.canonicalName)
      });
      mapped++;
    } else {
      // KEEP unmapped items - user can edit them in review modal
      results.push({ 
        vision: c.name, 
        canonicalName: c.canonicalName,
        hit: null, 
        source: c.source, 
        mapped: false,
        needsDetails: true,
        grams: getDefaultGrams(c.canonicalName)
      });
      unmapped++;
    }
  }
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] mapped:', mapped, '| unmapped:', unmapped);
  }
  
  return { mapped: results, _debug };
}

// Simple canonicalization for deduplication
function canonicalizeName(name: string): string {
  let canonical = name.toLowerCase().trim();
  
  // Remove plurals and cooking methods
  canonical = canonical.replace(/s$/, '');
  canonical = canonical.replace(/\b(cooked|grilled|baked|fried|raw|fresh|smoked)\b/g, '').trim();
  canonical = canonical.replace(/\s+/g, ' ');
  
  // Apply synonym mapping
  const synonymMap: Record<string, string> = {
    'cherry tomatoes': 'cherry tomato',
    'cherry tomato': 'tomato',
    'grape tomato': 'tomato', 
    'lemon slice': 'lemon',
    'lemon wedge': 'lemon',
    'lime wedge': 'lime',
    'salmon fillet': 'salmon',
    'asparagus spear': 'asparagus',
    'fish product': 'fish',
    'fish fillet': 'fish'
  };
  
  return synonymMap[canonical] || canonical;
}

// Check if a canonical name is generic vs specific
function isGeneric(canonical: string): boolean {
  const genericTerms = ['fish', 'meat', 'vegetable', 'fruit', 'seafood', 'protein'];
  return genericTerms.includes(canonical.toLowerCase());
}

// Prefer specific over generic foods
function preferSpecific(items: any[]): any[] {
  const grouped = new Map<string, any[]>();
  
  // Group by canonical name
  for (const item of items) {
    const canonical = item.canonicalName;
    if (!grouped.has(canonical)) {
      grouped.set(canonical, []);
    }
    grouped.get(canonical)!.push(item);
  }
  
  const result: any[] = [];
  
  // For each canonical group, choose the best representative
  for (const [canonical, group] of grouped.entries()) {
    // Sort by source (object > label) then confidence
    group.sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === 'object' ? -1 : 1;
      }
      return (b.confidence || b.score || 0) - (a.confidence || a.score || 0);
    });
    
    result.push(group[0]); // Take the best one
  }
  
  // Now handle generic vs specific deduplication
  const specificItems = result.filter(item => !isGeneric(item.canonicalName));
  const genericItems = result.filter(item => isGeneric(item.canonicalName));
  
  // If we have specific fish like "salmon", remove generic "fish"
  const hasSpecificFish = specificItems.some(item => 
    ['salmon', 'tuna', 'cod', 'trout', 'bass'].includes(item.canonicalName)
  );
  
  if (hasSpecificFish) {
    // Remove generic fish items
    return specificItems.concat(genericItems.filter(item => item.canonicalName !== 'fish'));
  }
  
  return result;
}

// Default portion estimates based on food type
function getDefaultGrams(canonicalName: string): number {
  const name = canonicalName.toLowerCase();
  
  if (/salmon|tuna|trout|fish/.test(name)) return 140;
  if (/chicken|beef|pork|protein/.test(name)) return 120;
  if (/asparagus/.test(name)) return 90;
  if (/broccoli|cauliflower/.test(name)) return 100;
  if (/tomato/.test(name)) return 30;
  if (/lemon|lime/.test(name)) return 10;
  if (/rice|pasta|bread/.test(name)) return 150;
  if (/lettuce|spinach|kale/.test(name)) return 50;
  
  return 100; // Default fallback
}
