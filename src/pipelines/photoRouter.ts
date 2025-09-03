// photoRouter.ts - Enhanced Photo Flow V2 with robust mapping and portion estimation
import { supabase } from '@/integrations/supabase/client';
import { searchFoodByName, CanonicalSearchResult } from '@/lib/foodSearch';
import { PER_GRAM_DEFAULTS, defaultKeyFor, calculateSizeMultiplier } from '@/lib/nutrition/portionDefaults';

export type PhotoRoute =
  | { kind: 'label'; data: any }
  | { kind: 'meal'; data: any };

// Negative regex for filtering junk (defense in depth)
const NEGATIVE_PATTERN = /\b(microsoft|software|logo|screen|monitor|pack|sleeve|kit|brand|message|create|cookie|package|wrapper|container|box|label|sign|text|word|letter|number)\b/i;

function looksFoodish(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 2 && !NEGATIVE_PATTERN.test(trimmed);
}

// Normalize text for similarity comparison
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Calculate similarity between two strings using token overlap
function calculateSimilarity(a: string, b: string): number {
  const setA = new Set(normalize(a).split(' '));
  const setB = new Set(normalize(b).split(' '));
  
  let hits = 0;
  setA.forEach(token => {
    if (setB.has(token)) hits++;
  });
  
  return hits / Math.max(1, Math.max(setA.size, setB.size));
}

// Enhanced fuzzy mapping with similarity threshold
async function mapVisionNameToFood(name: string): Promise<CanonicalSearchResult | null> {
  try {
    // Direct search with similarity scoring
    const results = await searchFoodByName(name, { maxResults: 3 });
    if (results.length > 0) {
      // Sort by similarity and take best match if above threshold
      const scored = results.map(result => ({
        ...result,
        similarity: calculateSimilarity(name, result.name)
      }));
      
      scored.sort((a, b) => b.similarity - a.similarity);
      
      if (scored[0].similarity >= 0.45) {
        console.debug(`[PHOTO][MAP] "${name}" -> "${scored[0].name}" (sim: ${scored[0].similarity.toFixed(2)})`);
        return scored[0];
      }
    }
    
    // Helper mapping for common Vision API terms
    const normalized = normalize(name);
    const helpers: Record<string, string> = {
      salmon: 'salmon cooked',
      fish: 'salmon cooked',
      asparagus: 'asparagus cooked', 
      tomato: 'tomato raw',
      rice: 'rice cooked',
      pasta: 'pasta cooked',
      noodle: 'pasta cooked',
      bread: 'bread whole wheat',
      egg: 'eggs scrambled',
      lettuce: 'lettuce raw',
      salad: 'mixed greens raw',
      chicken: 'chicken breast cooked',
      beef: 'beef sirloin cooked',
      steak: 'beef sirloin cooked',
      shrimp: 'shrimp cooked',
      prawn: 'shrimp cooked',
      tofu: 'tofu firm'
    };
    
    for (const [key, fallback] of Object.entries(helpers)) {
      if (normalized.includes(key)) {
        const fallbackResults = await searchFoodByName(fallback, { maxResults: 1 });
        if (fallbackResults.length > 0) {
          console.debug(`[PHOTO][MAP] "${name}" -> "${fallbackResults[0].name}" (helper: ${key})`);
          return fallbackResults[0];
        }
      }
    }
    
    return null;
  } catch (e) {
    console.warn(`[PHOTO][MEAL] Failed to map "${name}":`, e);
    return null;
  }
}

// Count instances of similar objects using bounding boxes  
function countInstances(targetName: string, allObjects: any[]): number {
  const targetNorm = normalize(targetName);
  const matches = allObjects.filter(obj => 
    obj.source === 'object' && 
    normalize(obj.name).includes(targetNorm)
  );
  return Math.max(1, matches.length);
}

