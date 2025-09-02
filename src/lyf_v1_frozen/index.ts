import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';
import { FF } from '@/featureFlags';

// Preserve set for vegetables that should never be dropped
const PRESERVE_VEGGIES = new Set([
  'asparagus', 'tomato', 'cherry tomato', 'grape tomato', 'lemon', 'lemon slice', 
  'lemon wedge', 'lime', 'lime wedge', 'dill', 'parsley', 'cilantro', 'herb',
  'broccoli', 'carrot', 'spinach', 'lettuce', 'cucumber'
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
    // Never dedupe preserved vegetables
    if (PRESERVE_VEGGIES.has(key) || !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  
  return result;
}

export async function analyzePhotoForLyfV1(supabase: any, base64: string) {
  const { items, error, _debug } = await analyzeLyfV1(supabase, base64, { 
    debug: FF.FEATURE_LYF_V1_DEBUG 
  });
  
  if (error || !Array.isArray(items) || items.length === 0) {
    if (FF.FEATURE_LYF_V1_DEBUG) {
      console.warn('[LYF][v1] No items returned from detector:', error);
    }
    return { mappedFoodItems: [], error, _debug };
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

  // Union policy: when objects exist, always include preserved veg labels
  const useLabels = objsKept.length === 0;
  const candidates = useLabels
    ? labsKept
    : [...objsKept, ...labsKept.filter(l => {
        const n = l.name.toLowerCase();
        return PRESERVE_VEGGIES.has(n) && !objsKept.some(o => o.name.toLowerCase() === n);
      })];

  // Apply deduplication with vegetable protection
  const deduped = dedupePreferSpecific(candidates);
  
  if (FF.FEATURE_LYF_V1_DEBUG) {
    console.info('[LYF][v1] keep:', deduped.map(i => i.name));
    const dropped = items.filter(i => !deduped.some(d => d.name === i.name));
    if (dropped.length > 0) {
      console.info('[LYF][v1] drop:', dropped.map(i => `${i.name} (${i.source}, ${(i.confidence || i.score || 0).toFixed(2)})`));
    }
  }

  // Map to nutrition data - keep unmapped items with needsDetails flag
  const mappedFoodItems = [];
  for (const item of deduped) {
    const mapped = await mapVisionNameToFood(item.name);
    if (mapped) {
      mappedFoodItems.push({
        ...mapped,
        source: item.source,
        confidence: item.confidence ?? item.score,
        needsDetails: false,
        mapped: true
      });
    } else {
      // Keep unmapped preserved veggies instead of dropping them
      const shouldKeep = PRESERVE_VEGGIES.has(item.name.toLowerCase()) || item.source === 'object';
      if (shouldKeep) {
        mappedFoodItems.push({
          name: item.name,
          canonicalName: item.name,
          source: item.source,
          confidence: item.confidence ?? item.score,
          needsDetails: true,
          mapped: false,
          portionGrams: 100, // Default estimate
        });
      }
    }
  }

  return { mappedFoodItems, error, _debug };
}
