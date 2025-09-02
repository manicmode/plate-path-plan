import { VisionFood } from './vision_v1';
import { looksFoodish } from './filters';

export interface FusedFood {
  canonicalName: string;
  sources: Set<'vision' | 'gpt'>;
  bbox?: { x: number; y: number; width: number; height: number };
  score?: number;
  origin: 'vision' | 'gpt' | 'both';
}

// Canonicalization and synonym table - merge variants to head terms
const SYNONYMS: Record<string, string> = {
  // Salmon variants
  'salmon': 'salmon',
  'salmon fillet': 'salmon',
  'smoked salmon': 'salmon', 
  'grilled salmon': 'salmon',
  'baked salmon': 'salmon',
  'cooked salmon': 'salmon',
  
  // Tomato variants  
  'cherry tomato': 'cherry tomato', // Keep cherry tomato distinct from regular tomato
  'cherry tomatoes': 'cherry tomato',
  'grape tomato': 'cherry tomato', 
  'grape tomatoes': 'cherry tomato',
  'tomato': 'tomato',
  'tomatoes': 'tomato',
  'tomato slice': 'tomato',
  'tomato slices': 'tomato',
  
  // Lemon variants - all map to lemon
  'lemon': 'lemon',
  'lemon slice': 'lemon',
  'lemon slices': 'lemon',
  'lemon wedge': 'lemon',
  'lemon wedges': 'lemon',
  
  // Lime variants
  'lime': 'lime',
  'lime wedge': 'lime',
  'lime wedges': 'lime',
  
  // Asparagus variants
  'asparagus': 'asparagus',
  'asparagus spear': 'asparagus',
  'asparagus spears': 'asparagus',
  'green asparagus': 'asparagus',
  
  // Other foods
  'fries': 'french fries',
  'french fry': 'french fries', 
  'potato fries': 'french fries',
  'chicken breast': 'chicken',
  'grilled chicken': 'chicken',
  'beef steak': 'beef',
  'sirloin': 'beef',
  'white rice': 'rice',
  'brown rice': 'rice',
  'cooked rice': 'rice',
  'pasta noodles': 'pasta',
  'spaghetti': 'pasta',
  'penne': 'pasta',
  'mixed greens': 'salad',
  'green salad': 'salad',
  'lettuce leaves': 'lettuce',
  'spinach leaves': 'spinach'
};

export function canonicalize(name: string): string {
  // Lowercase, trim, basic cleanup
  let canonical = name.toLowerCase().trim();
  
  // Remove common suffixes
  canonical = canonical.replace(/s$/, ''); // Remove plural
  canonical = canonical.replace(/\b(cooked|grilled|baked|fried|raw|fresh)\b/g, '').trim();
  canonical = canonical.replace(/\s+/g, ' '); // Normalize spaces
  
  // Apply synonym table
  const synonym = SYNONYMS[canonical];
  if (synonym) {
    canonical = synonym;
  }
  
  return canonical;
}

// Improved similarity function for better deduplication
export function similar(a: string, b: string): number {
  const aTokens = new Set(a.toLowerCase().split(' '));
  const bTokens = new Set(b.toLowerCase().split(' '));
  
  // Check if one contains the other (e.g., "cherry tomato" vs "tomato")
  if (a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase())) {
    return 0.9; // High similarity for containment
  }
  
  let intersection = 0;
  aTokens.forEach(token => {
    if (bTokens.has(token)) intersection++;
  });
  
  const union = aTokens.size + bTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export interface DetectedItem {
  name: string;
  confidence: number;
  category: 'veg' | 'protein' | 'starch' | 'fruit' | 'other';
  source: 'gpt' | 'vision' | 'both';
}

