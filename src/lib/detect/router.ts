/**
 * Detection Router - Single source of truth for detection mode
 */

export enum DetectMode {
  GPT_ONLY = 'GPT_ONLY',
  VISION_ONLY = 'VISION_ONLY',
  HYBRID = 'HYBRID'
}

export type DetectModeType = keyof typeof DetectMode;

function getBoolean(value: string | undefined): boolean {
  return value === 'true';
}

export function getDetectMode(context?: { mode?: string }): DetectMode {
  // Safety: read environment mode override
  const envMode = import.meta.env.VITE_DETECT_MODE;
  const allowedModes = import.meta.env.VITE_DETECT_MODE_ALLOWED?.split(',') || ['VISION_ONLY', 'GPT_ONLY', 'HYBRID'];
  
  // Override with env setting if specified and allowed
  if (envMode && allowedModes.includes(envMode)) {
    const mode = envMode === 'VISION_ONLY' ? DetectMode.VISION_ONLY :
                envMode === 'GPT_ONLY' ? DetectMode.GPT_ONLY :
                envMode === 'HYBRID' ? DetectMode.HYBRID :
                null;
    
    if (mode) {
      console.info('[ROUTER][mode]=', envMode, '(env override)');
      return mode;
    }
  }

  // Force GPT-only for Log mode (if not overridden by env)
  if (context?.mode === 'log' && (!envMode || envMode !== 'VISION_ONLY')) {
    console.info('[ROUTER] mode=GPT_ONLY (log)');
    return DetectMode.GPT_ONLY;
  }
  
  const visionOnly = getBoolean(import.meta.env.VITE_FEATURE_USE_VISION_ONLY);
  
  if (visionOnly) return DetectMode.VISION_ONLY;
  return DetectMode.GPT_ONLY; // Default to GPT_ONLY
}

