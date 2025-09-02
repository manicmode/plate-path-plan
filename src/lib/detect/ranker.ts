/**
 * Detection Ranker - Protein boost and scoring
 * Ensures proteins don't get outvoted by garnish/condiments
 */

interface RankableItem {
  name: string;
  confidence: number;
  category?: string;
  score?: number;
  portion_hint?: string | null;
}

// Protein foods that get priority boost
const PROTEIN_FOODS = new Set(['salmon', 'chicken', 'beef', 'pork', 'tofu', 'egg', 'fish']);

// Apply protein boost to scoring
export function applyProteinBoost(items: RankableItem[]): RankableItem[] {
  const boostedItems = items.map(item => {
    let score = item.confidence || 0.5;
    
    // +0.15 boost for proteins
    if (PROTEIN_FOODS.has(item.name.toLowerCase()) || item.category === 'protein') {
      score += 0.15;
      console.info('[RANKER][protein_boost]', `name=${item.name}`, `new_score=${score.toFixed(2)}`);
    }
    
    return {
      ...item,
      score
    };
  });
  
  return boostedItems;
}

// Ensure high-scoring proteins survive top-k selection
export function ensureProteinSurvival(items: RankableItem[], topK: number = 5): RankableItem[] {
  const rankedItems = [...items].sort((a, b) => (b.score || b.confidence) - (a.score || a.confidence));
  
  // Find proteins with score >= 0.6
  const highScoreProteins = rankedItems.filter(item => 
    (item.score || item.confidence) >= 0.6 && 
    (PROTEIN_FOODS.has(item.name.toLowerCase()) || item.category === 'protein')
  );
  
  if (highScoreProteins.length === 0) {
    // No high-scoring proteins, just return top-k
    return rankedItems.slice(0, topK);
  }
  
  // Ensure all high-scoring proteins are in the result
  const result = new Set(highScoreProteins);
  
  // Fill remaining slots with top non-protein items
  for (const item of rankedItems) {
    if (result.size >= topK) break;
    result.add(item);
  }
  
  const finalItems = Array.from(result);
  
  if (highScoreProteins.length > 0) {
    console.info('[RANKER][protein_survival]', 
      `ensured=${highScoreProteins.map(p => p.name).join(',')}`, 
      `total=${finalItems.length}`
    );
  }
  
  return finalItems;
}