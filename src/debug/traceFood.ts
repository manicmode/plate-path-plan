export const DEBUG_FOOD_TRACE = true;

export function trace(tag: string, data: any) {
  if (!DEBUG_FOOD_TRACE) return;
  try {
    const snap = (x: any) => x && typeof x === 'object'
      ? {
          id: x.id ?? x._id,
          name: x.name ?? x.displayName ?? x.title,
          brandName: x.brandName,
          source: x.source ?? x.enrichmentSource,
          enrichmentSource: x.enrichmentSource,
          barcode: x.barcode,
          providerRef: x.providerRef,
          imageUrl: x.imageUrl ?? x.photo ?? x.image,
          gramsPerServing: x.gramsPerServing ?? x.servingGrams ?? x.portionGrams,
          calories: x.calories,
          macros: x.macros ? {
            protein: x.macros.protein,
            carbs: x.macros.carbs,
            fat: x.macros.fat,
            fiber: x.macros.fiber,
            sugar: x.macros.sugar,
          } : undefined,
          ingredientsLen: Array.isArray(x.ingredients) ? x.ingredients.length : undefined,
          ingredientsPreview: Array.isArray(x.ingredients) ? x.ingredients.slice(0, 6) : undefined,
        }
      : x;
    // eslint-disable-next-line no-console
    console.log(`[FOOD][${tag}]`, snap(data));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[FOOD][TRACE][ERR]', e);
  }
}

export function caloriesFromMacros(m?: { protein?: number; carbs?: number; fat?: number }) {
  if (!m) return undefined;
  const p = Number(m.protein || 0);
  const c = Number(m.carbs || 0);
  const f = Number(m.fat || 0);
  return Math.round(p * 4 + c * 4 + f * 9);
}