/**
 * Advanced food candidate search with generic-first results
 * Implements core noun matching, alias expansion, and smart scoring
 */

import { supabase } from '@/integrations/supabase/client';
import { expandAliases, normalizeQuery } from '../text/food_aliases';
import { parseQuery, ParsedFacets } from '../text/parse';
import { searchFoodByName, CanonicalSearchResult } from '@/lib/foodSearch';

// --- BEGIN local helpers (generic detection + relevance) ---
const _norm = (s?: string) =>
  (s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

const STOP = new Set([
  'a','an','the','and','or','with','of','in','on','to',
  'style','classic','premium','original','fresh','organic',
  'grilled','baked','fried','roasted','boiled','steamed','sauteed','bbq','barbecue','smoked','raw','cooked'
]);

const coreNoun = (text?: string) => {
  const t = _norm(text).split(' ').filter(Boolean).filter(x => !STOP.has(x));
  return t.length ? t[t.length - 1] : _norm(text).split(' ').pop() || '';
};

const looksGeneric = (it: any): boolean => {
  // Prefer explicit signals first
  if (it?.isGeneric === true) return true;
  if (it?.kind === 'generic' || it?.provider === 'generic') return true;
  // Explicit brand signals → not generic
  if (it?.brands || it?.brand) return false;
  if (typeof it?.code === 'string' && it.code.length >= 8) return false; // EAN/UPC → brand
  // Canonical key implies generic
  if (typeof it?.canonicalKey === 'string' && it.canonicalKey.startsWith('generic_')) return true;
  // Otherwise unknown → treat as NOT generic to be safe
  return false;
};

const matchesQueryCore = (q: string, candidate: any): boolean => {
  const qCore = coreNoun(q);
  const nCore = coreNoun(candidate?.name);
  if (!qCore || !nCore) return false;
  // exact core match
  if (qCore === nCore) return true;
  // allow simple plural/singular mismatch
  if (qCore.endsWith('s') && qCore.slice(0,-1) === nCore) return true;
  if (nCore.endsWith('s') && nCore.slice(0,-1) === qCore) return true;
  // class/slug match (when present)
  if (candidate?.classId && typeof candidate.classId === 'string' && candidate.classId.includes(qCore)) return true;
  if (candidate?.canonicalKey && typeof candidate.canonicalKey === 'string' && candidate.canonicalKey.includes(qCore)) return true;
  return false;
};
// --- END local helpers ---

export interface Candidate {
  id: string;
  name: string;
  kind: 'generic' | 'brand' | 'unknown';
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
  disableBrandInterleave?: boolean;  // default false
  allowMoreBrands?: boolean;    // default false
  source?: string;             // for logging
}

// Core noun tokens for filtering
const CORE_NOUNS = [
  'pizza', 'roll', 'dog', 'bowl', 'rice', 'egg', 'chicken', 'burger', 
  'sandwich', 'salad', 'soup', 'sushi', 'taco', 'burrito', 'oatmeal', 
  'pasta', 'bread', 'fries', 'cookie'
];

function hasCoreTokNounMatch(query: string, candidateName: string): boolean {
  // Extract potential noun from query (last significant word)
  const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryTokens.length === 0) return true;
  
  const coreToken = queryTokens[queryTokens.length - 1];
  const candidateWords = candidateName.toLowerCase().split(/\s+/);
  
  const useCoreNounStrict = (import.meta.env.VITE_CORE_NOUN_STRICT ?? '1') === '1';
  
  if (useCoreNounStrict) {
    // Use word boundaries to avoid "roll" matching "rolled"
    const coreRegex = new RegExp(`\\b${coreToken}s?\\b|\\b${coreToken.slice(0, -1)}s?\\b`); // Handle singular/plural
    return candidateWords.some(word => coreRegex.test(word));
  } else {
    // Legacy substring matching
    return candidateWords.some(word => word.includes(coreToken));
  }
}

