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

// Default portion estimates
function getDefaultGrams(name: string): number {
  const canonical = name.toLowerCase();
  
  if (/salmon|tuna|trout|fish/.test(canonical)) return 140;
  if (/chicken|beef|pork/.test(canonical)) return 120;
  if (/asparagus/.test(canonical)) return 90;
  if (/broccoli|cauliflower/.test(canonical)) return 100;
  if (/tomato/.test(canonical)) return 30;
  if (/lemon|lime/.test(canonical)) return 10;
  if (/rice|pasta|bread/.test(canonical)) return 150;
  if (/lettuce|spinach|kale/.test(canonical)) return 50;
  
  return 100; // Default fallback
}