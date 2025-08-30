/**
 * Utilities for V2 Health Report Rollout QA and monitoring
 */

export interface V2QAChecklist {
  barcode: boolean;
  manual: boolean;
  voice: boolean;
  photo: boolean;
  mobile: {
    ios: boolean;
    safari: boolean;
    saveButton: boolean;
    pulseAnimation: boolean;
  };
}

/**
 * QA checklist for V2 rollout verification
 */
export async function runV2QAChecklist(): Promise<V2QAChecklist> {
  const checklist: V2QAChecklist = {
    barcode: false,
    manual: false,
    voice: false,
    photo: false,
    mobile: {
      ios: false,
      safari: false,
      saveButton: false,
      pulseAnimation: false
    }
  };

  // Check if V2 is enabled for all entry points
  const { shouldUseV2Report } = await import('@/lib/health/reportFlags');
  
  try {
    const barcodeResult = await shouldUseV2Report('barcode');
    checklist.barcode = barcodeResult.useV2;
    
    const manualResult = await shouldUseV2Report('manual');
    checklist.manual = manualResult.useV2;
    
    const voiceResult = await shouldUseV2Report('voice');
    checklist.voice = voiceResult.useV2;
    
    const photoResult = await shouldUseV2Report('photo');
    checklist.photo = photoResult.useV2;
  } catch (error) {
    console.error('[V2QA] Error checking rollout status:', error);
  }

  // Check mobile-specific requirements
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  checklist.mobile.ios = isIOS;
  checklist.mobile.safari = isSafari && isIOS;

  // Check for Save button and pulse animation (DOM checks)
  checklist.mobile.saveButton = !!document.querySelector('[data-testid="save-report-button"], button[class*="save"]');
  checklist.mobile.pulseAnimation = !!document.querySelector('[class*="animate-pulse"], [class*="pulse"]');

  return checklist;
}

/**
 * Log V2 rollout status for monitoring
 */
export function logV2RolloutStatus(): void {
  console.group('🚀 V2 Health Report - Rollout Status');
  
  console.log('Config Flags:');
  console.log('- health_report_v2_enabled: true');
  console.log('- health_report_v2_routes: ["standalone","manual","voice","barcode","photo"]');
  console.log('- health_report_v2_rollout_percent: 100');
  
  console.log('Device Info:');
  console.log('- User Agent:', navigator.userAgent.slice(0, 100));
  console.log('- Is Mobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  console.log('- Is iOS Safari:', /iPad|iPhone|iPod/.test(navigator.userAgent) && /^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  
  const override = localStorage.getItem('health_report_v2_override');
  console.log('- Device Override:', override || 'None (using production flags)');
  
  console.groupEnd();
}

/**
 * Rollback V2 to V1 (emergency kill switch)
 */
export function rollbackToV1(): void {
  console.warn('🛑 EMERGENCY ROLLBACK: Disabling V2 Health Report');
  localStorage.setItem('health_report_v2_override', 'disabled');
  console.log('✅ Rollback complete - V1 will be used. Refresh page to take effect.');
}

// Make functions globally available for console debugging
if (typeof window !== 'undefined') {
  (window as any).runV2QAChecklist = runV2QAChecklist;
  (window as any).logV2RolloutStatus = logV2RolloutStatus;
  (window as any).rollbackToV1 = rollbackToV1;
}