import { analyzeLyfV1 } from './detectorClient';
import { looksFoodish, rankSource } from './filters';
import { mapVisionNameToFood } from './mapToNutrition';

export async function analyzePhotoForLyfV1(supabase: any, base64: string) {
  const { items, _debug } = await analyzeLyfV1(supabase, base64);
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] resp:', {
      from: _debug?.from,
      rawObjectsCount: _debug?.rawObjectsCount || _debug?.rawObjects || 0,
      rawLabelsCount: _debug?.rawLabelsCount || _debug?.rawLabels || 0
    });
  }
  
  // Build candidates: objects first, fall back to labels if no objects are foodish
  const objs = items.filter(i => i?.source === 'object' && i?.name && looksFoodish(i.name, i.source, i.confidence));
  const labs = items.filter(i => i?.source === 'label' && i?.name && looksFoodish(i.name, i.source, i.confidence) && (i.score || i.confidence || 0) >= 0.45);
  const candidates = objs.length > 0 ? objs : labs;
  
  if (import.meta.env.DEV) {
    console.info('[LYF][v1] candidates', candidates.map(c => `${c.name}:${(c.score || c.confidence || 0).toFixed(2)}:${c.source}`));
    console.info('[LYF][v1] keep:', candidates.map(i => i.name));
  }
  
  // Merge objects + labels, then dedupe by similarity ≥0.85 without requiring bbox
  const deduped = new Map<string, any>();
  for (const c of candidates) {
    const canonical = canonicalizeName(c.name);
    let shouldAdd = true;
    
    // Check similarity with existing items
    for (const [existingCanonical, existingItem] of deduped.entries()) {
      if (calculateSimilarity(canonical, existingCanonical) >= 0.85) {
        // Keep the better one (objects first, then higher confidence labels)
        if (c.source === 'object' && existingItem.source === 'label') {
          deduped.delete(existingCanonical);
          deduped.set(canonical, { ...c, canonicalName: canonical });
        } else if (c.source === existingItem.source && ((c.score || c.confidence || 0) > (existingItem.score || existingItem.confidence || 0))) {
          deduped.delete(existingCanonical);
          deduped.set(canonical, { ...c, canonicalName: canonical });
        }
        shouldAdd = false;
        break;
      }
    }
    
    if (shouldAdd) {
      deduped.set(canonical, { ...c, canonicalName: canonical });
    }
  }
  const dedupedCandidates = Array.from(deduped.values());
  
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