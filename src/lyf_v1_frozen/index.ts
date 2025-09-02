import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish, rankSource } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';
import { preferSpecific } from './preferSpecific';

// If some caller returns items without a source, default them using _debug.from
function ensureSources(items: any[], dbgFrom?: string) {
  const fallback: 'object' | 'label' = dbgFrom === 'objects' ? 'object' : 'label';
  return items.map((i: any) =>
    (i && i.source) ? i : { ...i, source: fallback }
  );
}

export async function analyzePhotoForLyfV1(supabase: any, base64: string) {
  console.info('[LYF][v1] path active');
  
  const { items: rawItems, _debug } = await analyzeLyfV1(supabase, base64);
  const items = ensureSources(rawItems ?? [], _debug?.from);
  
  // Allowlist for labels that we should keep even when objects exist
  const LABEL_KEEP_WHEN_OBJECTS = new Set([
    'asparagus', 'tomato', 'cherry tomato', 'lemon', 'dill', 'parsley', 'cilantro', 'herb'
  ]);
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] raw', { 
      from: _debug?.from, 
      rawObjectsCount: _debug?.rawObjectsCount, 
      rawLabelsCount: _debug?.rawLabelsCount 
    });
    console.info('[LYF][v1] raw:', items.map(i => i.name));
  }
  
  // Separate objects and labels for explicit merging
  const objs = items.filter(i => i?.source === 'object' && i?.name && looksFoodish(i.name, i.source, i.confidence || i.score));
  const labs = items.filter(i => i?.source === 'label' && i?.name && looksFoodish(i.name, i.source, i.confidence || i.score));
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] objs', objs.map(i => i.name));
    console.info('[LYF][v1] labs', labs.map(i => i.name));
  }
  
  // Start with objects (specific hits like salmon)
  let candidates = [...objs];
  
  // From labels, keep only whitelisted produce and not duplicates
  for (const lab of labs) {
    const n = (lab.canonicalName || canonicalizeName(lab.name)).toLowerCase();
    const already = candidates.some(
      c => (c.canonicalName || canonicalizeName(c.name)).toLowerCase() === n
    );
    if (!already && LABEL_KEEP_WHEN_OBJECTS.has(n)) {
      candidates.push(lab);
    }
  }
  
  // Add canonical names to candidates
  const candidatesWithCanonical = candidates.map(c => ({
    ...c,
    canonicalName: canonicalizeName(c.name)
  }));
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] kept', candidatesWithCanonical.map(i => i.canonicalName));
  }
  
  // Apply deduplication and prefer specific over generic
  const dedupedCandidates = preferSpecific(candidatesWithCanonical).slice(0, 8); // Cap at 8 after dedup
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] kept:', dedupedCandidates.map(c => c.canonicalName));
    console.info('[LYF][v1] deduped:', dedupedCandidates.map(c => `${c.canonicalName}:${c.source}`));
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

// Default portion estimates based on food type - plate-scale heuristics
function getDefaultGrams(canonicalName: string): number {
  const name = canonicalName.toLowerCase();
  
  // Proteins - typical serving sizes
  if (/salmon/.test(name)) return 140;
  if (/tuna|trout|fish/.test(name)) return 120;  
  if (/chicken|beef|pork|protein/.test(name)) return 120;
  
  // Vegetables - realistic plate portions
  if (/asparagus/.test(name)) return 80; // bunch on plate
  if (/broccoli|cauliflower/.test(name)) return 100;
  if (/cherry tomato/.test(name)) return 40; // 4-5 pieces
  if (/tomato/.test(name)) return 80; // medium tomato slices
  
  // Citrus - garnish amounts
  if (/lemon|lime/.test(name)) return 10; // wedge
  
  // Starches
  if (/rice|pasta|bread/.test(name)) return 150;
  
  // Leafy greens 
  if (/lettuce|spinach|kale/.test(name)) return 50;
  
  return 100; // Default fallback
}
