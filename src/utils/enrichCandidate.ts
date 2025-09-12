import { fetchCanonicalNutrition } from '@/lib/food/fetchCanonicalNutrition';
import { normalizeIngredients } from '@/utils/normalizeIngredients';

export async function enrichCandidate(candidate: any) {
  console.log('[ENRICH][START]', { 
    isGeneric: candidate?.isGeneric, 
    canonicalKey: candidate?.canonicalKey 
  });

  if (candidate?.isGeneric && candidate?.canonicalKey) {
    const canonical = await fetchCanonicalNutrition(candidate.canonicalKey);
    const normalized = Array.isArray(canonical) 
      ? normalizeIngredients(canonical) 
      : normalizeIngredients(canonical);
    const ingredientsText = 
      canonical?.ingredientsText ?? 
      (normalized.length ? normalized.join(', ') : undefined);
    
    const enriched = {
      ...canonical,
      ...candidate,
      ingredientsList: normalized.length ? normalized : undefined,
      ingredientsText,
      hasIngredients: Boolean((normalized && normalized.length) || ingredientsText),
      ingredientsUnavailable: !Boolean((normalized && normalized.length) || ingredientsText),
      enrichmentSource: 'canonical'
    };
    
    if (import.meta.env.DEV) {
      console.log('[ENRICH][DONE]', {
        name: candidate?.name,
        listLen: enriched.ingredientsList?.length ?? 0,
        hasText: !!enriched.ingredientsText,
        ingredientsSample: enriched.ingredientsList?.slice(0, 3) ?? []
      });
    }
    
    return enriched;
  }

  const base = candidate?.data ?? candidate;
  const normalized = Array.isArray(base) 
    ? normalizeIngredients(base) 
    : normalizeIngredients(base);
  const ingredientsText = 
    base?.ingredientsText ?? 
    (normalized.length ? normalized.join(', ') : undefined);

  const enriched = {
    ...candidate,
    ingredientsList: normalized.length ? normalized : undefined,
    ingredientsText,
    hasIngredients: Boolean((normalized && normalized.length) || ingredientsText),
    ingredientsUnavailable: !Boolean((normalized && normalized.length) || ingredientsText),
    enrichmentSource: 'provider'
  };
  
  if (import.meta.env.DEV) {
    console.log('[ENRICH][DONE]', {
      name: candidate?.name,
      listLen: enriched.ingredientsList?.length ?? 0,
      hasText: !!enriched.ingredientsText,
      ingredientsSample: enriched.ingredientsList?.slice(0, 3) ?? []
    });
  }
  
  return enriched;
}