export async function detectItemsEnsemble(imageFile: File): Promise<DetectedItem[]> {
  const TIMEOUT_MS = 8000;
  const VEGGIE_HERBS = new Set(['asparagus', 'lemon', 'avocado', 'broccoli', 'spinach', 'tomato', 'cucumber', 'carrot', 'pepper', 'onion', 'garlic', 'herbs', 'basil', 'cilantro']);
  
  try {
    // GPT-first detection with timeout
    const gptPromise = callGptVisionDetection(imageFile);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('GPT_TIMEOUT')), TIMEOUT_MS)
    );
    
    let gptItems: DetectedItem[] = [];
    let visionItems: DetectedItem[] = [];
    
    try {
      gptItems = await Promise.race([gptPromise, timeoutPromise]);
    } catch (error) {
      console.warn('[DETECTION] GPT timeout, falling back to vision-first');
      // Fall back to vision detection
      visionItems = await callVisionDetection(imageFile);
    }
    
    // If GPT succeeded, supplement with vision for missing veggies
    if (gptItems.length > 0) {
      visionItems = await callVisionDetection(imageFile);
      const gptNames = new Set(gptItems.map(item => canonicalize(item.name)));
      
      // Add vision items only if they're veggies/herbs and not in GPT results
      for (const visionItem of visionItems) {
        const canonical = canonicalize(visionItem.name);
        if (VEGGIE_HERBS.has(canonical) && !gptNames.has(canonical)) {
          gptItems.push({
            name: canonical,
            confidence: visionItem.confidence * 0.8, // Slightly lower confidence
            category: 'veg',
            source: 'vision'
          });
        }
      }
    }
    
    const allItems = gptItems.length > 0 ? gptItems : visionItems;
    
    // Canonicalize and dedupe
    const canonicalized = allItems.map(item => ({
      ...item,
      name: canonicalize(item.name)
    }));
    
    const deduped = dedupe(canonicalized);
    
    if (import.meta.env?.DEV) {
      console.info('[DETECTION] backend=gpt-first, items=', deduped.map(i => i.name));
    }
    
    return deduped;
  } catch (error) {
    console.error('[DETECTION] Ensemble detection failed:', error);
    return [];
  }
}

async function callGptVisionDetection(imageFile: File): Promise<DetectedItem[]> {
  // Placeholder - would call GPT Vision API with schema
  // For now, return empty array to avoid breaking build
  return [];
}

async function callVisionDetection(imageFile: File): Promise<DetectedItem[]> {
  // Placeholder - would call existing vision detection
  // For now, return empty array to avoid breaking build
  return [];
}

function dedupe(items: DetectedItem[]): DetectedItem[] {
  const byKey = new Map<string, DetectedItem>();
  for (const item of items) {
    const key = canonicalize(item.name);
    const existing = byKey.get(key);
    if (!existing || item.confidence > existing.confidence) {
      byKey.set(key, { ...item, name: key });
    }
  }
  return [...byKey.values()];
}

export function fuseDetections(visionFoods: VisionFood[], gptNames: string[]): FusedFood[] {
  const SIMILARITY_THRESHOLD = 0.85; // Stricter similarity for better deduplication
  const fused: FusedFood[] = [];
  
  // Start with Vision foods (they have bboxes) - prioritize them
  for (const visionFood of visionFoods) {
    const canonical = canonicalize(visionFood.name);
    fused.push({
      canonicalName: canonical,
      sources: new Set(['vision']),
      bbox: visionFood.bbox,
      score: visionFood.score,
      origin: 'vision'
    });
  }
  
  let addedFromGpt = 0;
  
  // Process GPT names - merge with existing or add new
  for (const gptName of gptNames) {
    const gptCanonical = canonicalize(gptName);
    
    // Check if it matches any existing fused item
    let matched = false;
    for (const fusedItem of fused) {
      const similarity = similar(gptCanonical, fusedItem.canonicalName);
      
      if (similarity >= SIMILARITY_THRESHOLD) {
        // Merge sources - prefer Vision entry (keep bbox and score)
        fusedItem.sources.add('gpt');
        fusedItem.origin = 'both';
        matched = true;
        break;
      }
    }
    
    // If no match, add as GPT-only item
    if (!matched) {
      fused.push({
        canonicalName: gptCanonical,
        sources: new Set(['gpt']),
        origin: 'gpt'
      });
      addedFromGpt++;
    }
  }
  
  // Keep top 8 fused items, prioritizing those with bboxes and higher scores
  const sorted = fused.sort((a, b) => {
    // Prioritize items with bboxes (Vision detections)
    if (a.bbox && !b.bbox) return -1;
    if (!a.bbox && b.bbox) return 1;
    
    // Then by score
    return (b.score || 0) - (a.score || 0);
  });
  
  const topItems = sorted.slice(0, 8);
  
  // DEV logging
  if (import.meta.env?.DEV) {
    console.info('[ENSEMBLE] vision=' + visionFoods.length + ' gpt=' + gptNames.length + ' fused=' + topItems.length + ' added_from_gpt=' + addedFromGpt);
    console.info('[LYF][ensemble] fused:', topItems.map(item => item.canonicalName));
  }
  
  return topItems;
}