export interface DetectedItem {
  name: string;
  grams: number;
  confidence: number;
  source: string;
  portionSource?: 'count' | 'area' | 'base' | 'heuristic';
  portionRange?: [number, number];
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

export async function detectWithGpt(imageBase64: string, context?: { mode?: string }): Promise<DetectedItem[]> {
  const { buildMealPrompt } = await import('@/lib/detect/gptPrompt');
  const { processGptItems } = await import('@/lib/detect/canonicalize');
  const { estimatePortionWithDefaults } = await import('@/lib/portion/estimate');
  const { supabase } = await import('@/integrations/supabase/client');
  
  // Timing breadcrumbs (prevents silent hangs)
  const requestId = crypto.randomUUID();
  console.time(`[PHOTO][${requestId}][gpt-detection]`);
  
  console.info('[DETECT][GPT] Starting GPT detection...');
  
  // Check diagnostic flags
  const strictOnly = getBoolean(import.meta.env.VITE_DETECT_DIAG_STRICT_ONLY);
  const relaxOnly = getBoolean(import.meta.env.VITE_DETECT_DIAG_RELAX_ONLY);
  
  let attemptType = 'strict';
  if (relaxOnly) attemptType = 'relaxed';
  else if (strictOnly) attemptType = 'strict';
  
  try {
    // Get prompt
    const { system, user } = buildMealPrompt();
    
    const payload = { 
      image_base64: imageBase64,
      system_prompt: system,
      user_prompt: user,
      attempt: attemptType
    };
    
    console.info('[CLIENT][INVOCATION_DEBUG]', {
      mode: 'GPT_ONLY',
      keys: Object.keys(payload),
      imageKey: payload.image_base64 ? 'image_base64' : 'missing',
      imageLength: (payload.image_base64?.length ?? 0),
    });
    
    // Call GPT-V2 structured endpoint
    console.time(`[PHOTO][${requestId}][edge]`);
    const { data, error } = await supabase.functions.invoke('gpt-food-detector-v2', {
      body: payload
    });
    console.timeEnd(`[PHOTO][${requestId}][edge]`);

    if (error) {
      console.error('[DETECT][GPT] Error:', error);
      throw new Error(`GPT detection failed: ${error.message}`);
    }

    // 1) Shape breadcrumb
    console.warn('[ROUTER][gpt:response_shape]', {
      hasData: !!data,
      keys: data ? Object.keys(data) : [],
      hasItems: !!data?.items,
      isArray: Array.isArray(data?.items),
      len: Array.isArray(data?.items) ? data.items.length : 0,
      sample: Array.isArray(data?.items) ? data.items[0] : null,
    });

    // 2) Tolerant extractor (fail-open for future mismatches)
    function extractItems(obj:any): any[] {
      if (!obj) return [];
      if (Array.isArray(obj.items)) return obj.items;
      if (Array.isArray(obj.result?.items)) return obj.result.items;
      if (Array.isArray(obj.foods)) return obj.foods;
      if (Array.isArray(obj.detections)) return obj.detections;
      return [];
    }

    const rawItems = extractItems(data);
    console.info('[ROUTER][gpt:raw]', `count=${rawItems.length}`);
    
    const isEmpty = !rawItems.length;
    console.info('[ROUTER][gpt_empty]', isEmpty);
    
    if (isEmpty) {
      console.warn('[DETECT][GPT] No items detected');
      
      // If GPT_ONLY mode and we got empty results, try Vision fallback as safety net
      if (getDetectMode(context) === DetectMode.GPT_ONLY) {
        console.warn('[ROUTER][gpt_empty]=true');
        console.info('[ROUTER][fallback]=VISION_ONLY');
        
        try {
          const visionItems = await detectWithVision(imageBase64);
          if (visionItems.length > 0) {
            console.info('[ROUTER][fallback_success]', visionItems.length, 'items from Vision');
            return visionItems;
          }
        } catch (visionError) {
          console.error('[ROUTER][fallback_error]', visionError);
        }
      }
      
      return [];
    }

    // Process through canonicalization pipeline
    const processedItems = await processGptItems(rawItems);
    console.info('[ROUTER][gpt:canonical]', `count=${processedItems.length}`, `names=[${processedItems.map(i => i.name).join(', ')}]`);
    
    // Apply portion estimation (v3 or v2 based on feature flag)
    const itemsWithPortions = await applyPortionEstimation(processedItems, imageBase64);
    
    // Scene-level guard
    const strictFilters = getBoolean(import.meta.env.VITE_DETECT_STRICT_NONFOOD);
    if (strictFilters && !isLikelyFoodScene(itemsWithPortions)) {
      console.info('[FILTER][scene]', 'no-food-scene → returning empty');
      return [];
    }
    
    console.info('[REPORT][V2][GPT]', `items=${itemsWithPortions.length}`, `filtered=${rawItems.length - processedItems.length}`, `grams=${itemsWithPortions.map(i => i.grams).join(',')}`);
    
    console.timeEnd(`[PHOTO][${requestId}][gpt-detection]`); // full detection timing
    
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

async function runBestOf(imageBase64: string, context?: { mode?: string }): Promise<DetectedItem[]> {
  const safeDet = getBoolean(import.meta.env.VITE_FEATURE_SAFE_DETECT);
  
  // Always get GPT results
  let gptItems: DetectedItem[] = [];
  let gptScore = 0;
  try {
    gptItems = await detectWithGpt(imageBase64, context);
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

export async function run(imageBase64: string, context?: { mode?: string }): Promise<DetectedItem[]> {
  const mode = getDetectMode(context);
  console.info('[ROUTER][start] mode=', mode);
  
  const safeDet = getBoolean(import.meta.env.VITE_FEATURE_SAFE_DETECT);
  
  // Use best-of when SAFE_DETECT enabled, otherwise follow mode routing
  if (safeDet) {
    return await runBestOf(imageBase64, context);
  }
  
  // Original mode-based routing
  switch (mode) {
    case DetectMode.GPT_ONLY:
      const gptResult = await detectWithGpt(imageBase64, context);
      if (!gptResult.length) {
        console.info('[ROUTER][fallback]=NONE (GPT_ONLY mode)');
      }
      return gptResult;
      
    case DetectMode.VISION_ONLY:
    default:
      const visionResult = await detectWithLyfV1Vision(imageBase64);
      if (!visionResult.length) {
        console.info('[ROUTER][fallback]=NONE (VISION_ONLY mode)');
      }
      return visionResult;
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

// Apply portion estimation (v3 or v2 based on feature flag)
async function applyPortionEstimation(
  processedItems: any[], 
  imageBase64: string
): Promise<DetectedItem[]> {
  const USE_PORTION_V3 = true; // Always use v3 for Log mode
  const strictMode = getBoolean(import.meta.env.VITE_PORTION_STRICT);
  
  if (!USE_PORTION_V3) {
    // Use v2 estimation (existing behavior)
    const { estimatePortionWithDefaults } = await import('@/lib/portion/estimate');
    return Promise.all(
      processedItems.map(async item => {
        const portion = await estimatePortionWithDefaults(item.name, item.category, item.portion_hint);
        return {
          name: item.name,
          grams: portion.grams,
          confidence: item.confidence,
          source: 'gpt-v2',
          portionSource: 'heuristic' as const
        };
      })
    );
  }
  
  // Use v3 estimation with plate detection
  const { detectPlateEllipse } = await import('@/lib/portion/plateDetector');
  const { estimatePortionV3 } = await import('@/lib/portion/scaler');
  const { logPlateDetection } = await import('@/lib/portion/log');
  
  // Load image for plate detection
  let plateArea: number | undefined;
  try {
    const image = await loadImageFromBase64(imageBase64);
    const plateResult = detectPlateEllipse(image);
    plateArea = plateResult.confidence > 0.35 ? plateResult.area : undefined;
    logPlateDetection(plateArea, plateResult.confidence);
  } catch (error) {
    console.warn('[PORTION][V3] Plate detection failed:', error);
  }
  
  // Apply v3 estimation to each item
  return Promise.all(
    processedItems.map(async item => {
      const portionResult = await estimatePortionV3(
        {
          name: item.name,
          cat: item.category,
          hints: item.portion_hint,
          // bbox: item.bbox, // TODO: Add when we have bbox from detection
          // maskArea: item.maskArea // TODO: Add when we have segmentation
        },
        {
          plateArea,
          mode: strictMode ? 'strict' : 'lenient'
        }
      );
      
      return {
        name: item.name,
        grams: portionResult.grams,
        confidence: item.confidence,
        source: 'gpt-v2',
        portionSource: portionResult.source,
        portionRange: portionResult.range
      };
    })
  );
}

// Load image from base64 for plate detection
async function loadImageFromBase64(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  });
}