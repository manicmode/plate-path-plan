/**
 * App Version Configuration
 * Increment BUILD_NUMBER when deploying new features to trigger PWA cache refresh
 */

export const APP_VERSION = {
  MAJOR: 2,
  MINOR: 1,
  PATCH: 0,
  BUILD_NUMBER: 20250107001, // GPT-5 Migration Build
  get FULL() {
    return `${this.MAJOR}.${this.MINOR}.${this.PATCH}.${this.BUILD_NUMBER}`;
  }
};

export const FEATURES = {
  GPT5_BACKEND: true,
  SMART_FOOD_ANALYZER: true,
  VISION_DETECTION: true,
  VOICE_LOGGING: true
};

console.log('🚀 App Version:', APP_VERSION.FULL, 'Features:', FEATURES);

// Expose globally for verification
declare global {
  interface Window {
    APP_VERSION: typeof APP_VERSION;
    FEATURES: typeof FEATURES;
  }
}

if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
  window.FEATURES = FEATURES;
}