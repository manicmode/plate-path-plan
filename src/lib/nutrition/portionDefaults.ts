/**
 * Default portion sizes for common foods in grams
 * Used for Photo Flow V2 portion estimation
 */

export interface PortionDefault {
  unit?: 'piece' | 'portion';
  grams: number;
}

export const PER_GRAM_DEFAULTS: Record<string, PortionDefault> = {
  // Proteins
  salmon: { grams: 140 },              // 1 fillet
  chicken_breast: { grams: 120 },      // 1 breast
  beef_steak: { grams: 170 },          // 1 steak
  tofu: { grams: 100 },                // 1 serving
  shrimp: { unit: 'piece', grams: 10 }, // per piece
  tuna: { grams: 120 },                // 1 serving
  
  // Vegetables  
  asparagus_piece: { unit: 'piece', grams: 12 }, // per spear
  cherry_tomato: { unit: 'piece', grams: 17 },   // per tomato
  tomato: { grams: 150 },              // 1 medium
  broccoli: { grams: 85 },             // 1 cup
  spinach: { grams: 30 },              // 1 cup fresh
  carrot: { grams: 60 },               // 1 medium
  
  // Grains & Starches
  rice: { grams: 150 },                // per scoop/serving
  pasta: { grams: 140 },               // cooked portion
  bread: { unit: 'piece', grams: 25 }, // per slice
  
  // Other
  egg: { unit: 'piece', grams: 50 },   // per egg
  salad: { grams: 100 },               // mixed greens
  
  // Safe generic fallback
  generic: { grams: 100 },
};

/**
 * Map a food name to a portion default key
 */
export function defaultKeyFor(hitName: string): string {
  const normalized = hitName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Direct matches first
  if (normalized.includes('salmon')) return 'salmon';
  if (normalized.includes('asparagus')) return 'asparagus_piece';  
  if (normalized.includes('cherry tomato') || normalized.includes('tomato cherry')) return 'cherry_tomato';
  if (normalized.includes('tomato')) return 'tomato';
  if (normalized.includes('rice')) return 'rice';
  if (normalized.includes('pasta') || normalized.includes('noodle')) return 'pasta';
  if (normalized.includes('salad') || normalized.includes('lettuce')) return 'salad';
  if (normalized.includes('tofu')) return 'tofu';
  if (normalized.includes('chicken')) return 'chicken_breast';
  if (normalized.includes('beef') || normalized.includes('steak')) return 'beef_steak';
  if (normalized.includes('egg')) return 'egg';
  if (normalized.includes('shrimp') || normalized.includes('prawn')) return 'shrimp';
  if (normalized.includes('tuna')) return 'tuna';
  if (normalized.includes('broccoli')) return 'broccoli';
  if (normalized.includes('spinach')) return 'spinach';
  if (normalized.includes('carrot')) return 'carrot';
  if (normalized.includes('bread')) return 'bread';
  
  // Generic fallback
  return 'generic';
}

/**
 * Calculate bounding box area from normalized vertices
 */
export function calculateBoundingBoxArea(poly: any): number {
  if (!poly?.length) return 0;
  
  const xs = poly.map((p: any) => p.x || 0);
  const ys = poly.map((p: any) => p.y || 0);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  return Math.max(0, width * height);
}

/**
 * Calculate size multiplier based on plate-relative sizing
 */
export function calculateSizeMultiplier(itemBox: any, plateBox: any): number {
  if (!plateBox || !itemBox) return 1.0;
  
  const itemArea = calculateBoundingBoxArea(itemBox);
  const plateArea = calculateBoundingBoxArea(plateBox);
  
  if (plateArea <= 0) return 1.0;
  
  const relativeSize = itemArea / plateArea;
  
  // Size multipliers based on relative area
  if (relativeSize < 0.07) return 0.75;  // Small portion
  if (relativeSize < 0.13) return 1.00;  // Normal portion  
  if (relativeSize < 0.25) return 1.25;  // Large portion
  return 1.50;  // Very large portion
}
