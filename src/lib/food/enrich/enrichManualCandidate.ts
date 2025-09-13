import { enrichCandidate } from '@/utils/enrichCandidate';

/**
 * Enriches a manual food candidate with full nutritional data, ingredients, and images
 * @param candidate - The manual search result to enrich
 * @param signal - AbortSignal for cancellation
 * @returns Enriched food item ready for confirmation
 */
export async function enrichManualCandidate(candidate: any, signal?: AbortSignal) {
  // Normalize to RecognizedItem base
  let item = { 
    ...candidate, 
    source: "manual", 
    enriched: false,
    // Ensure we have the minimum fields expected by enrichCandidate
    name: candidate.name,
    isGeneric: candidate.isGeneric ?? false,
    provider: candidate.provider || 'manual',
    providerRef: candidate.providerRef || null
  };

  try {
    // Check for cancellation
    if (signal?.aborted) {
      throw new Error('Enrichment aborted');
    }

    // Use the existing enrichment pipeline
    item = await enrichCandidate(item);
    
    // Check for cancellation after enrichment
    if (signal?.aborted) {
      throw new Error('Enrichment aborted');
    }

    // Mark as enriched
    item.enriched = true;
    
    console.log('[ENRICH][MANUAL][SUCCESS]', {
      name: item.name,
      hasIngredients: item.hasIngredients,
      enrichmentSource: item.enrichmentSource
    });
    
    return item;
  } catch (error) {
    console.warn('[ENRICH][MANUAL][ERROR]', error);
    
    // If aborted, rethrow
    if (signal?.aborted || error?.message?.includes('aborted')) {
      throw error;
    }
    
    // For other errors, return a basic skeleton
    return {
      ...item,
      enriched: false,
      hasIngredients: false,
      ingredientsList: [],
      ingredientsText: '',
      ingredientsUnavailable: true,
      enrichmentSource: 'manual'
    };
  }
}