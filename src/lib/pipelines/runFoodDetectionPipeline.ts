/**
 * Shared Food Detection Pipeline
 * Used by both food logging and health report flows to ensure identical detection logic
 */
import { run as detectItems } from '@/lib/detect/router';
import { ReviewItem } from '@/components/camera/ReviewItemsScreen';

export interface FoodDetectionResult {
  items: ReviewItem[];
  imageUrl?: string;
  success: boolean;
  error?: string;
}

export async function runFoodDetectionPipeline(
  imageBase64: string, 
  context?: { mode?: string }
): Promise<FoodDetectionResult> {
  try {
    console.log('[PIPELINE] Starting food detection...');
    
    // Call the shared detection router
    const detectedItems = await detectItems(imageBase64, context);
    
    console.log('[PIPELINE] Detection complete:', detectedItems.length, 'items');
    
    // Convert to ReviewItem format
    const reviewItems: ReviewItem[] = detectedItems.map((item, index) => ({
      id: `item-${index}`,
      name: item.name,
      canonicalName: item.name,
      portion: `${item.grams}g`,
      grams: item.grams,
      selected: true,
      mapped: true,
      confidence: item.confidence,
      portionSource: item.portionSource || 'heuristic',
      portionRange: item.portionRange
    }));
    
    return {
      items: reviewItems,
      success: true
    };
  } catch (error) {
    console.error('[PIPELINE] Detection failed:', error);
    return {
      items: [],
      success: false,
      error: error instanceof Error ? error.message : 'Detection failed'
    };
  }
}