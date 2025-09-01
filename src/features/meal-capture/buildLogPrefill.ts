/**
 * Build Log Prefill Adapter
 * Maps HealthAnalysisResult → existing Confirm flow (HTTP-only images only)
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import type { HealthAnalysisResult } from '@/components/health-check/HealthCheckModal';
import { debugLog } from './debug';

/**
 * Interface for log prefill data that matches existing confirm flow
 */
export interface LogPrefillData {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  serving_size?: string;
  quality_score?: number;
  quality_verdict?: string;
  image_url?: string;
  brand?: string;
  barcode?: string;
  confidence?: number;
}

/**
 * Maps HealthAnalysisResult to existing Confirm flow format
 * Only processes HTTP-only images (no base64 data URLs)
 */
export function buildLogPrefill(result: HealthAnalysisResult, imageUrl?: string): LogPrefillData {
  debugLog('Building log prefill from health analysis', { 
    itemName: result.itemName,
    hasImageUrl: !!imageUrl,
    isHttpImage: imageUrl && !imageUrl.startsWith('data:')
  });
  
  // Extract name using multiple possible fields
  const name = result.productName || result.title || result.itemName || 'Unknown Food';
  
  // Extract nutrition data with defaults
  const nutrition = result.nutritionData || {};
  
  // Only include HTTP image URLs, not base64 data URLs
  const processedImageUrl = imageUrl && !imageUrl.startsWith('data:') ? imageUrl : undefined;
  
  const prefillData: LogPrefillData = {
    name,
    calories: Math.round(nutrition.calories || 0),
    protein: Number(nutrition.protein || 0),
    carbs: Number(nutrition.carbs || 0),
    fat: Number(nutrition.fat || 0),
    fiber: Number(nutrition.fiber || 0),
    sugar: Number(nutrition.sugar || 0),
    sodium: Number(nutrition.sodium || 0),
    serving_size: undefined, // Not available in current HealthAnalysisResult interface
    quality_score: Math.round((result.healthScore || 0) * 10), // Convert 0-10 to 0-100
    quality_verdict: result.overallRating || 'unknown',
    image_url: processedImageUrl,
    brand: undefined, // Not available in current HealthAnalysisResult interface
    barcode: undefined, // Not available in current HealthAnalysisResult interface
    confidence: 0.8 // Default confidence for meal capture flow
  };
  
  debugLog('Built log prefill data', {
    name: prefillData.name,
    calories: prefillData.calories,
    hasImage: !!prefillData.image_url,
    quality: prefillData.quality_verdict
  });
  
  return prefillData;
}