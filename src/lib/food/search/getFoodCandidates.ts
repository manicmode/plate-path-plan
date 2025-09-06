/**
 * Advanced food candidate search with generic-first results
 * Implements core noun matching, alias expansion, and smart scoring
 */

import { supabase } from '@/integrations/supabase/client';
import { expandAliases, normalizeQuery } from '../text/food_aliases';
import { parseQuery, ParsedFacets } from '../text/parse';
import { searchFoodByName, CanonicalSearchResult } from '@/lib/foodSearch';

export interface Candidate {
  id: string;
  name: string;
  kind: 'generic' | 'brand';
  classId?: string;        // used for portion defaults
  facets?: Record<string, string[]>;
  score: number;
  confidence: number;
  explanation: string;
  source: 'lexical' | 'alias' | 'embedding' | 'reranked';
  imageUrl?: string;
  servingGrams?: number;
  servingText?: string;
  // Nutrition data
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface CandidateOpts {
  preferGeneric?: boolean;      // default true
  requireCoreToken?: boolean;   // default true
  maxPerFamily?: number;        // default 1
}

// Core noun tokens for filtering
const CORE_NOUNS = [
  'pizza', 'roll', 'dog', 'bowl', 'rice', 'egg', 'chicken', 'burger', 
  'sandwich', 'salad', 'soup', 'sushi', 'taco', 'burrito', 'oatmeal', 
  'pasta', 'bread', 'fries', 'cookie'
];

/**
 * Checks if a food name contains core noun tokens
 */
function hasCoreTokNounMatch(query: string, foodName: string): boolean {
  const queryLower = query.toLowerCase();
  const nameLower = foodName.toLowerCase();
  
  // Check for core nouns in both query and food name
  for (const noun of CORE_NOUNS) {
    if (queryLower.includes(noun) && nameLower.includes(noun)) {
      return true;
    }
  }
  
  // Check for exact word matches
  const queryWords = queryLower.split(/\s+/);
  const nameWords = nameLower.split(/\s+/);
  
  for (const qWord of queryWords) {
    if (qWord.length > 3) { // Only meaningful words
      for (const nWord of nameWords) {
        if (qWord === nWord || qWord.includes(nWord) || nWord.includes(qWord)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Determines if item is generic vs brand
 */
function classifyItemKind(item: CanonicalSearchResult): 'generic' | 'brand' {
  const name = item.name.toLowerCase();
  
  // Brand indicators
  const brandIndicators = [
    'brand', 'co.', 'inc.', 'ltd.', 'corp.', '®', '™',
    'kraft', 'nestle', 'kellogg', 'general mills', 'pepsi',
    'coca cola', 'mcdonalds', 'burger king', 'subway'
  ];
  
  for (const indicator of brandIndicators) {
    if (name.includes(indicator.toLowerCase())) {
      return 'brand';
    }
  }
  
  // Generic indicators  
  const genericIndicators = [
    'generic', 'cooked', 'raw', 'fresh', 'steamed', 'grilled', 
    'baked', 'fried', 'homemade', 'prepared'
  ];
  
  for (const indicator of genericIndicators) {
    if (name.includes(indicator.toLowerCase())) {
      return 'generic';
    }
  }
  
  // Default to generic for simple names
  const wordCount = name.split(/\s+/).length;
  return wordCount <= 3 ? 'generic' : 'brand';
}

/**
 * Maps class ID for portion defaults
 */
function inferClassId(name: string, facets: ParsedFacets): string | undefined {
  const nameLower = name.toLowerCase();
  
  // Direct mappings
  if (nameLower.includes('hot dog') || nameLower.includes('hotdog')) return 'hot_dog_link';
  if (nameLower.includes('pizza') && nameLower.includes('slice')) return 'pizza_slice';
  if (nameLower.includes('pizza')) return 'pizza_slice';
  if (nameLower.includes('teriyaki') && nameLower.includes('bowl')) return 'teriyaki_bowl';
  if (nameLower.includes('california') && nameLower.includes('roll')) return 'california_roll';
  if (nameLower.includes('rice')) return 'rice_cooked';
  if (nameLower.includes('egg')) return 'egg_large';
  if (nameLower.includes('oatmeal') || nameLower.includes('oats')) return 'oatmeal_cooked';
  if (nameLower.includes('chicken') && !nameLower.includes('soup')) return 'chicken_breast';
  
  // Use facets
  if (facets.core.includes('pizza')) return 'pizza_slice';
  if (facets.core.includes('bowl')) return 'teriyaki_bowl';
  if (facets.core.includes('roll')) return 'california_roll';
  if (facets.core.includes('rice')) return 'rice_cooked';
  if (facets.core.includes('egg')) return 'egg_large';
  
  return undefined;
}

/**
 * Calculates similarity score using multiple methods
 */
function calculateSimilarity(query: string, foodName: string): number {
  const queryLower = query.toLowerCase();
  const nameLower = foodName.toLowerCase();
  
  // Exact match
  if (queryLower === nameLower) return 1.0;
  
  // Contains query (high score)
  if (nameLower.includes(queryLower)) return 0.85;
  
  // Query contains name
  if (queryLower.includes(nameLower)) return 0.75;
  
  // Jaccard similarity on words
  const queryWords = new Set(queryLower.split(/\s+/));
  const nameWords = new Set(nameLower.split(/\s+/));
  const intersection = new Set([...queryWords].filter(x => nameWords.has(x)));
  const union = new Set([...queryWords, ...nameWords]);
  const jaccard = intersection.size / union.size;
  
  if (jaccard > 0.5) return 0.6 + jaccard * 0.2;
  
  // Trigram similarity for partial matches
  const trigrams = (text: string) => {
    const result = [];
    for (let i = 0; i <= text.length - 3; i++) {
      result.push(text.slice(i, i + 3));
    }
    return new Set(result);
  };
  
  const queryTrigrams = trigrams(queryLower);
  const nameTrigrams = trigrams(nameLower);
  const trigramIntersection = new Set([...queryTrigrams].filter(x => nameTrigrams.has(x)));
  const trigramUnion = new Set([...queryTrigrams, ...nameTrigrams]);
  const trigramSim = trigramIntersection.size / trigramUnion.size;
  
  return Math.max(0.1, trigramSim * 0.6);
}

/**
 * Scores a food candidate using the specified formula
 */
function scoreFoodCandidate(
  query: string,
  item: CanonicalSearchResult,
  source: Candidate['source'],
  facets: ParsedFacets,
  kind: 'generic' | 'brand',
  searchSource?: string
): { score: number; confidence: number; explanation: string } {
  let score = 0;
  const explanationParts: string[] = [];
  
  // Base similarity (0-55 points)
  const similarity = calculateSimilarity(query, item.name);
  const lexicalScore = similarity * 55;
  score += lexicalScore;
  explanationParts.push(`Lexical: ${Math.round(lexicalScore)}pts`);
  
  // Semantic similarity (0-35 points) - placeholder for embedding
  const semanticScore = similarity * 35; // Using lexical as proxy
  score += semanticScore;
  explanationParts.push(`Semantic: ${Math.round(semanticScore)}pts`);
  
  // Prep/cuisine/form boosts (0-10 points)
  let facetBonus = 0;
  const nameLower = item.name.toLowerCase();
  
  if (facets.prep.length > 0) {
    const prepMatches = facets.prep.filter(prep => nameLower.includes(prep));
    facetBonus += prepMatches.length * 2;
  }
  
  if (facets.cuisine.length > 0) {
    const cuisineMatches = facets.cuisine.filter(cuisine => nameLower.includes(cuisine));
    facetBonus += cuisineMatches.length * 2;
  }
  
  if (facets.form.length > 0) {
    const formMatches = facets.form.filter(form => nameLower.includes(form));
    facetBonus += formMatches.length * 1;
  }
  
  facetBonus = Math.min(facetBonus, 10);
  score += facetBonus;
  if (facetBonus > 0) {
    explanationParts.push(`Facets: +${facetBonus}pts`);
  }
  
  // Brand penalty (0-20 points deduction)
  const brandPenalty = kind === 'brand' && !query.toLowerCase().includes('brand') ? 20 : 0;
  score -= brandPenalty;
  if (brandPenalty > 0) {
    explanationParts.push(`Brand penalty: -${brandPenalty}pts`);
  }
  
  // Manual-only brand penalty (additional 0.10 deduction)
  if (searchSource === 'manual') {
    const hasBrand = item.brand && item.brand.trim().length > 0;
    const hasBarcode = item.barcode && item.barcode.length >= 8;
    
    if (hasBrand || hasBarcode) {
      const manualBrandPenalty = 10; // 0.10 * 100 = 10 points
      score -= manualBrandPenalty;
      explanationParts.push(`Manual brand penalty: -${manualBrandPenalty}pts`);
    }
  }
  
  // Alias exact match bonus (0-10 points)
  const aliasBonus = source === 'alias' ? 10 : 0;
  score += aliasBonus;
  if (aliasBonus > 0) {
    explanationParts.push(`Alias: +${aliasBonus}pts`);
  }
  
  // Convert to confidence (0-1 scale)
  const confidence = Math.min(score / 100, 1.0);
  
  return {
    score,
    confidence,
    explanation: explanationParts.join(', ')
  };
}

/**
 * Performs lexical search using existing food search infrastructure
 */
async function lexicalSearch(query: string, limit: number = 15): Promise<CanonicalSearchResult[]> {
  try {
    const results = await searchFoodByName(query, { 
      maxResults: limit, 
      bypassGuard: true 
    });
    
    console.log(`[LEXICAL] Found ${results.length} results for "${query}"`);
    return results;
  } catch (error) {
    console.error('[LEXICAL] Search error:', error);
    return [];
  }
}

/**
 * Searches using food aliases
 */
async function aliasSearch(query: string, limit: number = 10): Promise<CanonicalSearchResult[]> {
  const aliases = expandAliases(query);
  const results: CanonicalSearchResult[] = [];
  
  console.log(`[ALIAS] Expanded "${query}" to ${aliases.length} terms:`, aliases.slice(0, 5));
  
  for (const alias of aliases.slice(0, 3)) { // Limit to top 3 aliases
    if (alias === query.toLowerCase()) continue; // Skip original
    
    try {
      const aliasResults = await searchFoodByName(alias, { 
        maxResults: Math.ceil(limit / 3), 
        bypassGuard: true 
      });
      
      results.push(...aliasResults);
    } catch (error) {
      console.error(`[ALIAS] Search error for "${alias}":`, error);
    }
  }
  
  // Remove duplicates by ID
  const unique = results.filter((item, index, self) => 
    index === self.findIndex(t => t.id === item.id)
  );
  
  console.log(`[ALIAS] Found ${unique.length} unique results`);
  return unique.slice(0, limit);
}

/**
 * Main function to get food candidates using multiple search strategies
 */
export async function getFoodCandidates(
  rawQuery: string,
  facets: ParsedFacets,
  opts?: CandidateOpts,
  source?: string
): Promise<Candidate[]> {
  const options = {
    preferGeneric: true,
    requireCoreToken: true,
    maxPerFamily: 1,
    ...opts
  };
  
  const normalizedQuery = normalizeQuery(rawQuery);
  console.log(`[CANDIDATES] Starting search for "${rawQuery}" -> "${normalizedQuery}"`);
  console.log('[CANDIDATES] Facets:', facets);
  
  const candidates = new Map<string, Candidate>();
  
  // Strategy 1: Lexical search
  try {
    const lexicalResults = await lexicalSearch(normalizedQuery, 15);
    console.log(`[CANDIDATES] Lexical: ${lexicalResults.length} results`);
    
    for (const result of lexicalResults) {
      // Apply core token filter if required
      if (options.requireCoreToken && !hasCoreTokNounMatch(normalizedQuery, result.name)) {
        continue;
      }
      
      const kind = classifyItemKind(result);
      const { score, confidence, explanation } = scoreFoodCandidate(
        normalizedQuery, 
        result, 
        'lexical', 
        facets, 
        kind,
        source
      );
      
      candidates.set(result.id, {
        id: result.id,
        name: result.name,
        kind,
        classId: inferClassId(result.name, facets),
        score,
        confidence,
        explanation,
        source: 'lexical',
        imageUrl: result.imageUrl,
        servingGrams: (result as any).servingGrams || 100,
        calories: result.caloriesPer100g || 0,
        protein: 0, // Will be populated from nutrition data
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      });
    }
  } catch (error) {
    console.error('[CANDIDATES] Lexical search failed:', error);
  }
  
  // Strategy 2: Alias search
  try {
    const aliasResults = await aliasSearch(normalizedQuery, 10);
    console.log(`[CANDIDATES] Alias: ${aliasResults.length} results`);
    
    for (const result of aliasResults) {
      // Apply core token filter if required
      if (options.requireCoreToken && !hasCoreTokNounMatch(normalizedQuery, result.name)) {
        continue;
      }
      
      const existing = candidates.get(result.id);
      const kind = classifyItemKind(result);
      const { score, confidence, explanation } = scoreFoodCandidate(
        normalizedQuery, 
        result, 
        'alias', 
        facets, 
        kind,
        source
      );
      
      // Only add if not exists or has better score
      if (!existing || score > existing.score) {
        candidates.set(result.id, {
          id: result.id,
          name: result.name,
          kind,
          classId: inferClassId(result.name, facets),
          score,
          confidence,
          explanation,
          source: 'alias',
          imageUrl: result.imageUrl,
          servingGrams: (result as any).servingGrams || 100,
          calories: result.caloriesPer100g || 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        });
      }
    }
  } catch (error) {
    console.error('[CANDIDATES] Alias search failed:', error);
  }
  
  // Convert to array and sort by score
  let sortedCandidates = Array.from(candidates.values())
    .sort((a, b) => b.score - a.score);
  
  // Apply generic preference and interleaving
  if (options.preferGeneric) {
    const generics = sortedCandidates.filter(c => c.kind === 'generic');
    const brands = sortedCandidates.filter(c => c.kind === 'brand');
    
    // Promote generic if top result is brand but #2 is generic with near score
    if (brands.length > 0 && generics.length > 0) {
      const topBrand = brands[0];
      const topGeneric = generics[0];
      
      // Check if top candidate is brand without nutrients and second is generic with nutrients
      if (sortedCandidates[0].kind === 'brand' && 
          sortedCandidates.length > 1 &&
          sortedCandidates[1].kind === 'generic' &&
          (topBrand.score - topGeneric.score) < 0.15) {
        
        // Log the promotion
        console.log('[CANDIDATES][PROMOTE_GENERIC]', {
          originalTop: { name: topBrand.name, score: topBrand.score, kind: 'brand' },
          promoted: { name: topGeneric.name, score: topGeneric.score, kind: 'generic' },
          scoreDiff: topBrand.score - topGeneric.score
        });
        
        // Reorder to promote the generic
        sortedCandidates = [topGeneric, ...sortedCandidates.filter(c => c.id !== topGeneric.id)];
      }
    }
    
    // Interleave: generics first, then max 2 brands
    const reordered = [
      ...sortedCandidates.filter(c => c.kind === 'generic'),
      ...sortedCandidates.filter(c => c.kind === 'brand').slice(0, 2)
    ];
    
    sortedCandidates = reordered;
  }
  
  // Apply diversity filter (max per family)
  if (options.maxPerFamily && options.maxPerFamily > 0) {
    const familyCounts = new Map<string, number>();
    sortedCandidates = sortedCandidates.filter(candidate => {
      const family = candidate.classId || 'unknown';
      const count = familyCounts.get(family) || 0;
      
      if (count < (options.maxPerFamily || 1)) {
        familyCounts.set(family, count + 1);
        return true;
      }
      return false;
    });
  }
  
  const finalCandidates = sortedCandidates.slice(0, 6);
  
  // Manual-only guaranteed generic candidate injection
  const isManual = source === 'manual';
  const hasGenericTop = finalCandidates[0] && 
    finalCandidates[0].kind === 'generic' &&
    !(finalCandidates[0] as any).brand &&
    !(finalCandidates[0] as any).barcode;

  if (isManual && !hasGenericTop && finalCandidates.length > 0) {
    // Try to infer class/canonical using existing logic
    const inferredClassId = finalCandidates[0]?.classId || null;
    const inferredCanonical = null; // No canonical key logic in current implementation
    
    // Build a safe generic label
    const queryLower = normalizedQuery.toLowerCase();
    let genericName = 'Generic food';
    
    if (queryLower.includes('grill')) {
      genericName = 'Grilled chicken';
    } else if (inferredClassId) {
      genericName = inferredClassId.replace(/_/g, ' ');
      // Capitalize first letter of each word
      genericName = genericName.replace(/\b\w/g, l => l.toUpperCase());
    } else {
      // Try to extract a reasonable generic name from the query
      const cleanQuery = normalizedQuery.replace(/\b(the|a|an|with|and|or)\b/gi, '').trim();
      if (cleanQuery) {
        genericName = `Generic ${cleanQuery}`;
      }
    }
    
    const topScore = finalCandidates[0]?.score ?? 70;
    const genericScore = Math.min(96, topScore + 5);
    
    const genericCandidate: Candidate = {
      id: `generic-${Date.now()}`,
      name: genericName,
      kind: 'generic',
      classId: inferredClassId || undefined,
      score: genericScore,
      confidence: genericScore / 100,
      explanation: 'Generic candidate injection for manual entry',
      source: 'lexical',
      servingGrams: 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    };
    
    // Only inject if it isn't already present by name
    const duplicate = finalCandidates.some(c => 
      c.name.toLowerCase() === genericCandidate.name.toLowerCase()
    );
    
    if (!duplicate) {
      finalCandidates.unshift(genericCandidate);
      console.log('[CANDIDATES][GENERIC_INJECT]', { 
        q: normalizedQuery, 
        name: genericCandidate.name 
      });
      
      // Keep only top 6 after injection
      finalCandidates.splice(6);
    }
  }
  
  console.log('[CANDIDATES] Final results:', {
    count: finalCandidates.length,
    top3: finalCandidates.slice(0, 3).map(c => ({
      name: c.name,
      kind: c.kind,
      classId: c.classId,
      confidence: Math.round(c.confidence * 100) / 100,
      source: c.source
    }))
  });
  
  // Debug logging if enabled
  const debugEnabled = import.meta.env.VITE_FOOD_TEXT_DEBUG === '1';
  if (debugEnabled) {
    console.log('[TEXT][QUERY]', normalizedQuery);
    console.log('[TEXT][FACETS]', facets);
    finalCandidates.forEach((c, i) => {
      console.log(`[TEXT][CANDIDATE_${i}]`, {
        name: c.name,
        kind: c.kind,
        classId: c.classId,
        score: Math.round(c.score),
        confidence: Math.round(c.confidence * 100) / 100,
        explanation: c.explanation
      });
    });
  }
  
  return finalCandidates;
}

/**
 * Determines if candidate picker should be shown based on confidence thresholds
 */
export function shouldShowCandidatePicker(candidates: Candidate[]): boolean {
  if (candidates.length === 0) return false;
  
  const topCandidate = candidates[0];
  const secondCandidate = candidates[1];
  
  // Always show if top confidence is low
  if (topCandidate.confidence < 0.80) return true;
  
  // Show if gap between top two is small
  if (secondCandidate && (topCandidate.confidence - secondCandidate.confidence) < 0.15) {
    return true;
  }
  
  return false;
}

// Legacy compatibility
export type FoodCandidate = Candidate;