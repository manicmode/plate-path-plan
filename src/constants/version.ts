/**
 * App Version Configuration
 * Increment BUILD_NUMBER when deploying new features to trigger PWA cache refresh
 */

export const APP_VERSION = {
  MAJOR: 2,
  MINOR: 1,
  PATCH: 0,
  BUILD_NUMBER: 20250107003, // GPT-5 Final Flip - E2E Testing
  get FULL() {
    return `${this.MAJOR}.${this.MINOR}.${this.PATCH}.${this.BUILD_NUMBER}`;
  }
};

// Legacy flags removed. Use src/constants/flags.ts for feature flags.
console.log('🚀 App Version:', APP_VERSION.FULL);

// Expose version globally for verification
declare global {
  interface Window {
    APP_VERSION: typeof APP_VERSION;
  }
}

if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
}
