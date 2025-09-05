/**
 * Advanced food candidate search with multiple strategies
 * Combines lexical search, alias matching, and optional AI reranking
 */

import { supabase } from '@/integrations/supabase/client';
import { expandAliases } from '../text/food_aliases';
import { parseFacets, extractCoreFoodName, cleanQuery } from '../text/parse';
import { searchFoodByName, CanonicalSearchResult } from '@/lib/foodSearch';

export interface FoodCandidate {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  confidence: number;
  score: number;
  explanation: string;
  source: 'lexical' | 'alias' | 'embedding' | 'reranked';
  imageUrl?: string;
  servingGrams?: number;
  servingText?: string;
}

// Use CanonicalSearchResult from existing foodSearch
type SearchResult = CanonicalSearchResult & {
  // Add nutrition data that might be in cached results
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingGrams?: number;
  servingText?: string;
};

/**
 * Performs lexical search using existing food search infrastructure
 */
async function lexicalSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
  try {
    const results = await searchFoodByName(query, { 
      maxResults: limit, 
      bypassGuard: true 
    });
    
    // Convert CanonicalSearchResult to SearchResult format
    return results.map(result => ({
      ...result,
      calories: result.caloriesPer100g || 0,
      protein: 0, // Will need to be filled from cached data if available
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    }));
  } catch (error) {
    console.error('Lexical search error:', error);
    return [];
  }
}

/**
 * Searches using food aliases
 */
async function aliasSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
  const aliases = expandAliases(query);
  const results: SearchResult[] = [];
  
  for (const alias of aliases.slice(0, 3)) { // Limit alias searches to avoid too many calls
    if (alias === query.toLowerCase()) continue; // Skip original query
    
    try {
      const aliasResults = await searchFoodByName(alias, { 
        maxResults: Math.ceil(limit / 3), 
        bypassGuard: true 
      });
      
      // Convert and add to results
      const converted = aliasResults.map(result => ({
        ...result,
        calories: result.caloriesPer100g || 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      }));
      
      results.push(...converted);
    } catch (error) {
      console.error(`Alias search error for "${alias}":`, error);
    }
  }
  
  // Remove duplicates by ID
  const unique = results.filter((item, index, self) => 
    index === self.findIndex(t => t.id === item.id)
  );
  
  return unique.slice(0, limit);
}

/**
 * Calculates similarity score between query and food name
 */
function calculateSimilarity(query: string, foodName: string): number {
  const queryLower = query.toLowerCase();
  const nameLower = foodName.toLowerCase();
  
  // Exact match
  if (queryLower === nameLower) return 1.0;
  
  // Contains query
  if (nameLower.includes(queryLower)) return 0.8;
  
  // Query contains name
  if (queryLower.includes(nameLower)) return 0.7;
  
  // Word overlap
  const queryWords = queryLower.split(/\s+/);
  const nameWords = nameLower.split(/\s+/);
  const commonWords = queryWords.filter(word => 
    nameWords.some(nameWord => nameWord.includes(word) || word.includes(nameWord))
  );
  
  if (commonWords.length > 0) {
    return 0.4 + (commonWords.length / Math.max(queryWords.length, nameWords.length)) * 0.3;
  }
  
  return 0.1;
}

/**
 * Scores a food candidate based on multiple factors
 */
function scoreFoodCandidate(
  query: string, 
  food: SearchResult, 
  source: FoodCandidate['source'],
  facets: ReturnType<typeof parseFacets>
): { score: number; confidence: number; explanation: string } {
  let score = 0;
  let explanation = '';
  
  // Base similarity score (0-50 points)
  const similarity = calculateSimilarity(query, food.name);
  const similarityScore = similarity * 50;
  score += similarityScore;
  explanation += `Similarity: ${Math.round(similarityScore)}pts`;
  
  // Source bonus (0-20 points)
  const sourceBonus = {
    lexical: 20,
    alias: 15,
    embedding: 10,
    reranked: 25
  }[source];
  score += sourceBonus;
  explanation += `, Source(${source}): +${sourceBonus}pts`;
  
  // Facet matching bonus (0-20 points)
  let facetBonus = 0;
  const foodNameLower = food.name.toLowerCase();
  
  if (facets.prep) {
    const prepMatches = facets.prep.filter(prep => foodNameLower.includes(prep));
    facetBonus += prepMatches.length * 5;
    if (prepMatches.length > 0) {
      explanation += `, Prep match: +${prepMatches.length * 5}pts`;
    }
  }
  
  if (facets.protein) {
    const proteinMatches = facets.protein.filter(protein => foodNameLower.includes(protein));
    facetBonus += proteinMatches.length * 3;
    if (proteinMatches.length > 0) {
      explanation += `, Protein match: +${proteinMatches.length * 3}pts`;
    }
  }
  
  if (facets.cuisine) {
    const cuisineMatches = facets.cuisine.filter(cuisine => foodNameLower.includes(cuisine));
    facetBonus += cuisineMatches.length * 3;
    if (cuisineMatches.length > 0) {
      explanation += `, Cuisine match: +${cuisineMatches.length * 3}pts`;
    }
  }
  
  score += Math.min(facetBonus, 20); // Cap facet bonus at 20 points
  
  // Nutritional completeness bonus (0-10 points)
  const hasNutrition = [
    food.calories || food.caloriesPer100g,
    food.protein,
    food.carbs,
    food.fat
  ].filter(Boolean).length;
  
  const nutritionBonus = (hasNutrition / 4) * 10;
  score += nutritionBonus;
  explanation += `, Nutrition: +${Math.round(nutritionBonus)}pts`;
  
  // Convert to 0-1 confidence scale
  const confidence = Math.min(score / 100, 1.0);
  
  return { score, confidence, explanation };
}

