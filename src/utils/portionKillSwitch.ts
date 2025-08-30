/**
 * Emergency Kill Switch for Portion Detection
 * Provides immediate local override capabilities
 */

/**
 * Emergency disable function for production issues
 * Can be called from browser console or used programmatically
 */
export function emergencyDisablePortions(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portion_detection_enabled', 'false');
      console.info('🚨 [EMERGENCY] Portion detection disabled locally');
      console.info('Reload the page for changes to take effect');
      console.info('To re-enable: localStorage.removeItem("portion_detection_enabled")');
    }
  } catch (error) {
    console.error('Failed to disable portion detection:', error);
  }
}

/**
 * Re-enable portion detection
 */
export function enablePortions(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('portion_detection_enabled');
      console.info('✅ [RECOVERY] Portion detection re-enabled');
      console.info('Reload the page for changes to take effect');
    }
  } catch (error) {
    console.error('Failed to enable portion detection:', error);
  }
}

/**
 * Check current portion detection status
 */
export function checkPortionStatus(): {
  locallyDisabled: boolean;
  urlOverride: boolean;
  canRecover: boolean;
} {
  let locallyDisabled = false;
  let urlOverride = false;

  try {
    if (typeof window !== 'undefined') {
      // Check localStorage override
      locallyDisabled = localStorage.getItem('portion_detection_enabled') === 'false';
      
      // Check URL override
      const urlParams = new URLSearchParams(window.location.search);
      urlOverride = urlParams.get('portionOff') === '1';
    }
  } catch (error) {
    console.warn('Failed to check portion status:', error);
  }

  return {
    locallyDisabled,
    urlOverride,
    canRecover: locallyDisabled && !urlOverride
  };
}

// Make functions available globally for emergency use
if (typeof window !== 'undefined') {
  (window as any).emergencyDisablePortions = emergencyDisablePortions;
  (window as any).enablePortions = enablePortions;
  (window as any).checkPortionStatus = checkPortionStatus;
}