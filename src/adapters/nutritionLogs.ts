type ScanSource = 'barcode' | 'photo' | 'manual';

export function toNutritionLogRow(scan: any, source: ScanSource) {
  // defensively coerce numbers; leave null when unknown
  const num = (v: any) => (v === null || v === undefined || Number.isNaN(+v) ? null : +v);

  // your extractName() already fixed to include productName/title
  const food_name = scan?.name ?? scan?.productName ?? scan?.title ?? scan?.itemName ?? 'Unknown item';

  return {
    food_name,
    calories: num(scan?.nutrition?.calories ?? scan?.nutritionData?.calories) ?? 0,
    protein: num(scan?.nutrition?.protein ?? scan?.nutritionData?.protein) ?? 0,
    carbs: num(scan?.nutrition?.carbs ?? scan?.nutritionData?.carbs) ?? 0,
    fat: num(scan?.nutrition?.fat ?? scan?.nutritionData?.fat) ?? 0,
    fiber: num(scan?.nutrition?.fiber ?? scan?.nutritionData?.fiber),
    sugar: num(scan?.nutrition?.sugar ?? scan?.nutritionData?.sugar),
    sodium: num(scan?.nutrition?.sodium ?? scan?.nutritionData?.sodium),
    saturated_fat: num(scan?.nutrition?.saturatedFat ?? scan?.nutritionData?.saturatedFat),
    quality_score: num(scan?.quality?.score ?? scan?.healthScore) ?? 0,
    quality_verdict: scan?.quality?.verdict ?? scan?.overallRating ?? 'unknown',
    quality_reasons: Array.isArray(scan?.quality?.reasons) ? scan.quality.reasons : 
                    Array.isArray(scan?.personalizedWarnings) ? scan.personalizedWarnings : null,
    serving_size: scan?.servingSize ?? scan?.serving ?? null,
    source,
    image_url: scan?.imageUrl ?? scan?.previewUrl ?? null,
    processing_level: scan?.processing ?? scan?.novaGroup ?? null,
    ingredient_analysis: scan?.ingredientAnalysis ?? scan?.ingredients ?? scan?.healthProfile ?? null,
    confidence: num(scan?.confidence) ?? 1.0,
    barcode: scan?.barcode ?? null,
    brand: scan?.brand ?? scan?.manufacturer ?? null,
    // user_id omitted on purpose; trigger fills it
  };
}