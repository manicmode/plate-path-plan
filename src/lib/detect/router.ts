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
  const { buildMealPrompt } = await import('@/lib/detect/gptPrompt');
  const { processGptItems } = await import('@/lib/detect/canonicalize');
  const { estimatePortionWithDefaults } = await import('@/lib/portion/estimate');
  const { supabase } = await import('@/integrations/supabase/client');
  
  console.info('[DETECT][GPT] Starting GPT detection...');
  
  try {
    // Get prompt
    const { system, user } = buildMealPrompt();
    
    // Call GPT-V2 structured endpoint
    const { data, error } = await supabase.functions.invoke('gpt-food-detector-v2', {
      body: { 
        image_base64: imageBase64,
        system_prompt: system,
        user_prompt: user
      }
    });

    if (error) {
      console.error('[DETECT][GPT] Error:', error);
      throw new Error(`GPT detection failed: ${error.message}`);
    }

    const rawItems = data?.items || [];
    console.info('[GPT][raw]', `count=${rawItems.length}`);
    
    if (!rawItems.length) {
      console.warn('[DETECT][GPT] No items detected');
      return [];
    }

    // Process through canonicalization pipeline
    const processedItems = processGptItems(rawItems);
    
    // Apply portion estimation
    const itemsWithPortions = await Promise.all(
      processedItems.map(async item => {
        const portion = await estimatePortionWithDefaults(item.name, item.category, item.portion_hint);
        return {
          name: item.name,
          grams: portion.grams,
          confidence: item.confidence,
          source: 'gpt-v2'
        };
      })
    );
    
    // Scene-level guard
    const strictFilters = getBoolean(import.meta.env.VITE_DETECT_STRICT_NONFOOD);
    if (strictFilters && !isLikelyFoodScene(itemsWithPortions)) {
      console.info('[FILTER][scene]', 'no-food-scene → returning empty');
      return [];
    }
    
    console.info('[PORTION][applied]', `summary=${itemsWithPortions.map(i => `${i.name}:${i.grams}g`).join(', ')}`);
    console.info('[REPORT][V2][GPT]', `items=${itemsWithPortions.length}`, `filtered=${rawItems.length - processedItems.length}`, `grams=${itemsWithPortions.map(i => i.grams).join(',')}`);
    
    return itemsWithPortions;
  } catch (error) {
    console.error('[DETECT][GPT] Error:', error);
    throw error; // Re-throw for router to handle fallback
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
    
    // Scene-level guard
    const strictFilters = getBoolean(import.meta.env.VITE_DETECT_STRICT_NONFOOD);
    if (strictFilters && !isLikelyFoodScene(filteredItems)) {
      console.info('[FILTER][scene]', 'no-food-scene → returning empty');
      return [];
    }
    
    return filteredItems;
  } else {
    console.warn('[DETECT][VISION] No items detected');
    return [];
  }
}

// Scene-level guard (prevents junk lists when photo is not a meal)
function isLikelyFoodScene(items: DetectedItem[]): boolean {
  const allowedCategories = new Set(['protein','vegetable','fruit','grain','dairy','fat_oil','sauce_condiment']);
  return items.length > 0 && items.some(item => 
    item.source === 'gpt-v2' || allowedCategories.has(item.source)
  );
}

// Score detection results for best-of comparison
function scoreResults(items: DetectedItem[]): number {
  if (!items?.length) return 0;
  
  const hasProtein = items.some(item => item.source?.includes('protein') || 
    ['salmon', 'chicken', 'beef', 'pork', 'fish', 'meat', 'egg'].some(p => 
      item.name?.toLowerCase().includes(p)));
  
  const proteinScore = hasProtein ? 1 : 0;
  const countScore = Math.min(items.length / 4, 1);
  const avgConfidence = items.reduce((sum, item) => sum + (item.confidence || 0), 0) / items.length;
  const confidenceScore = avgConfidence * 0.5;
  
  return proteinScore + countScore + confidenceScore;
}

async function runBestOf(imageBase64: string): Promise<DetectedItem[]> {
  const safeDet = getBoolean(import.meta.env.VITE_FEATURE_SAFE_DETECT);
  
  // Always get GPT results
  let gptItems: DetectedItem[] = [];
  let gptScore = 0;
  try {
    gptItems = await detectWithGpt(imageBase64);
    gptScore = scoreResults(gptItems);
  } catch (error) {
    console.error('[BESTOF] GPT failed:', error);
  }
  
  // Get Vision results only if SAFE_DETECT enabled
  let visItems: DetectedItem[] = [];
  let visScore = 0;
  if (safeDet) {
    try {
      visItems = await detectWithVision(imageBase64);
      visScore = scoreResults(visItems);
    } catch (error) {
      console.error('[BESTOF] Vision failed:', error);
    }
  }
  
  // Choose best result (GPT wins ties)
  const useGpt = gptScore >= visScore;
  const pick = useGpt ? 'gpt' : 'vision';
  
  if (safeDet) {
    console.info('[BESTOF]', `gptScore=${gptScore.toFixed(2)}`, `visScore=${visScore.toFixed(2)}`, `pick=${pick}`);
  }
  
  return useGpt ? gptItems : visItems;
}

export async function run(imageBase64: string): Promise<DetectedItem[]> {
  const mode = getDetectMode();
  console.info('[DETECT][mode]', mode);
  
  const safeDet = getBoolean(import.meta.env.VITE_FEATURE_SAFE_DETECT);
  
  // Use best-of when SAFE_DETECT enabled, otherwise follow mode routing
  if (safeDet) {
    return await runBestOf(imageBase64);
  }
  
  // Original mode-based routing
  switch (mode) {
    case 'GPT_ONLY':
      return await detectWithGpt(imageBase64);
      
    case 'GPT_FIRST':
      try {
        const items = await detectWithGpt(imageBase64);
        if (!items?.length) {
          console.warn('[DETECT] GPT empty, fallback to Vision');
          console.info('[REPORT][V2][GPT_FAIL] Vision Fallback');
          return await detectWithVision(imageBase64);
        }
        return items;
      } catch (e) {
        console.warn('[DETECT] GPT error, fallback', e);
        console.info('[REPORT][V2][GPT_FAIL] Vision Fallback');
        return await detectWithVision(imageBase64);
      }
      
    case 'VISION_ONLY':
    default:
      return await detectWithLyfV1Vision(imageBase64);
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
  
  // Scene-level guard
  const strictFilters = getBoolean(import.meta.env.VITE_DETECT_STRICT_NONFOOD);
  if (strictFilters && !isLikelyFoodScene(filteredItems)) {
    console.info('[FILTER][scene]', 'no-food-scene → returning empty');
    return [];
  }
  
  return filteredItems;
}

// Import portion estimation helper
async function estimatePortionFromName(name: string): Promise<number> {
  // Import the function dynamically to avoid circular dependencies
  const { estimatePortionFromName: estimate } = await import('@/lib/portionEstimation');
  return estimate(name);
}