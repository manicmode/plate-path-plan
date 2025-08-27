/**
 * Feature flags for controlling experimental features
 */

export const FEATURE_FLAGS = {
  photo_meal_ui_v1: false, // Enable branded candidates list in health check modal (gradual rollout)
  image_analyzer_v1: false, // Enable enhanced image analysis pipeline (DISABLED for safety until probe is green)
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

// Rollout configuration
export const ROLLOUT_CONFIG = {
  // Phase 1: Basic adapter improvements (safe to ship immediately)
  phase1_ready: true,
  
  // Phase 2-3: Image analysis improvements (enable on staging first)
  image_analyzer_staging: false,
  image_analyzer_production: false,
  
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