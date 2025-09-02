// Portion estimation using plate-scale heuristics

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
  food_class?: string;
}

// Standard plate diameter assumption (documented constant)
const STANDARD_PLATE_DIAMETER_CM = 27;

// Base portion sizes for quarter-plate areas by food class
const BASE_PORTIONS: Record<string, number> = {
  protein: 135, // chicken, salmon, beef, etc.
  starch: 175,  // rice, pasta, potato, bread
  veg: 100,     // broccoli, carrots, mixed vegetables
  leafy: 75,    // lettuce, spinach, salads
  other: 120    // default fallback
};

export function estimatePlateScaleCmPerPx(
  plateBBox: BoundingBox, 
  imageWH: ImageDimensions
): number {
  // Estimate plate area in pixels
  const plateAreaPx = plateBBox.width * plateBBox.height;
  
  // Assume circular plate, calculate diameter in pixels
  const plateDiameterPx = Math.sqrt(plateAreaPx / Math.PI) * 2;
  
  // Calculate cm per pixel ratio
  return STANDARD_PLATE_DIAMETER_CM / plateDiameterPx;
}

export function classifyFood(foodName: string): 'protein' | 'starch' | 'veg' | 'leafy' | 'other' {
  const name = foodName.toLowerCase();
  
  // Protein foods
  if (/\\b(salmon|chicken|beef|pork|tuna|shrimp|fish|meat|steak|turkey|duck|egg|tofu|tempeh)\\b/.test(name)) {
    return 'protein';
  }
  
  // Starch foods
  if (/\\b(rice|pasta|noodle|bread|potato|quinoa|couscous|bun|baguette|tortilla)\\b/.test(name)) {
    return 'starch';
  }
  
  // Leafy vegetables
  if (/\\b(lettuce|spinach|kale|salad|greens|arugula|chard)\\b/.test(name)) {
    return 'leafy';
  }
  
  // Other vegetables
  if (/\\b(asparagus|broccoli|carrot|tomato|pepper|onion|mushroom|cucumber|vegetable)\\b/.test(name)) {
    return 'veg';
  }
  
  return 'other';
}

export function estimateGramsFromArea({
  foodClass,
  itemBBox,
  plateBBox,
  imageWH,
  cmPerPx
}: {
  foodClass: string;
  itemBBox: BoundingBox;
  plateBBox?: BoundingBox;
  imageWH: ImageDimensions;
  cmPerPx?: number;
}): { grams: number; confidence: 'high' | 'medium' | 'low'; area_ratio?: number } {
  
  // Calculate item area
  const itemAreaPx = itemBBox.width * itemBBox.height;
  
  if (plateBBox) {
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
  
  // Medium confidence: look for utensils for scale reference
  // This would need utensil detection from Vision API objects
  // For now, return base portion with medium confidence
  
  // Low confidence: base portions only
  const baseGrams = BASE_PORTIONS[foodClass] || BASE_PORTIONS.other;
  
  return {
    grams: baseGrams,
    confidence: 'low'
  };
}

export function estimatePortions(
  items: string[], 
  bboxes: BoundingBox[], 
  imageWH: ImageDimensions, 
  plateBBox?: BoundingBox
): PortionEstimate[] {
  
  const cmPerPx = plateBBox ? estimatePlateScaleCmPerPx(plateBBox, imageWH) : undefined;
  
  return items.map((name, index) => {
    const itemBBox = bboxes[index];
    const food_class = classifyFood(name);
    
    if (!itemBBox) {
      // Fallback when no bounding box available
      const baseGrams = BASE_PORTIONS[food_class] || BASE_PORTIONS.other;
      return {
        name,
        grams_est: baseGrams,
        confidence: 'low' as const,
        food_class
      };
    }
    
    const estimation = estimateGramsFromArea({
      foodClass: food_class,
      itemBBox,
      plateBBox,
      imageWH,
      cmPerPx
    });
    
    // DEV-only logging
    if (import.meta.env.DEV) {
      console.info('[PORTION][v1]', {
        name,
        area_ratio: estimation.area_ratio?.toFixed(2),
        grams: estimation.grams,
        conf: estimation.confidence
      });
    }
    
    return {
      name,
      grams_est: estimation.grams,
      confidence: estimation.confidence,
      area_ratio: estimation.area_ratio,
      food_class
    };
  });
}
