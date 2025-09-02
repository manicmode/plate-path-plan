/**
 * GPT-First Detection Pipeline
 * Try GPT detection first, fallback to Vision if GPT fails
 */

import { detectFoodGptV, GptVisionResult } from './gpt_v';
import { detectFoodVisionV1, VisionV1Result } from './vision_v1';
import { looksFoodish } from './filters';

export interface GptFirstResult {
  items: DetectedItem[];
  source: 'gpt' | 'vision' | 'hybrid';
  gptResult?: GptVisionResult;
  visionResult?: VisionV1Result;
  _debug?: {
    gptSuccess: boolean;
    gptTimeout: boolean;
    gptEmpty: boolean;
    gptLowConfidence: boolean;
    fallbackUsed: boolean;
    filteredCount: number;
    originalCount: number;
  };
}

export interface DetectedItem {
  name: string;
  category: 'protein' | 'vegetable' | 'fruit' | 'grain' | 'dairy' | 'fat' | 'other';
  portion_estimate?: number;
  confidence: number;
  source: 'gpt' | 'vision';
}

// Filter rules: only allow valid food categories, reject condiments unless dominant
const VALID_CATEGORIES = new Set(['protein', 'vegetable', 'fruit', 'grain', 'dairy', 'fat']);
const CONDIMENT_KEYWORDS = new Set(['syrup', 'curd', 'ketchup', 'sauce', 'dressing', 'mayo', 'mustard']);
const REJECT_KEYWORDS = new Set(['serveware', 'brunch', 'plate', 'dish', 'bowl', 'cutlery', 'fork', 'knife', 'spoon']);

function filterDetectedItems(items: DetectedItem[]): DetectedItem[] {
  // Filter out invalid categories and obvious non-food items
  let filtered = items.filter(item => {
    const nameLower = item.name.toLowerCase();
    
    // Hard reject list
    if (REJECT_KEYWORDS.has(nameLower) || !looksFoodish(item.name)) {
      return false;
    }
    
    // Only allow valid food categories
    if (!VALID_CATEGORIES.has(item.category)) {
      return false;
    }
    
    return true;
  });

  // Special condiment handling: only keep if it's the only detected item
  const hasCondiments = filtered.some(item => 
    CONDIMENT_KEYWORDS.has(item.name.toLowerCase())
  );
  
  if (hasCondiments && filtered.length > 1) {
    filtered = filtered.filter(item => 
      !CONDIMENT_KEYWORDS.has(item.name.toLowerCase())
    );
  }

  return filtered;
}

function convertGptToItems(gptResult: GptVisionResult): DetectedItem[] {
  return gptResult.names.map(name => ({
    name: name.toLowerCase().trim(),
    category: 'other' as const, // GPT should provide category, fallback to 'other'
    confidence: 0.8, // Default confidence for GPT results
    source: 'gpt' as const
  }));
}

function convertVisionToItems(visionResult: VisionV1Result): DetectedItem[] {
  return visionResult.foods.map(food => ({
    name: food.name.toLowerCase().trim(),
    category: 'other' as const, // Vision doesn't provide category, infer from name
    confidence: food.score || 0.7,
    source: 'vision' as const
  }));
}

export async function detectGptFirst(base64: string, timeout = 8000): Promise<GptFirstResult> {
  let gptResult: GptVisionResult | undefined;
  let visionResult: VisionV1Result | undefined;
  let gptSuccess = false;
  let gptTimeout = false;
  let gptEmpty = false;
  let gptLowConfidence = false;
  let fallbackUsed = false;

  // Step 1: Try GPT detection first with timeout
  try {
    console.log('[GPT-FIRST] Starting GPT detection...');
    
    const gptPromise = detectFoodGptV(base64);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('GPT_TIMEOUT')), timeout)
    );
    
    gptResult = await Promise.race([gptPromise, timeoutPromise]);
    
    // Check if GPT result is usable
    if (!gptResult.names || gptResult.names.length === 0) {
      gptEmpty = true;
      console.log('[GPT-FIRST] GPT returned empty result, using Vision fallback');
    } else {
      const avgConfidence = 0.8; // GPT doesn't provide confidence, assume good
      if (avgConfidence < 0.5) {
        gptLowConfidence = true;
        console.log('[GPT-FIRST] GPT low confidence, using Vision fallback');
      } else {
        gptSuccess = true;
        console.log('[GPT-FIRST] GPT detection successful:', gptResult.names);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'GPT_TIMEOUT') {
      gptTimeout = true;
      console.log('[GPT-FIRST] GPT timeout, using Vision fallback');
    } else {
      console.log('[GPT-FIRST] GPT error:', error, 'using Vision fallback');
    }
  }

  // Step 2: Use Vision fallback if GPT failed/empty/low confidence
  if (!gptSuccess) {
    fallbackUsed = true;
    console.log('[GPT-FIRST] Running Vision fallback...');
    try {
      visionResult = await detectFoodVisionV1(base64);
      console.log('[GPT-FIRST] Vision fallback completed:', visionResult.foods.length, 'items');
    } catch (error) {
      console.error('[GPT-FIRST] Vision fallback failed:', error);
      visionResult = { foods: [], objects: [], labels: [], chosen: 'none', plateBBox: null, imageWH: null };
    }
  }

  // Step 3: Convert results to standardized format
  let items: DetectedItem[] = [];
  let source: 'gpt' | 'vision' | 'hybrid' = 'gpt';

  if (gptSuccess && gptResult) {
    items = convertGptToItems(gptResult);
    source = 'gpt';
  } else if (visionResult) {
    items = convertVisionToItems(visionResult);
    source = 'vision';
  }

  // Step 4: Apply filtering
  const originalCount = items.length;
  const filteredItems = filterDetectedItems(items);
  const filteredCount = originalCount - filteredItems.length;

  // Log filtered items for debugging
  if (filteredCount > 0) {
    const rejected = items.filter(item => !filteredItems.includes(item));
    console.log('[REPORT][V2][FILTERED]', rejected.map(r => r.name));
  }

  // Step 5: Log telemetry
  const telemetry = {
    source,
    gptSuccess,
    gptTimeout,
    gptEmpty,
    gptLowConfidence,
    fallbackUsed,
    originalCount,
    filteredCount,
    finalCount: filteredItems.length
  };

  console.log('[GPT-FIRST][TELEMETRY]', telemetry);

  return {
    items: filteredItems,
    source,
    gptResult,
    visionResult,
    _debug: {
      gptSuccess,
      gptTimeout,
      gptEmpty,
      gptLowConfidence,
      fallbackUsed,
      filteredCount,
      originalCount
    }
  };
}
