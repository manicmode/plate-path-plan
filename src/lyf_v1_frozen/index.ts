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
    console.info('[LYF][v1] candidates', candidates.map(c => `${c.name}:${(c.score || c.confidence || 0).toFixed(2)}:${c.source}`));
    console.info('[LYF][v1] keep:', candidates.map(i => i.name));
  }
  
  // Group by canonical name and de-duplicate 
  const grouped = new Map<string, any[]>();
  for (const c of candidates) {
    const canonical = canonicalizeName(c.name);
    if (!grouped.has(canonical)) {
      grouped.set(canonical, []);
    }
    grouped.get(canonical)!.push({ ...c, canonicalName: canonical });
  }
  
  // Choose representative from each group
  const dedupedCandidates = Array.from(grouped.entries()).map(([canonical, items]) => {
    // Prefer specific over generic (salmon > fish)
    const specific = items.filter(i => !isGeneric(canonical));
    const generic = items.filter(i => isGeneric(canonical));
    
    if (specific.length > 0 && generic.length > 0) {
      // Keep only specific, drop generic
      items = specific;
    }
    
    // Sort by: objects first, then highest confidence
    items.sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === 'object' ? -1 : 1;
      }
      return (b.confidence || b.score || 0) - (a.confidence || a.score || 0);
    });
    
    return items[0];
  }).slice(0, 8); // Cap at 8 after dedup
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] dedup_heads:', dedupedCandidates.map(c => c.canonicalName));
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

// Calculate similarity between two canonical names
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  let common = 0;
  wordsA.forEach(word => wordsB.has(word) && common++);
  return common / Math.max(1, Math.max(wordsA.size, wordsB.size));
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

// Check if a canonical name is generic vs specific
function isGeneric(canonical: string): boolean {
  const genericTerms = ['fish', 'fish product', 'meat', 'vegetable', 'fruit'];
  return genericTerms.includes(canonical.toLowerCase());
}