async function analyzeMealBase64(b64: string, signal?: AbortSignal) {
  console.debug('[PHOTO][MEAL] invoke=function=meal-detector');
  try {
    const { data, error } = await supabase.functions.invoke('meal-detector', {
      body: { image_base64: b64 },
    });
    if (error) {
      console.log('[PHOTO][MEAL] error:', error);
      throw error;
    }
    
    console.log('[PHOTO][MEAL] detector response:', data);
    const debug = data?._debug || {};
    console.log(`[PHOTO][MEAL][_debug] from=${debug.from} count=${debug.count || 0}`);
    
    // Enhanced Photo Flow V2: Filter, rank, and map candidates
    const sourceWeight = { object: 2, label: 1 };
    const allCandidates = (data?.items || [])
      .sort((a, b) => (sourceWeight[b.source || 'label'] - sourceWeight[a.source || 'label']) || (b.confidence - a.confidence));

    console.log(`[PHOTO][MEAL] total_candidates=${allCandidates.length}`);

    // Filter foodish candidates (defense in depth)
    const foodishCandidates = allCandidates.filter(c => looksFoodish(c.name));
    const rawNames = foodishCandidates.map((i: any) => i.name);
    console.log(`[PHOTO][MEAL] foodish_candidates=${foodishCandidates.length} names=[${rawNames.join(',')}]`);
    
    // Map to nutrition database
    const mappedItems = [];
    const skippedNames = [];
    
    for (const candidate of foodishCandidates) {
      const nutrition = await mapVisionNameToFood(candidate.name);
      if (nutrition) {
        mappedItems.push({
          ...candidate,
          nutritionData: nutrition
        });
      } else {
        skippedNames.push(candidate.name);
      }
    }
    
    console.warn("[PHOTO][GOLDEN] mapped items", mappedItems, "raw", allCandidates);
    
    // Debug bypass fallback: if no mapped items but raw detector has items
    if (mappedItems.length === 0 && allCandidates?.length > 0) {
      console.warn("[PHOTO][GOLDEN] bypassing meal-only filter, forwarding raw candidates");
      // Add raw candidates as mapped items with minimal nutrition data for display
      for (const candidate of allCandidates) {
        mappedItems.push({
          ...candidate,
          nutritionData: {
            name: candidate.name,
            id: `raw-${candidate.name}`,
            calories_per_100g: 100, // placeholder values for display
            protein_per_100g: 5,
            carbs_per_100g: 10,
            fat_per_100g: 3
          }
        });
      }
    }
    
    // Portion estimation for mapped items
    const objectsOnly = allCandidates.filter(i => i.source === 'object');
    const plateCandidate = objectsOnly.find(o => /(plate|dish|bowl)/i.test(o.name));
    
    const mealPortions = mappedItems.map(m => {
      const key = defaultKeyFor(m.nutritionData.name);
      const portionDef = PER_GRAM_DEFAULTS[key] || PER_GRAM_DEFAULTS.generic;
      
      const count = portionDef.unit === 'piece' ? countInstances(m.name, objectsOnly) : 1;
      const sizeMult = calculateSizeMultiplier(m.box, plateCandidate?.box);
      const grams = Math.round(portionDef.grams * count * sizeMult);
      
      return {
        name: m.nutritionData.name,
        grams,
        source: m.source,
        vision: m.name,
        nutritionData: m.nutritionData
      };
    });
    
    const mappedSummary = mealPortions.map(m => ({ vision: m.vision, to: m.name, source: m.source }));
    console.debug('[PHOTO][MEAL][MAP]', { mapped: mappedSummary, skipped: skippedNames, debug });
    console.debug('[PHOTO][PORTION]', mealPortions.map(p => ({ name: p.name, grams: p.grams, source: p.source })));
    
    return { items: mealPortions, skippedCount: skippedNames.length };
  } catch (e) {
    console.debug('[PHOTO][MEAL] analyzer unavailable', e);
    return { items: [], skippedCount: 0 };
  }
}

export async function routePhoto(b64: string, abort?: AbortSignal): Promise<PhotoRoute> {
  console.log('[PHOTO][ROUTE] Starting photo analysis (meal-only)...');
  
  // MEAL ONLY: Skip OCR entirely and go straight to meal detection
  const mealResult = await analyzeMealBase64(b64, abort);
  const items = mealResult.items || [];
  
  console.log(`[PHOTO][ROUTE] kind=meal mapped_items=${items.length} skipped=${mealResult.skippedCount || 0}`);
  
  return { kind: 'meal', data: { items, skippedCount: mealResult.skippedCount } };
}