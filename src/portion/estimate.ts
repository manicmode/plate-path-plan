// Portion estimation v1 - plate-scale and bbox-based

import { FusedFood } from '@/detect/ensemble';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface PortionEstimate {
  name: string;
  grams_est: number;
  confidence: 'high' | 'medium' | 'low';
  area_ratio?: number;
  food_class: string;
  source: 'vision' | 'gpt' | 'both';
}

// Constants (documented at top)
const PLATE_DIAMETER_CM = 27;

// Base grams by class for ¼-plate areas
const BASE_PORTIONS: Record<string, number> = {
  protein: 135, // salmon, chicken, beef, etc.
  starch: 175,  // rice, pasta, potato, bread
  veg: 100,     // broccoli, carrots, mixed vegetables  
  leafy: 75,    // lettuce, spinach, salads
  other: 120    // default fallback
};

export function classifyFood(canonicalName: string): 'protein' | 'starch' | 'veg' | 'leafy' | 'other' {
  const name = canonicalName.toLowerCase();
  
  // Protein foods
  if (/\b(salmon|chicken|beef|pork|tuna|shrimp|fish|meat|steak|turkey|duck|egg|tofu|tempeh)\b/.test(name)) {
    return 'protein';
  }
  
  // Starch foods
  if (/\b(rice|pasta|noodle|bread|potato|quinoa|couscous|bun|baguette|tortilla|french fries|fries)\b/.test(name)) {
    return 'starch';
  }
  
  // Leafy vegetables
  if (/\b(lettuce|spinach|kale|salad|greens|arugula|chard)\b/.test(name)) {
    return 'leafy';
  }
  
  // Other vegetables
  if (/\b(asparagus|broccoli|carrot|tomato|pepper|onion|mushroom|cucumber|vegetable|bean|pea)\b/.test(name)) {
    return 'veg';
  }
  
  return 'other';
}

export function estimatePlateScale(
  plateBBox: BoundingBox, 
  imageWH: ImageDimensions
): number | null {
  if (!plateBBox) return null;
  
  // Estimate plate area in pixels
  const plateAreaPx = plateBBox.width * plateBBox.height;
  
  // Assume circular plate, calculate diameter in pixels
  const plateDiameterPx = Math.sqrt(plateAreaPx / Math.PI) * 2;
  
  // Calculate cm per pixel ratio
  return PLATE_DIAMETER_CM / plateDiameterPx;
}

export function gramsFromArea({
  foodClass,
  itemBBox,
  plateBBox,
  imageWH
}: {
  foodClass: string;
  itemBBox?: BoundingBox;
  plateBBox?: BoundingBox;
  imageWH?: ImageDimensions;
}): { grams: number; confidence: 'high' | 'medium' | 'low'; area_ratio?: number } {
  
  if (!itemBBox) {
    // No bbox - use priors only
    const baseGrams = BASE_PORTIONS[foodClass] || BASE_PORTIONS.other;
    return {
      grams: baseGrams,
      confidence: 'low'
    };
  }
  
  const itemAreaPx = itemBBox.width * itemBBox.height;
  
  if (plateBBox && imageWH) {
    // High confidence: plate-based estimation
    const plateAreaPx = plateBBox.width * plateBBox.height;
    const area_ratio = itemAreaPx / plateAreaPx;
    
    // Base grams for quarter-plate, scale linearly
    const baseGrams = BASE_PORTIONS[foodClass] || BASE_PORTIONS.other;
    const grams = Math.round((area_ratio / 0.25) * baseGrams);
    
    return {
      grams: Math.max(10, Math.min(600, grams)),
      confidence: 'high',
      area_ratio
    };
  }
  
  // Medium confidence: bbox without plate context
  // Use bbox size relative to image as a rough heuristic
  if (imageWH) {
    const imageArea = imageWH.width * imageWH.height;
    const imageRatio = itemAreaPx / imageArea;
    
    const baseGrams = BASE_PORTIONS[foodClass] || BASE_PORTIONS.other;
    // Scale based on how much of the image the item takes up
    const grams = Math.round(baseGrams * Math.sqrt(imageRatio) * 4); // Rough scaling
    
    return {
      grams: Math.max(10, Math.min(600, grams)),
      confidence: 'medium'
    };
  }
  
  // Low confidence: bbox but no context
  const baseGrams = BASE_PORTIONS[foodClass] || BASE_PORTIONS.other;
  return {
    grams: Math.round(baseGrams * 0.8), // Slightly reduce default
    confidence: 'low'
  };
}

export function estimatePortions(
  fusedItems: FusedFood[], 
  plateBBox?: BoundingBox,
  imageWH?: ImageDimensions
): PortionEstimate[] {
  
  return fusedItems.map(item => {
    const food_class = classifyFood(item.canonicalName);
    const estimation = gramsFromArea({
      foodClass: food_class,
      itemBBox: item.bbox,
      plateBBox,
      imageWH
    });
    
    // DEV-only logging per item
    if (import.meta.env.DEV) {
      console.info('[PORTION]', {
        name: item.canonicalName,
        area: estimation.area_ratio?.toFixed(2),
        grams: estimation.grams,
        conf: estimation.confidence,
        source: item.origin
      });
    }
    
    return {
      name: item.canonicalName,
      grams_est: estimation.grams,
      confidence: estimation.confidence,
      area_ratio: estimation.area_ratio,
      food_class,
      source: item.origin
    };
  });
}
