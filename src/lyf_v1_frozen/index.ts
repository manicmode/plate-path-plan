import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';

// Preserve set for vegetables that should never be dropped
const PRESERVE_VEGGIES = new Set([
  'asparagus','tomato','cherry tomato','lemon','lime','broccoli','carrot','spinach','lettuce','cucumber'
]);

// Enhanced looksFoodish functions
const looksFoodishObj = (name: string, confidence: number) => {
  return looksFoodish(name);
};

const looksFoodishLabel = (name: string, confidence: number) => {
  return looksFoodish(name);
};

function dedupePreferSpecific(items: any[]): any[] {
  const seen = new Set();
  const result = [];
  
  // Sort to prefer specific over generic (salmon over fish)
  const sorted = items.sort((a, b) => {
    const aGeneric = /^(fish|meat|seafood|protein|vegetable|fruit)$/i.test(a.name);
    const bGeneric = /^(fish|meat|seafood|protein|vegetable|fruit)$/i.test(b.name);
    if (aGeneric && !bGeneric) return 1;
    if (!aGeneric && bGeneric) return -1;
    return (b.confidence || 0) - (a.confidence || 0);
  });
  
  for (const item of sorted) {
    const key = item.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  
  return result;
}

export async function analyzePhotoForLyfV1(supabase: any, base64: string) {
  const { items, _debug } = await analyzeLyfV1(supabase, base64);
  
  if (!Array.isArray(items) || items.length === 0) {
    console.warn('[LYF][v1] No items returned from detector');
    return { mappedFoodItems: [], _debug };
  }

  // Keep objects normally; labels with relaxed veg threshold
  const objsKept = items.filter(i =>
    i?.source === 'object' && looksFoodishObj(i.name, i.confidence ?? i.score ?? 0)
  );

  const labsKept = items.filter(i => {
    if (i?.source !== 'label') return false;
    const n = (i.name || '').toLowerCase();
    const conf = i.confidence ?? i.score ?? 0;
    const min = PRESERVE_VEGGIES.has(n) ? 0.25 : 0.45;
    return conf >= min && looksFoodishLabel(i.name, conf);
  });

  // Dedupe that NEVER removes vegetables
  const isDup = (a: any, b: any) => {
    const A = (a.canonicalName || a.name || '').toLowerCase();
    const B = (b.canonicalName || b.name || '').toLowerCase();
    if (PRESERVE_VEGGIES.has(A) || PRESERVE_VEGGIES.has(B)) return false;
    return A === B;
  };

  // Union policy: when objects exist, always include preserved veg labels
  const useLabels = objsKept.length === 0;
  const candidates = useLabels
    ? labsKept
    : [...objsKept, ...labsKept.filter(l =>
        PRESERVE_VEGGIES.has(l.name.toLowerCase()) || !objsKept.some(o => isDup(l, o))
      )];

  // Apply deduplication with vegetable protection
  const deduped = dedupePreferSpecific(candidates);
  
  console.info('[LYF][v1] keep:', deduped.map(i => i.name));

  // Map to nutrition data - keep unmapped items with needsDetails flag
  const mappedFoodItems = [];
  for (const item of deduped) {
    const mapped = await mapVisionNameToFood(item.name);
    if (mapped) {
      mappedFoodItems.push({
        ...mapped,
        source: item.source,
        confidence: item.confidence ?? item.score,
        needsDetails: false
      });
    } else {
      // Keep unmapped items instead of dropping them
      mappedFoodItems.push({
        name: item.name,
        canonicalName: item.name,
        source: item.source,
        confidence: item.confidence ?? item.score,
        needsDetails: true,
        portionGrams: 100, // Default estimate
      });
    }
  }

  return { mappedFoodItems, _debug };
}
