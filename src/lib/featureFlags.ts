/**
 * Feature flags for controlling experimental features
 */

// Base feature flags (production defaults)
export const FEATURE_FLAGS = {
  photo_meal_ui_v1: false, // Enable branded candidates list in health check modal (gradual rollout)
  image_analyzer_v1: false, // Enable enhanced image analysis pipeline (DISABLED for production until proven stable)
  photo_encoder_v1: true, // Enable optimized photo encoding for analysis (safe to enable)
  fallback_text_enabled: true, // Enable manual text search fallback
  fallback_voice_enabled: true, // Enable voice-to-text search fallback
  voice_stt_server_enabled: false, // Enable server-side STT (vs browser WebKit)
  scan_hub_enabled: true, // Enable by default for this demo // Enable the new Scan Hub entry page (default OFF)
  voice_analyze_v2: false, // Enable enhanced voice analysis pipeline (DEFAULT OFF)
  photo_unified_pipeline: true, // Unified photo pipeline (uses enhanced-health-scanner, prevents barcode scanner mount)
  
  // Enhanced Health Report Features (STANDALONE ONLY FOR PHASED ROLLOUT)
  health_report_v2_enabled: true, // ENABLED - V2 active for standalone route only
  nutrition_toggle_enabled: true, // Enable per 100g ↔ per portion toggle
  flags_tab_enabled: true, // Enable flags tab with severity and actions
  save_tab_enabled: true, // Enable save tab to persist reports
  smart_suggestions_enabled: true, // Enable personalized suggestions
  
  // Meal Capture Feature (SANDBOX MODE)
  meal_capture_enabled: false, // Enable meal-only photo capture with multi-item detection
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
  
  // Meal capture feature - controlled by env var or URL query
  if (flag === 'meal_capture_enabled') {
    // Check URL query param first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('meal') === '1') {
      return true;
    }
    
    // Check environment variable
    const envFlag = import.meta.env.VITE_MEAL_CAPTURE_ENABLED;
    if (envFlag === '1' || envFlag === 'true') {
      return true;
    }
    
    return FEATURE_FLAGS[flag];
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