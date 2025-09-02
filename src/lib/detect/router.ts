/**
 * Detection Router - Single source of truth for detection mode
 */

export type DetectMode = 'GPT_ONLY' | 'GPT_FIRST' | 'VISION_ONLY';

function getBoolean(value: string | undefined): boolean {
  return value === 'true';
}

export function getDetectMode(): DetectMode {
  const only = getBoolean(import.meta.env.VITE_FEATURE_USE_GPT_ONLY);
  const first = getBoolean(import.meta.env.VITE_FEATURE_USE_GPT_FIRST);
  
  if (only) return 'GPT_ONLY';
  if (first) return 'GPT_FIRST';
  return 'VISION_ONLY';
}

export interface DetectedItem {
  name: string;
  grams: number;
  confidence: number;
  source: string;
}

// Reject list for filtering out non-food items
const REJECT = new Set([
  'plate', 'dish', 'bowl', 'table', 'tableware', 'cutlery', 'fork', 
  'knife', 'spoon', 'cup', 'glass', 'syrup', 'curd', 'ketchup', 
  'bar', 'cookie', 'snack', 'container', 'wrapper', 'package'
]);

export function filterDetectedItems(items: DetectedItem[]): DetectedItem[] {
  if (!items?.length) return [];
  
  return items.filter(item => {
    const name = item.name?.toLowerCase?.() ?? '';
    return name && !REJECT.has(name);
  });
}

export async function detectWithGpt(imageBase64: string): Promise<DetectedItem[]> {
  const { detectGptFirst } = await import('@/detect/gptFirst');
  
  console.info('[DETECT][GPT] Starting GPT detection...');
  const result = await detectGptFirst(imageBase64);
  
  if (result.items?.length) {
    console.info('[REPORT][V2][GPT] Success', result.items);
    
    // Apply filtering and portion estimation
    const itemsWithPortions = await Promise.all(
      result.items.map(async item => ({
        name: item.name,
        grams: item.portion_estimate || await estimatePortionFromName(item.name),
        confidence: item.confidence,
        source: item.source
      }))
    );
    
    const filteredItems = filterDetectedItems(itemsWithPortions);
    return filteredItems;
  } else {
    console.warn('[DETECT][GPT] No items detected');
    return [];
  }
}

export async function detectWithVision(imageBase64: string): Promise<DetectedItem[]> {
  const { detectFoodVisionV1 } = await import('@/detect/vision_v1');
  
  console.info('[DETECT][VISION] Starting Vision detection...');
  const result = await detectFoodVisionV1(imageBase64);
  
  if (result.foods?.length) {
    console.info('[REPORT][V2][VISION] Only');
    
    // Apply filtering and portion estimation
    const itemsWithPortions = await Promise.all(
      result.foods.map(async food => ({
        name: food.name,
        grams: await estimatePortionFromName(food.name),
        confidence: food.score || 0.7,
        source: 'vision'
      }))
    );
    
    const filteredItems = filterDetectedItems(itemsWithPortions);
    return filteredItems;
  } else {
    console.warn('[DETECT][VISION] No items detected');
    return [];
  }
}

export async function detectWithLyfV1Vision(imageBase64: string): Promise<DetectedItem[]> {
  const { supabase } = await import('@/integrations/supabase/client');
  
  console.info('[DETECT][LYF_V1] Starting LYF V1 detection...');
  const { data: meal, error } = await supabase.functions.invoke('meal-detector-v1', {
    body: { image_base64: imageBase64 }
  });

  if (error) {
    console.error('[DETECT][LYF_V1] Error:', error);
    return [];
  }

  const items = meal?.items ?? [];
  console.info('[REPORT][V2][VISION] Only');
  
  // Apply filtering and portion estimation
  const itemsWithPortions = await Promise.all(
    items.map(async (item: any) => ({
      name: item.name,
      grams: item.grams || await estimatePortionFromName(item.name),
      confidence: item.confidence || 0.7,
      source: 'lyf-v1'
    }))
  );
  
  const filteredItems = filterDetectedItems(itemsWithPortions);
  return filteredItems;
}

// Import portion estimation helper
async function estimatePortionFromName(name: string): Promise<number> {
  // Import the function dynamically to avoid circular dependencies
  const { estimatePortionFromName: estimate } = await import('@/lib/portionEstimation');
  return estimate(name);
}