function classifyItemKind(item: any): 'generic' | 'brand' | 'unknown' {
  const useClassifierSafe = (import.meta.env.VITE_CANDIDATE_CLASSIFIER_SAFE ?? '1') === '1';
  
  if (useClassifierSafe) {
    // Brand evidence overrides everything
    const hasBrandEvidence = !!(item.brand || item.brands || (item.code && String(item.code).length >= 8));
    if (hasBrandEvidence) return 'brand';
    
    // Explicit generic indicators
    if (item.provider === 'generic' || item.isGeneric) return 'generic';
    
    // Default to unknown when ambiguous (no fallback to word count)
    return 'unknown';
  } else {
    // Legacy behavior
    if (item.provider === 'generic') return 'generic';
    if (item.kind === 'generic') return 'generic';
    
    // Simple heuristic: short names (3 words or fewer) are often generic
    const wordCount = (item.name || '').trim().split(/\s+/).length;
    
    return wordCount <= 3 ? 'generic' : 'brand';
  }
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
    disableBrandInterleave: false,
    allowMoreBrands: false,
    source,
    ...opts
  };

  console.log('[CANDIDATES][OPTIONS]', {
    source,
    maxPerFamily: options.maxPerFamily,
    disableBrandInterleave: options.disableBrandInterleave,
    allowMoreBrands: options.allowMoreBrands
  });
  
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
      
      // Instrumentation: VITE_MANUAL_ENTRY_DIAG=1 diagnostic logging
      if (import.meta.env.VITE_MANUAL_ENTRY_DIAG === '1') {
        console.log('[MANUAL_DIAG][CANDIDATE]', {
          q: normalizedQuery,
          name: result.name,
          kind,
          brand: (result as any).brand,
          brands: (result as any).brands,
          code: (result as any).code,
          canonicalKey: (result as any).canonicalKey,
          score: null // will be calculated next
        });
      }
      
      const { score, confidence, explanation } = scoreFoodCandidate(
        normalizedQuery, 
        result, 
        'lexical', 
        facets, 
        kind === 'unknown' ? 'brand' : (kind as 'generic' | 'brand'), // Treat unknown as brand for scoring
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
        kind === 'unknown' ? 'brand' : (kind as 'generic' | 'brand'), // Treat unknown as brand for scoring
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
    const brands = sortedCandidates.filter(c => c.kind === 'brand' || c.kind === 'unknown');
    
    // Only promote when the second item is truly generic AND relevant to the query core noun/class.
    if ((source === 'manual' || source === 'speech') && sortedCandidates.length >= 2) {
      const top = sortedCandidates[0];
      const second = sortedCandidates[1];
      const scoreDiff = (top.score || 0) - (second.score || 0);

      const topIsBrand = !!((top as any)?.brands || (top as any)?.brand || (typeof (top as any)?.code === 'string' && (top as any).code.length >= 8));
      
      // Tightened check: must be explicitly generic AND have no brand evidence
      const useClassifierSafe = (import.meta.env.VITE_CANDIDATE_CLASSIFIER_SAFE ?? '1') === '1';
      const secondIsGeneric = useClassifierSafe 
        ? ((second as any)?.provider === 'generic' || (second as any)?.isGeneric) && 
          !((second as any)?.brands || (second as any)?.brand || ((second as any)?.code && typeof (second as any).code === 'string' && (second as any).code.length >= 8))
        : looksGeneric(second);
        
      const secondMatchesQuery = matchesQueryCore(normalizedQuery, second);

      if (topIsBrand && secondIsGeneric && secondMatchesQuery && scoreDiff < 0.15) {
        console.log('[CANDIDATES][PROMOTE_GENERIC_SAFE]', {
          demoted: top?.name,
          promoted: second?.name,
          scoreDiff
        });
        [sortedCandidates[0], sortedCandidates[1]] = [sortedCandidates[1], sortedCandidates[0]];
      }
    }
    
    // Configurable brand interleaving
    let reordered;
    if (options.disableBrandInterleave) {
      reordered = sortedCandidates;
    } else {
      const brandLimit = options.allowMoreBrands ? 4 : 2;
      reordered = [
        ...sortedCandidates.filter(c => c.kind === 'generic'),
        ...sortedCandidates.filter(c => c.kind === 'brand').slice(0, brandLimit)
      ];
    }
    console.log('[CANDIDATES][INTERLEAVE]', {
      beforeReorder: sortedCandidates.length,
      afterReorder: reordered.length,
      disabled: options.disableBrandInterleave
    });
    sortedCandidates = reordered;
  }
  
  // Apply diversity filter (max per family)
  console.log('[CANDIDATES][DIVERSITY_FILTER][BEFORE]', {
    maxPerFamily: options.maxPerFamily,
    count: sortedCandidates.length,
  });

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

  console.log('[CANDIDATES][DIVERSITY_FILTER][AFTER]', {
    maxPerFamily: options.maxPerFamily,
    afterFilter: sortedCandidates.length,
  });
  
  // final cap to 8
  const finalCandidates = sortedCandidates.slice(0, 8);
  console.log('[CANDIDATES][CAP]', {
    capReason: 'final_8_limit',
    capCount: finalCandidates.length,
  });
  
  // Optional generic fallback for manual typing
  if (
    finalCandidates.length === 0 &&
    normalizedQuery.length >= 3 &&
    source === 'manual' &&
    import.meta.env.VITE_MANUAL_INJECT_GENERIC === '1'
  ) {
    finalCandidates.push({
      id: `generic-${normalizedQuery}`,
      name: `${normalizedQuery.charAt(0).toUpperCase() + normalizedQuery.slice(1)} (generic)`,
      kind: 'generic',
      classId: 'generic_food',
      score: 30,
      confidence: 0.3,
      explanation: 'Generic fallback for manual entry',
      source: 'lexical',
      servingGrams: 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    });
    console.log('[CANDIDATES][GENERIC_FALLBACK]', { query: normalizedQuery });
  }

  // Legacy generic injection policy: only inject when real results < 3, and put it last
  const shouldInjectGeneric = (import.meta.env.VITE_MANUAL_INJECT_GENERIC_LEGACY ?? '0') === '1';
  const isManual = source === 'manual';
  const realResultCount = finalCandidates.filter(c => c.kind !== 'generic').length;

  if (shouldInjectGeneric && isManual && realResultCount < 3) {
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
      // Put generic at the end, not beginning
      finalCandidates.push(genericCandidate);
      console.log(`[CANDIDATES][GENERIC_INJECT] reason=low-real count=${realResultCount}`, { 
        q: normalizedQuery, 
        name: genericCandidate.name 
      });
      
      // Keep only top 8 after injection
      finalCandidates.splice(8);
    }
  }
  
  // Add merge pipeline telemetry
  const cheapFirstCount = sortedCandidates.filter(c => c.source === 'lexical').length;
  const v3Count = 0; // V3 candidates handled elsewhere  
  const mergeUsed = cheapFirstCount >= 2 ? 'cheap-first' : finalCandidates.length === 0 ? 'none' : 'mixed';
  
  console.log('[CANDIDATES][MERGE]', {
    cheapFirst: sortedCandidates.filter(c => c.source === 'lexical').length,
    v3: 0,
    final: finalCandidates.length,
    used:
      sortedCandidates.filter(c => c.source === 'lexical').length >= 2
        ? 'cheap-first'
        : finalCandidates.length === 0
        ? 'none'
        : 'mixed',
  });
  
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