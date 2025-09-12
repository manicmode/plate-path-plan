import { fetchCanonicalNutrition } from '@/lib/food/fetchCanonicalNutrition';
import { normalizeIngredients } from '@/utils/normalizeIngredients';
import { nvLabelLookup } from '@/lib/nutritionVault';
import { isEan, offImageForBarcode } from '@/lib/imageHelpers';

export async function enrichCandidate(candidate: any) {
  console.log('[ENRICH][START]', { 
    isGeneric: candidate?.isGeneric, 
    canonicalKey: candidate?.canonicalKey 
  });

  let enriched = { ...candidate };
  
  // CRITICAL: Preserve brand/generic classification from the original candidate
  enriched.isGeneric = candidate.isGeneric;
  enriched.provider = candidate.provider;
  enriched.providerRef = candidate.providerRef;

  // 1) Generic canonical fallback (existing canonicalKey logic)
  if (candidate?.isGeneric && candidate?.canonicalKey) {
    try {
      const canonical = await fetchCanonicalNutrition(candidate.canonicalKey);
      const normalized = Array.isArray(canonical) 
        ? normalizeIngredients(canonical) 
        : normalizeIngredients(canonical);
      const ingredientsText = 
        canonical?.ingredientsText ?? 
        (normalized.length ? normalized.join(', ') : undefined);
      
      enriched = {
        ...canonical,
        ...candidate,
        ingredientsList: normalized.length ? normalized : undefined,
        ingredientsText,
        hasIngredients: Boolean((normalized && normalized.length) || ingredientsText),
        ingredientsUnavailable: !Boolean((normalized && normalized.length) || ingredientsText),
        enrichmentSource: 'canonical'
      };
      
      if (import.meta.env.DEV) {
        console.log('[ENRICH][CANONICAL]', {
          name: candidate?.name,
          listLen: enriched.ingredientsList?.length ?? 0,
          hasText: !!enriched.ingredientsText
        });
      }
    } catch (error) {
      console.warn('[ENRICH][CANONICAL][ERROR]', error);
    }
  }

  // 2) Generic without canonicalKey - try classId
  if (candidate?.isGeneric && !candidate?.canonicalKey && candidate?.classId && !enriched.hasIngredients) {
    try {
      const canonical = await fetchCanonicalNutrition(candidate.classId);
      const text = canonical?.ingredientsText || "";
      const list = (canonical?.ingredientsList && canonical.ingredientsList.length)
        ? canonical.ingredientsList
        : normalizeIngredients(text);
      
      if (list?.length || text) {
        enriched.ingredientsText = text;
        enriched.ingredientsList = list || [];
        enriched.hasIngredients = true;
        enriched.enrichmentSource = "canonical";
        
        if (import.meta.env.DEV) {
          console.log('[ENRICH][CANONICAL_CLASSID]', {
            name: candidate?.name,
            listLen: list?.length ?? 0
          });
        }
      }
    } catch (error) {
      console.warn('[ENRICH][CANONICAL_CLASSID][ERROR]', error);
    }
  }

  // 3) Enhanced label lookup when still missing ingredients
  const missingIngredients = !enriched?.ingredientsList?.length && !enriched?.ingredientsText;
  if (missingIngredients) {
    try {
      const { ingredientsText, ingredientsList, source } = await nvLabelLookup({
        providerRef: candidate.providerRef || candidate.provider_ref,
        name: candidate.name,
      });

      if (ingredientsList.length || ingredientsText) {
        enriched.ingredientsText = ingredientsText;
        enriched.ingredientsList = ingredientsList.length ? ingredientsList : normalizeIngredients(ingredientsText);
        enriched.hasIngredients = true;
        enriched.enrichmentSource = source;

        // Map image fields after label success
        const label = { ingredientsText, ingredientsList, source } as any;
        const img =
          label.imageUrl ? { 
            imageUrl: label.imageUrl, 
            imageThumbUrl: label.imageThumbUrl, 
            imageAttribution: label.imageAttribution ?? 'openfoodfacts', 
            imageUrlKind: 'provider' 
          }
          : (candidate.providerRef && isEan(candidate.providerRef))
            ? { ...offImageForBarcode(candidate.providerRef), imageAttribution: 'openfoodfacts', imageUrlKind: 'provider' }
            : undefined;

        if (img?.imageUrl) {
          enriched.imageUrl = img.imageUrl;
          enriched.imageThumbUrl = img.imageThumbUrl ?? img.imageUrl;
          enriched.imageAttribution = img.imageAttribution;
          enriched.imageUrlKind = 'provider';
        }
        
        // Add image diagnostics logging
        console.log('[ENRICH][IMG]', { 
          has: !!enriched.imageUrl, 
          kind: enriched.imageUrlKind, 
          src: enriched.imageAttribution 
        });
        
        // Ingredients pipeline logging
        console.log('[ING][SET]', {
          language: 'unknown', // Would need language detection
          hasList: !!ingredientsList?.length,
          listLen: ingredientsList?.length,
          hasText: !!ingredientsText,
          analysisTags: enriched?.ingredients_analysis_tags?.slice(0, 5) || []
        });
        
        if (import.meta.env.DEV) {
          console.log('[ENRICH][NV_LABEL]', {
            name: candidate?.name,
            source,
            listLen: enriched.ingredientsList?.length ?? 0,
            first3: enriched.ingredientsList?.slice(0, 3) ?? []
          });
        }
      } else {
        enriched.ingredientsUnavailable = true;
        enriched.hasIngredients = false;
      }
    } catch (error) {
      console.warn('[ENRICH][NV_LABEL][ERROR]', error);
      enriched.ingredientsUnavailable = true;
      enriched.hasIngredients = false;
    }
  }

  // 4) Fallback to existing data if still no ingredients
  if (!enriched.hasIngredients) {
    const base = candidate?.data ?? candidate;
    const normalized = Array.isArray(base) 
      ? normalizeIngredients(base) 
      : normalizeIngredients(base);
    const ingredientsText = 
      base?.ingredientsText ?? 
      (normalized.length ? normalized.join(', ') : undefined);

    enriched.ingredientsList = normalized.length ? normalized : undefined;
    enriched.ingredientsText = ingredientsText;
    enriched.hasIngredients = Boolean((normalized && normalized.length) || ingredientsText);
    enriched.ingredientsUnavailable = !Boolean((normalized && normalized.length) || ingredientsText);
    if (!enriched.enrichmentSource) {
      enriched.enrichmentSource = 'provider';
    }
  }

  // Always return normalized fields
  enriched.ingredientsText = enriched.ingredientsText || "";
  enriched.ingredientsList = Array.isArray(enriched.ingredientsList) ? enriched.ingredientsList : [];

  // Flip to branded when evidence is present
  const brandEvidence =
    Boolean(enriched.brandName || (enriched as any).barcode || enriched.providerRef) ||
    enriched.enrichmentSource === 'off' ||
    enriched.enrichmentSource === 'label';

  if (brandEvidence) {
    enriched.isGeneric = false;
  }

  console.log('[ENRICH][DONE]', { 
    hasIngredients: !!enriched?.ingredientsList?.length || !!enriched?.ingredientsText, 
    baseServingG: enriched?.servingGrams, 
    classId: enriched?.classId, 
    canonicalKey: enriched?.canonicalKey,
    isGeneric: enriched?.isGeneric,
    provider: enriched?.provider
  });
  
  // ENRICH OUT logging
  console.log('[ENRICH][OUT]', {
    name: enriched?.name,
    classId: enriched?.classId,
    isGeneric: enriched?.isGeneric,
    labelSource: enriched?.enrichmentSource || 'none',
    brandName: enriched?.brandName || enriched?.brand,
    barcode: enriched?.providerRef,
    providerRef: enriched?.providerRef,
    servingSizeG: enriched?.label?.servingSizeG,
    macrosPerServing: enriched?.label?.macrosPerServing,
    basePer100: !!enriched?.basePer100,
    perGram: !!enriched?.perGram
  });
  
  if (import.meta.env.DEV) {
    console.log('[ENRICH][DONE]', {
      name: candidate?.name,
      listLen: enriched.ingredientsList?.length ?? 0,
      hasText: !!enriched.ingredientsText,
      hasIngredients: enriched.hasIngredients,
      enrichmentSource: enriched.enrichmentSource,
      ingredientsSample: enriched.ingredientsList?.slice(0, 3) ?? []
    });
  }
  
  return enriched;
}