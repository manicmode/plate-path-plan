import { fetchCanonicalNutrition } from '@/lib/food/fetchCanonicalNutrition';
import { normalizeIngredients } from '@/utils/normalizeIngredients';

export async function enrichCandidate(candidate: any) {
  console.log('[ENRICH][START]', { 
    isGeneric: candidate?.isGeneric, 
    canonicalKey: candidate?.canonicalKey 
  });

  if (candidate?.isGeneric && candidate?.canonicalKey) {
    const canonical = await fetchCanonicalNutrition(candidate.canonicalKey);
    const ingredientsList = normalizeIngredients(canonical); // [] allowed
    
    console.log('[ENRICH][DONE]', { 
      ingredientsCount: ingredientsList.length,
      ingredientsSample: ingredientsList.slice(0, 3)
    });
    
    return {
      ...canonical,
      ...candidate,
      ingredientsList,
      enrichmentSource: 'canonical'
    };
  }

  const base = candidate?.data ?? candidate;
  const ingredientsList = normalizeIngredients(base);
  
  console.log('[ENRICH][DONE]', { 
    ingredientsCount: ingredientsList.length,
    ingredientsSample: ingredientsList.slice(0, 3)
  });
  
  return {
    ...candidate,
    ingredientsList,
    enrichmentSource: 'provider'
  };
}