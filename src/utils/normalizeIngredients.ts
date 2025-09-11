export const normalizeIngredients = (data: any): string[] => {
  const sources = [
    data?.ingredientsList,
    data?.ingredients,
    data?.ingredients_text,
    data?.ingredientsText,
    data?.components
  ].filter(Boolean);

  const toArray = (src: any): string[] => {
    if (Array.isArray(src)) return src;
    if (typeof src === 'string') return [src];
    return [];
  };

  for (const src of sources) {
    const arr = toArray(src);
    if (arr.length) {
      return arr
        .flatMap(s =>
          s.split(/[,;|\n·-]/g)
           .map(t => t.trim())
           .filter(t => t.length > 0 && t.length <= 100)
        )
        .slice(0, 20);
    }
  }
  return [];
};