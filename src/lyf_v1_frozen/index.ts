import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish, rankSource } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';

export async function analyzePhotoForLyfV1(supabase: any, base64: string) {
  const { items, _debug } = await analyzeLyfV1(supabase, base64);
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] candidates_in:', items.length);
  }
  
  const candidates = [...items].filter(i=>i?.name && looksFoodish(i.name)).sort(rankSource);
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] kept:', candidates.length, '| filtered_junk:', items.length - candidates.length);
  }
  
  // Dedupe by canonical name before mapping
  const deduped = new Map<string, any>();
  for (const c of candidates) {
    const canonical = canonicalizeName(c.name);
    if (!deduped.has(canonical)) {
      deduped.set(canonical, { ...c, canonicalName: canonical });
    }
  }
  const dedupedCandidates = Array.from(deduped.values());
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] dedup_heads:', dedupedCandidates.map(c => c.canonicalName));
  }
  
  // Try to map all candidates, keep unmapped items too
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
      // Keep unmapped items - user can edit them
      results.push({ 
        vision: c.name, 
        canonicalName: c.canonicalName,
        hit: null, 
        source: c.source, 
        mapped: false,
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
    'cherry tomato': 'tomato',
    'grape tomato': 'tomato', 
    'lemon slice': 'lemon',
    'lemon wedge': 'lemon',
    'lime wedge': 'lime',
    'salmon fillet': 'salmon',
    'asparagus spear': 'asparagus'
  };
  
  return synonymMap[canonical] || canonical;
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