/**
 * AI reranking using edge function (if enabled)
 */
async function rerank(query: string, candidates: FoodCandidate[]): Promise<FoodCandidate[]> {
  const aiRerankEnabled = import.meta.env.VITE_AI_RERANK === 'true';
  
  if (!aiRerankEnabled || candidates.length === 0) {
    return candidates;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('food-search-rerank', {
      body: {
        query,
        candidates: candidates.slice(0, 10).map(c => ({
          id: c.id,
          name: c.name,
          score: c.score
        }))
      }
    });
    
    if (error) throw error;
    
    if (data?.rankedIds) {
      const rankedCandidates = data.rankedIds
        .map((id: string) => candidates.find(c => c.id === id))
        .filter(Boolean)
        .slice(0, 3)
        .map((candidate: FoodCandidate) => ({
          ...candidate,
          source: 'reranked' as const,
          explanation: `AI Reranked: ${candidate.explanation}`
        }));
      
      return rankedCandidates;
    }
  } catch (error) {
    console.error('AI reranking failed:', error);
  }
  
  return candidates;
}

/**
 * Main function to get food candidates using multiple search strategies
 */
export async function getFoodCandidates(
  query: string, 
  maxResults: number = 6
): Promise<FoodCandidate[]> {
  console.log('[FOOD_SEARCH] Starting search for:', query);
  
  const facets = parseFacets(query);
  const candidates = new Map<string, FoodCandidate>();
  
  // Strategy 1: Lexical search
  try {
    const lexicalResults = await lexicalSearch(query, 10);
    console.log('[FOOD_SEARCH] Lexical results:', lexicalResults.length);
    
    for (const result of lexicalResults) {
      const { score, confidence, explanation } = scoreFoodCandidate(query, result, 'lexical', facets);
      
      candidates.set(result.id, {
        id: result.id,
        name: result.name,
        calories: result.calories || 0,
        protein: result.protein || 0,
        carbs: result.carbs || 0,
        fat: result.fat || 0,
        fiber: result.fiber || 0,
        sugar: result.sugar || 0,
        sodium: result.sodium || 0,
        confidence,
        score,
        explanation,
        source: 'lexical',
        imageUrl: result.imageUrl,
        servingGrams: result.servingGrams,
        servingText: result.servingText
      });
    }
  } catch (error) {
    console.error('[FOOD_SEARCH] Lexical search failed:', error);
  }
  
  // Strategy 2: Alias search
  try {
    const aliasResults = await aliasSearch(query, 10);
    console.log('[FOOD_SEARCH] Alias results:', aliasResults.length);
    
    for (const result of aliasResults) {
      const existing = candidates.get(result.id);
      const { score, confidence, explanation } = scoreFoodCandidate(query, result, 'alias', facets);
      
      // Only add if not exists or has better score
      if (!existing || score > existing.score) {
        candidates.set(result.id, {
          id: result.id,
          name: result.name,
          calories: result.calories || 0,
          protein: result.protein || 0,
          carbs: result.carbs || 0,
          fat: result.fat || 0,
          fiber: result.fiber || 0,
          sugar: result.sugar || 0,
          sodium: result.sodium || 0,
          confidence,
          score,
          explanation,
          source: 'alias',
          imageUrl: result.imageUrl,
          servingGrams: result.servingGrams,
          servingText: result.servingText
        });
      }
    }
  } catch (error) {
    console.error('[FOOD_SEARCH] Alias search failed:', error);
  }
  
  // Convert to array and sort by score
  let sortedCandidates = Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
  
  console.log('[FOOD_SEARCH] Candidates before rerank:', sortedCandidates.length);
  
  // Strategy 3: AI reranking (if enabled)
  sortedCandidates = await rerank(query, sortedCandidates);
  
  console.log('[FOOD_SEARCH] Final candidates:', {
    count: sortedCandidates.length,
    top3: sortedCandidates.slice(0, 3).map(c => ({
      name: c.name,
      confidence: c.confidence,
      source: c.source
    }))
  });
  
  return sortedCandidates;
}

/**
 * Determines if candidate picker should be shown based on confidence thresholds
 */
export function shouldShowCandidatePicker(candidates: FoodCandidate[]): boolean {
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