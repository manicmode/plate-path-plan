import { VisionFood } from './vision_v1';

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
  'smoked salmon': 'salmon', 
  'grilled salmon': 'salmon',
  'baked salmon': 'salmon',
  'salmon fillet': 'salmon',
  
  // Tomato variants  
  'cherry tomato': 'tomato',
  'cherry tomatoes': 'tomato',
  'grape tomato': 'tomato', 
  'grape tomatoes': 'tomato',
  'tomato slice': 'tomato',
  'tomato slices': 'tomato',
  
  // Lemon variants
  'lemon slice': 'lemon',
  'lemon slices': 'lemon',
  'lemon wedge': 'lemon',
  'lemon wedges': 'lemon',
  'lime wedge': 'lime',
  'lime wedges': 'lime',
  
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
  'spinach leaves': 'spinach',
  'asparagus spear': 'asparagus',
  'asparagus spears': 'asparagus'
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

// Jaro-Winkler similarity (simplified version)
export function similar(a: string, b: string): number {
  const aTokens = new Set(a.toLowerCase().split(' '));
  const bTokens = new Set(b.toLowerCase().split(' '));
  
  let intersection = 0;
  aTokens.forEach(token => {
    if (bTokens.has(token)) intersection++;
  });
  
  const union = aTokens.size + bTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function fuseDetections(visionFoods: VisionFood[], gptNames: string[]): FusedFood[] {
  const SIMILARITY_THRESHOLD = 0.6; // Adjusted for token-based similarity
  const fused: FusedFood[] = [];
  
  // Start with Vision foods (they have bboxes)
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
  
  // Process GPT names
  for (const gptName of gptNames) {
    const gptCanonical = canonicalize(gptName);
    
    // Check if it matches any existing fused item
    let matched = false;
    for (const fusedItem of fused) {
      if (similar(gptCanonical, fusedItem.canonicalName) >= SIMILARITY_THRESHOLD) {
        // Merge sources
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
  
  // DEV logging
  if (import.meta.env.DEV) {
    console.info('[ENSEMBLE]', {
      vision: visionFoods.length,
      gpt: gptNames.length,
      fused: fused.length,
      added_from_gpt: addedFromGpt
    });
  }
  
  return fused;
}