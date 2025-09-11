import type { EnrichedFood } from "@/hooks/useManualFoodEnrichment";

export function enrichedFoodToLogItem(x: EnrichedFood, portionGrams: number = 100) {
  const per100 = x.per100g;
  const scale = portionGrams / 100;
  
  return {
    id: `enriched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: x.name,
    aliases: x.aliases ?? [],
    source: 'enriched', // Use 'enriched' as the main source type
    sourceId: x.source_id,
    confidence: x.confidence,
    
    // Normalize all ingredient variants into ingredientsList
    ingredients: (x.ingredients ?? []).map(i => ({
      name: i.name,
      grams: i.grams,
      amount: i.amount
    })),
    ingredientsAvailable: (x.ingredients ?? []).length > 0,
    ingredientsText: (x.ingredients ?? []).map(i => i.name).join(', '),
    
    // Unified ingredient field for UI
    ingredientsList: Array.isArray(x.ingredients) ? x.ingredients.map(i => i.name) : [],
    
    // Scaled macros for the specified portion size
    calories: Math.round((per100.calories ?? 0) * scale),
    protein: Math.round(((per100.protein ?? 0) * scale) * 10) / 10,
    fat: Math.round(((per100.fat ?? 0) * scale) * 10) / 10,
    carbs: Math.round(((per100.carbs ?? 0) * scale) * 10) / 10,
    fiber: per100.fiber ? Math.round((per100.fiber * scale) * 10) / 10 : 0,
    sugar: per100.sugar ? Math.round((per100.sugar * scale) * 10) / 10 : 0,
    sodium: per100.sodium ? Math.round(per100.sodium * scale) : 0,
    
    // Per-100g normalized values for portion scaling
    per100g: {
      calories: per100.calories ?? 0,
      protein: per100.protein ?? 0,
      fat: per100.fat ?? 0,
      carbs: per100.carbs ?? 0,
      fiber: per100.fiber,
      sugar: per100.sugar,
      saturated_fat: per100.saturated_fat,
      sodium: per100.sodium,
      potassium: per100.potassium,
      calcium: per100.calcium,
      iron: per100.iron
    },
    
    // Keep portion context for UI
    portionGrams,
    
    // Per-serving data if available
    perServing: x.perServing, // may be undefined; card handles it
    
    // Map enrichment metadata
    enrichmentSource: x.source, // Pass raw source (NUTRITIONIX, EDAMAM, etc.)
    enrichmentConfidence: x.confidence,
    
    // Legacy compatibility fields
    imageUrl: undefined,
    barcode: undefined,
    provider: x.source.toLowerCase(),
    _provider: 'enriched'
  };
}
