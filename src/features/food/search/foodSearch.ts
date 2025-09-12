/**
 * Food search with typing vs submit mode gating
 * Vault-only while typing, edge calls only on Enter
 */

import { getFoodCandidates } from '@/lib/food/search/getFoodCandidates';
import { parseQuery } from '@/lib/food/text/parse';
import { searchFoodByName } from '@/lib/foodSearch';

export type FoodSearchMode = 'type' | 'submit';

export interface FoodSearchOptions {
  source: 'manual' | 'photo' | 'barcode';
  mode?: FoodSearchMode;
  signal?: AbortSignal;
}

export interface Candidate {
  id: string;
  name: string;
  isGeneric: boolean;
  portionHint?: string;
  defaultPortion?: { amount: number; unit: string };
  provider?: string;
  imageUrl?: string;
  data?: any;
  providerRef?: string;
  canonicalKey?: string;
  brand?: string | null;
  classId?: string | null;
  flags?: { generic?: boolean; brand?: boolean; restaurant?: boolean };
  kind?: string;
  score?: number;
  confidence?: number;
}

/**
 * Main food search function with typing vs submit mode control
 */
export async function foodSearch(q: string, opts: FoodSearchOptions): Promise<Candidate[]> {
  const mode = opts.mode ?? 'type';
  const isManual = opts.source === 'manual';
  const allowEdge = !isManual ? true : (mode === 'submit'); // typing -> no edge

  console.log(`[FOOD_SEARCH] query="${q}" source=${opts.source} mode=${mode} allowEdge=${allowEdge}`);

  // Always get vault/local candidates first (cheap lookup)
  const vaultCandidates = await cheapTextLookup(q);

  let edgeResults: Candidate[] = [];
  if (allowEdge) {
    try {
      edgeResults = await callEdgeWithTimeout(q, 900, opts.signal);
    } catch (error) {
      console.log('[FOOD_SEARCH][EDGE_ERROR]', error);
      edgeResults = [];
    }
  }

  // Merge results: prefer edge when available, fallback to vault
  const final = edgeResults?.length ? merge(edgeResults, vaultCandidates) : vaultCandidates;
  
  console.log(`[FOOD_SEARCH][RESULT] vault=${vaultCandidates.length} edge=${edgeResults.length} final=${final.length}`);
  
  return final;
}

/**
 * Fast local/vault lookup using existing food candidates system
 */
async function cheapTextLookup(query: string): Promise<Candidate[]> {
  if (!query.trim()) return [];

  try {
    // Parse query for facets
    const facets = parseQuery(query);
    
    // Get candidates using existing system with local-only preference
    const candidates = await getFoodCandidates(query, facets, {
      preferGeneric: true,
      requireCoreToken: false, // More permissive for typing
      maxPerFamily: 3,
      disableBrandInterleave: false,
      allowMoreBrands: true,
      allowPrefix: true,
      minPrefixLen: 2
    }, 'manual');

    // Map to our Candidate format
    return candidates.slice(0, 8).map((item, index) => ({
      id: `vault-${index}`,
      name: item.name,
      isGeneric: item.kind === 'generic' || !!item.canonicalKey?.startsWith('generic_'),
      portionHint: item.servingText || `${item.servingGrams || 100}g`,
      defaultPortion: { 
        amount: item.servingGrams || 100, 
        unit: 'g' 
      },
      provider: item.provider || item.kind || 'vault',
      imageUrl: item.imageUrl,
      providerRef: item.providerRef,
      canonicalKey: item.canonicalKey,
      brand: item.brand,
      classId: item.classId,
      flags: {
        generic: item.kind === 'generic',
        brand: !!(item.brand || item.providerRef),
        restaurant: false
      },
      kind: item.kind,
      score: item.score,
      confidence: item.confidence,
      data: {
        name: item.name,
        calories: Math.round((item.calories || 0) * (item.servingGrams || 100) / 100),
        protein_g: Math.round(((item.protein || 0) * (item.servingGrams || 100) / 100) * 10) / 10,
        carbs_g: Math.round(((item.carbs || 0) * (item.servingGrams || 100) / 100) * 10) / 10,
        fat_g: Math.round(((item.fat || 0) * (item.servingGrams || 100) / 100) * 10) / 10,
        fiber_g: Math.round(((item.fiber || 2) * (item.servingGrams || 100) / 100) * 10) / 10,
        sugar_g: Math.round(((item.sugar || 3) * (item.servingGrams || 100) / 100) * 10) / 10,
        servingGrams: item.servingGrams || 100,
        imageUrl: item.imageUrl,
        source: 'vault'
      }
    }));
  } catch (error) {
    console.error('[CHEAP_TEXT_LOOKUP][ERROR]', error);
    return [];
  }
}

/**
 * Call edge function with timeout for submit mode
 */
async function callEdgeWithTimeout(query: string, timeoutMs: number, signal?: AbortSignal): Promise<Candidate[]> {
  const controller = new AbortController();
  const combinedSignal = signal || controller.signal;
  
  // Set up timeout
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // Use existing searchFoodByName which calls the edge function
    const results = await searchFoodByName(query, {
      signal: combinedSignal,
      timeoutMs,
      maxResults: 8,
      bypassGuard: true // Allow edge calls in submit mode
    });

    clearTimeout(timeout);

    // Map to our Candidate format
    return results.map((item, index) => ({
      id: `edge-${index}`,
      name: item.name,
      isGeneric: item.source === 'local' || !item.brand,
      portionHint: item.servingHint || '100g',
      defaultPortion: { 
        amount: 100, 
        unit: 'g' 
      },
      provider: item.source,
      imageUrl: item.imageUrl,
      providerRef: item.barcode || item.id,
      brand: item.brand,
      flags: {
        generic: !item.brand && item.source === 'local',
        brand: !!item.brand,
        restaurant: false
      },
      confidence: item.confidence,
      data: {
        name: item.name,
        calories: item.caloriesPer100g || 0,
        protein_g: 0, // Edge results don't have detailed nutrition
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 2,
        sugar_g: 3,
        servingGrams: 100,
        imageUrl: item.imageUrl,
        source: 'edge'
      }
    }));
  } catch (error) {
    clearTimeout(timeout);
    if (error?.name === 'AbortError') {
      console.log('[EDGE][TIMEOUT]', { query, timeoutMs });
    }
    throw error;
  }
}

/**
 * Merge edge and vault results, preferring edge but keeping vault as fallback
 */
function merge(edgeResults: Candidate[], vaultResults: Candidate[]): Candidate[] {
  // If we have edge results, prefer them but add some vault results for variety
  if (edgeResults.length > 0) {
    const combined = [...edgeResults];
    
    // Add a few vault results that don't duplicate edge results
    const edgeNames = new Set(edgeResults.map(r => r.name.toLowerCase().trim()));
    const uniqueVault = vaultResults.filter(v => 
      !edgeNames.has(v.name.toLowerCase().trim())
    );
    
    combined.push(...uniqueVault.slice(0, 3));
    return combined.slice(0, 8);
  }
  
  // Fallback to vault results
  return vaultResults;
}