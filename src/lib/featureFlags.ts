/**
 * Feature flags for controlling experimental features
 */

// Base feature flags (production defaults)
export const FEATURE_FLAGS = {
  photo_meal_ui_v1: false, // Enable branded candidates list in health check modal (gradual rollout)
  image_analyzer_v1: false, // Enable enhanced image analysis pipeline (DISABLED for production until proven stable)
  photo_encoder_v1: true, // Enable optimized photo encoding for analysis (safe to enable)
  
  // Kill switch for analyzer (immediate production control)
  ANALYZER_ENABLED: false, // ❌ DISABLED - stops all image-analyzer logic in prod
  ANALYZER_FORCE_DEBUG: true, // ✅ ENABLED - debug routes bypass ANALYZER_ENABLED flag
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// Environment detection
function isStaging(): boolean {
  // Check if we're in staging environment
  return window.location.hostname.includes('staging') || 
         window.location.hostname.includes('lovable.app') ||
         process.env.NODE_ENV === 'development';
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Environment-specific overrides
  if (flag === 'image_analyzer_v1') {
    return isStaging() ? ROLLOUT_CONFIG.image_analyzer_staging : ROLLOUT_CONFIG.image_analyzer_production;
  }
  
  return FEATURE_FLAGS[flag];
}

// Rollout configuration
export const ROLLOUT_CONFIG = {
  // Phase 1: Basic adapter improvements (safe to ship immediately)
  phase1_ready: true,
  
  // Phase 2-3: Image analysis improvements (enable on staging first)
  image_analyzer_staging: true, // ✅ ENABLED for staging
  image_analyzer_production: false, // ❌ DISABLED for production (until proven stable)
  
  // Phase 4: Candidate selection UI (gradual rollout percentage)
  candidate_ui_rollout_percentage: 0, // Start at 0%, gradually increase
  
  // Platform-specific flags for testing
  mobile_testing: {
    android: false,
    ios: false
  }
};

// Helper to check rollout percentage
export function isInRollout(flag: FeatureFlag, userId?: string): boolean {
  if (!isFeatureEnabled(flag)) return false;
  
  if (flag === 'photo_meal_ui_v1') {
    if (!userId) return false;
    
    // Simple hash-based rollout
    const hash = simpleHash(userId);
    const percentage = ROLLOUT_CONFIG.candidate_ui_rollout_percentage;
    return (hash % 100) < percentage;
  }
  
  return true;
}

// Simple hash function for consistent user assignment
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Legacy exports for compatibility
export const ARENA_DEBUG_CONTROLS = true;
export const BARCODE_V2 = true;