// Utilities for reminder system

export function hashMealSet(items: Array<{ name: string; grams?: number }>) {
  const key = items
    .map(i => `${(i.name || '').trim().toLowerCase()}|${Math.round(i.grams || 0)}`)
    .sort()
    .join('||');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return `mealset-${Math.abs(h).toString(36)}`;
}

// Check if nutrition is ready for an item ID
export const nutritionReady = (id: string) => {
  const { useNutritionStore } = require('@/stores/nutritionStore');
  const { perGramSum } = require('@/lib/confirm/hydrationUtils');
  const perGram = useNutritionStore.getState().byId[id]?.perGram;
  return !!perGram && perGramSum(perGram) > 0;
};