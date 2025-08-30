/**
 * Safe Portion Detection with Error Boundaries
 * Hardened version that never crashes the app
 */

import { isPortionDetectionEnabled } from '@/lib/health/reportFlags';
import { parsePortionGrams, type PortionInfo } from './portionCalculator';
import { getUserPortionPreference } from './userPortionPrefs';

// Safe fallback that always works
const SAFE_FALLBACK: PortionInfo = {
  grams: 30,
  isEstimated: true,
  source: 'estimated' as const,
  confidence: 0,
  display: '30g'
};

/**
 * Safe portion detection with comprehensive error handling
 * Never throws, always returns a valid PortionInfo
 */
export async function detectPortionSafe(
  productData?: any,
  ocrText?: string,
  entry: string = 'unknown'
): Promise<PortionInfo> {
  let detectionState = {
    enabled: false,
    reason: 'unknown',
    urlOverride: false
  };

  try {
    // Log boot telemetry
    detectionState = await isPortionDetectionEnabled();
    console.info('[REPORT][V2][PORTION][BOOT]', { 
      enabled: detectionState.enabled, 
      urlOverride: detectionState.urlOverride, 
      entry,
      reason: detectionState.reason
    });

    // If disabled, return safe fallback immediately
    if (!detectionState.enabled) {
      console.info('[REPORT][V2][PORTION]', { 
        grams: SAFE_FALLBACK.grams, 
        source: SAFE_FALLBACK.source, 
        confidence: SAFE_FALLBACK.confidence,
        disabled: true,
        reason: detectionState.reason
      });
      return SAFE_FALLBACK;
    }

    // Try user preference first (with timeout)
    let userPref = null;
    try {
      const prefPromise = getUserPortionPreference(productData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      userPref = await Promise.race([prefPromise, timeoutPromise]);
    } catch (error) {
      console.warn('[REPORT][V2][PORTION][ERROR]', { 
        stage: 'user_pref', 
        message: error.message 
      });
      // Continue without user preference
    }

    // Parse portion with comprehensive error handling
    let portionInfo: PortionInfo;
    try {
      portionInfo = parsePortionGrams(
        productData,
        ocrText,
        userPref ? { grams: userPref.portionGrams, display: userPref.portionDisplay } : undefined
      );
      
      // Validate the result
      if (!portionInfo || typeof portionInfo.grams !== 'number' || portionInfo.grams < 1) {
        throw new Error('Invalid portion info returned');
      }
      
      // Clamp to safe bounds (5-250g)
      if (portionInfo.grams < 5 || portionInfo.grams > 250) {
        portionInfo.grams = Math.max(5, Math.min(250, portionInfo.grams));
        portionInfo.isEstimated = true;
      }
      
    } catch (error) {
      console.warn('[REPORT][V2][PORTION][ERROR]', { 
        stage: 'parsing', 
        message: error.message 
      });
      portionInfo = SAFE_FALLBACK;
    }

    // Log successful detection
    console.info('[REPORT][V2][PORTION]', { 
      grams: portionInfo.grams, 
      source: portionInfo.source, 
      confidence: portionInfo.confidence,
      entry
    });

    return portionInfo;

  } catch (error) {
    // Ultimate safety net
    console.error('[REPORT][V2][PORTION][ERROR]', { 
      stage: 'critical_failure', 
      message: error.message,
      enabled: detectionState.enabled
    });
    
    return SAFE_FALLBACK;
  }
}

/**
 * Synchronous portion info getter for render contexts
 * Returns cached or fallback values, never async
 */
export function getPortionInfoSync(cached?: PortionInfo): PortionInfo {
  if (cached && typeof cached.grams === 'number' && cached.grams > 0) {
    return cached;
  }
  return SAFE_FALLBACK;
}

/**
 * Safe portion display formatter
 */
export function formatPortionDisplay(portionInfo: PortionInfo): string {
  const info = getPortionInfoSync(portionInfo);
  const sourceLabel = getSourceLabel(info.source);
  return `${info.grams}g · ${sourceLabel}`;
}

/**
 * Get human-readable source label
 */
function getSourceLabel(source: string): string {
  const labels = {
    'user_set': 'Your setting',
    'ocr_declared': 'OCR',
    'db_declared': 'DB',
    'ocr_inferred_ratio': 'Calculated',
    'model_estimate': 'Estimated',
    'fallback_default': 'est.',
    'estimated': 'est.'
  };
  return labels[source] || 'est.';
}