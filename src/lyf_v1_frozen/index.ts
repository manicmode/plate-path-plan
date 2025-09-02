import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish, looksFoodishLabel, looksFoodishObj, rankSource } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';

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
  
  // Build drop log for forensics
  const dropLog: Array<{name: string, source: string, reason: string}> = [];
  
  // Add concise dev logs
  console.info('[LYF][v1] raw:', `from=${_debug?.from} rawObjects=${_debug?.rawObjectsCount} rawLabels=${_debug?.rawLabelsCount}`);
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] raw:', items.map(i => i.name));
  }
  
  // Filter objects and labels with appropriate thresholds
  const objsKept = items.filter(i => {
    if (i?.source === 'object' && i?.name && looksFoodishObj(i.name, i.confidence || i.score)) {
      return true;
    } else if (i?.source === 'object') {
      dropLog.push({name: i.name, source: i.source, reason: 'belowScore'});
      return false;
    }
    return false;
  });
  
  const labsKept = items.filter(i => {
    if (i?.source === 'label' && i?.name && looksFoodishLabel(i.name, i.confidence || i.score)) {
      return true;
    } else if (i?.source === 'label') {
      dropLog.push({name: i.name, source: i.source, reason: 'belowScore'});
      return false;
    }
    return false;
  });
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] objs', objsKept.map(i => i.name));
    console.info('[LYF][v1] labs', labsKept.map(i => i.name));
  }
  
  // Debug switch - temporarily force labels
  const FORCE_LABELS = false; // turn off after test
  
  // Use labels if server chose labels OR no objects survived
  const useLabels = FORCE_LABELS || (_debug?.from === 'labels') || objsKept.length === 0;
  
  const isDup = (a: any, b: any) => {
    const aName = (a.canonicalName || canonicalizeName(a.name)).toLowerCase();
    const bName = (b.canonicalName || canonicalizeName(b.name)).toLowerCase();
    return aName === bName;
  };
  
  // Union in vegetables that should be kept even when objects exist
  const keepVeggieLabels = () => {
    const KEEP_VEGGIES = /^(asparagus|tomato|cherry tomato|lemon|lemon (slice|wedge)|dill)$/i;
    return labsKept.filter(lab => KEEP_VEGGIES.test(lab.name) && !objsKept.some(obj => isDup(lab, obj)));
  };
  
  const candidates = useLabels
    ? labsKept
    : // objects + non-duplicate helpful labels (veg/fruit) + special veggies
      [...objsKept, ...labsKept.filter(l => !objsKept.some(o => isDup(l, o))), ...keepVeggieLabels()];

  // Log union labels for vegetables
  const unionedVeggies = !useLabels ? keepVeggieLabels() : [];
  if (unionedVeggies.length > 0) {
    console.info('[LYF][v1] union-labels:', unionedVeggies.map(v => v.name));
  }
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] strategy:', useLabels ? 'labels' : 'objects+labels');
    console.info('[LYF][v1] candidates:', candidates.map(i => i.name));
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
  const dedupedCandidates = preferSpecific(candidatesWithCanonical, dropLog).slice(0, 8); // Cap at 8 after dedup
  
  // Log what we keep and drop
  console.info('[LYF][v1] keep:', dedupedCandidates.map(c => c.canonicalName));
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] deduped:', dedupedCandidates.map(c => `${c.canonicalName}:${c.source}`));
    console.info('[LYF][v1] drop:', summarizeDrops(dropLog));
    
    // Show detailed drop table if debug flag enabled
    const { FF } = await import('@/featureFlags');
    if (FF.FEATURE_LYF_V1_DEBUG) {
      console.table(dropLog);
    }
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

// Enhanced canonicalization for deduplication and synonym mapping
function canonicalizeName(name: string): string {
  let canonical = name.toLowerCase().trim();
  
  // Remove plurals and cooking methods
  canonical = canonical.replace(/s$/, '');
  canonical = canonical.replace(/\b(cooked|grilled|baked|fried|raw|fresh|smoked)\b/g, '').trim();
  canonical = canonical.replace(/\s+/g, ' ');
  
  // Apply synonym mapping including plurals → singular
  const synonymMap: Record<string, string> = {
    'cherry tomatoes': 'cherry tomato',
    'lemons': 'lemon',
    'lemon slices': 'lemon',
    'lemon wedges': 'lemon',
    'lemon slice': 'lemon',
    'lemon wedge': 'lemon',
    'lime wedge': 'lime',
    'salmon fillet': 'salmon',
    'asparagus spear': 'asparagus',
    'green asparagus': 'asparagus',
    'fish product': 'fish',
    'fish fillet': 'fish',
    'seafood': 'fish' // Dedupe generic seafood to fish
  };
  
  return synonymMap[canonical] || canonical;
}

// Prefer specific items over generic ones and remove duplicates
function preferSpecific(items: any[], dropLog: Array<{name: string, source: string, reason: string}>): any[] {
  const result = [];
  
  // First pass - categorize items
  const specifics = [];
  const generics = [];
  
  for (const item of items) {
    if (isGeneric(item.canonicalName)) {
      generics.push(item);
    } else {
      specifics.push(item);
    }
  }
  
  // Add all specific items
  result.push(...specifics);
  
  // Only add generics if no specific items exist for their category
  for (const generic of generics) {
    const hasSpecific = specifics.some(specific => {
      // Check if there's a specific item that would replace this generic
      const genericName = generic.canonicalName.toLowerCase();
      const specificName = specific.canonicalName.toLowerCase();
      
      // Fish generics - drop if we have salmon, tuna, etc.
      if (genericName.includes('fish') || genericName === 'seafood') {
        return /salmon|tuna|trout|cod|halibut|bass|mackerel/.test(specificName);
      }
      
      // Meat generics - drop if we have chicken, beef, etc.
      if (genericName === 'meat' || genericName === 'protein') {
        return /chicken|beef|pork|turkey|lamb|duck/.test(specificName);
      }
      
      return false;
    });
    
    if (!hasSpecific) {
      result.push(generic);
    } else {
      dropLog.push({name: generic.name, source: generic.source, reason: 'generic'});
    }
  }
  
  // Remove exact duplicates by canonical name
  const seen = new Set();
  const deduped = [];
  
  for (const item of result) {
    if (!seen.has(item.canonicalName)) {
      seen.add(item.canonicalName);
      deduped.push(item);
    } else {
      dropLog.push({name: item.name, source: item.source, reason: 'deduped'});
    }
  }
  
  return deduped;
}

function summarizeDrops(dropLog: Array<{name: string, source: string, reason: string}>): Record<string, string[]> {
  const summary: Record<string, string[]> = {
    nonFood: [],
    belowScore: [],
    generic: [],
    deduped: []
  };
  
  for (const drop of dropLog) {
    if (summary[drop.reason]) {
      summary[drop.reason].push(drop.name);
    }
  }
  
  return summary;
}

// Check if a canonical name is generic vs specific - enhanced for better dedup  
function isGeneric(canonical: string): boolean {
  const genericTerms = ['fish', 'fish product', 'seafood', 'meat', 'vegetable', 'fruit', 'protein'];
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
