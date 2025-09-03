// Centralized name extraction with multiple fallbacks
export function extractName(item: any): string {
  if (!item) return 'Unknown';
  
  // Try multiple possible name fields
  const name = item?.name ?? 
               item?.productName ?? 
               item?.displayName ?? 
               item?.title ?? 
               item?.description ?? 
               item?.label ?? 
               item?.food_name ?? 
               item?.item_name ?? 
               null;
  
  return name && String(name).trim().length > 0 ? String(name).trim() : 'Unknown';
}

// Normalize items with enhanced name extraction
export function normalizeItem(rawItem: any): any {
  const name = extractName(rawItem);
  
  return {
    name,
    confidence: typeof rawItem?.confidence === 'number' ? rawItem.confidence : 0.8,
    category: rawItem?.category ?? rawItem?.food_category ?? 'unknown',
    portion_hint: rawItem?.portion_hint ?? rawItem?.hint ?? rawItem?.hints ?? null,
    calories: typeof rawItem?.calories === 'number' ? rawItem.calories : null,
    nutrition: rawItem?.nutrition_facts ?? rawItem?.nutrition ?? null,
    image: rawItem?.image_url ?? rawItem?.image ?? null,
    flags: Array.isArray(rawItem?.flags) ? rawItem.flags : [],
    score: rawItem?.score ?? null
  };
}

// Sample flags test helper  
export function applySampleFlags(item: any, ingredientsText?: string): any {
  if (!item || !ingredientsText) return item;
  
  const flags = [];
  const ingredients = ingredientsText.toLowerCase();
  
  if (ingredients.includes('corn syrup') || ingredients.includes('sugar')) {
    flags.push('High Sugar');
  }
  
  if (ingredients.includes('sodium') || ingredients.includes('salt')) {
    flags.push('High Sodium');
  }
  
  return { ...item, flags };
}