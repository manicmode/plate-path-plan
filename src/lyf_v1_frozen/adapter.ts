import { detectAndFuse } from '@/detect'

// Legacy adapter that returns just names + grams, like the old v1 path expected
export async function analyzePhotoForLyfV1Legacy(base64: string) {
  const dets = await detectAndFuse({ base64 })
  return {
    items: dets.map(d => ({
      name: d.canonicalName ?? d.name,
      grams: d.gramsEstimate ?? getDefaultGrams(d.canonicalName ?? d.name),
      confidence: d.confidence,
      source: d.source,
      mapped: d.canonicalName ? true : false, // Track if nutrition mapping succeeded
    })),
  }
}

// Default portion estimates with improved area-based calculation
function getDefaultGrams(canonicalName: string): number {
  const name = canonicalName.toLowerCase();
  
  // Salmon variants - typical fillet portion
  if (/salmon|tuna|trout|fish/.test(name)) return 140;
  
  // Other proteins
  if (/chicken|beef|pork/.test(name)) return 120;
  
  // Vegetables with area consideration
  if (/asparagus/.test(name)) return 90;  // ~6-8 spears
  if (/broccoli|cauliflower/.test(name)) return 100;
  
  // Tomatoes - distinguish cherry from regular
  if (/cherry.*tomato|grape.*tomato/.test(name)) return 30; // ~4-6 cherry tomatoes
  if (/tomato/.test(name)) return 80; // Medium tomato or slices
  
  // Citrus - typically garnish portions
  if (/lemon|lime/.test(name)) return 10; // Wedge/slice
  
  // Starches
  if (/rice|pasta|bread/.test(name)) return 150;
  
  // Leafy greens
  if (/lettuce|spinach|kale/.test(name)) return 50;
  
  return 100; // Default fallback
}

// Area-based portion estimation when bbox available
function estimateGramsFromArea(canonicalName: string, itemArea: number, plateArea: number): number {
  const areaRatio = plateArea > 0 ? itemArea / plateArea : 0.1;
  const baseGrams = getDefaultGrams(canonicalName);
  const name = canonicalName.toLowerCase();
  
  // Apply area scaling with per-class limits
  let estimatedGrams = Math.round(baseGrams * (areaRatio / 0.25)); // Assume 0.25 is quarter-plate
  
  // Apply class-specific caps
  if (/salmon|tuna|trout/.test(name)) {
    estimatedGrams = Math.max(80, Math.min(220, estimatedGrams));
  } else if (/asparagus/.test(name)) {
    estimatedGrams = Math.max(50, Math.min(150, estimatedGrams));
  } else if (/cherry.*tomato|grape.*tomato/.test(name)) {
    estimatedGrams = Math.max(15, Math.min(60, estimatedGrams));
  } else if (/tomato/.test(name)) {
    estimatedGrams = Math.max(30, Math.min(120, estimatedGrams));
  } else if (/lemon|lime/.test(name)) {
    // Lemon/lime is usually garnish - keep small even if large area
    estimatedGrams = areaRatio < 0.02 ? 10 : Math.min(25, estimatedGrams);
  }
  
  return estimatedGrams;
}