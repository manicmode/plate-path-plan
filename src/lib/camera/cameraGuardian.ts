import { stopStream, detachVideo } from './streamUtils';

// Legacy Guardian - enhanced with debugging and safety checks
if (typeof window !== 'undefined') {
  let isAcquiring = false;
  let debounceTimer: any = null;
  
  const hardStop = (reason: string) => {
    // Feature flag to disable legacy guardian
    if ((window as any).__guardianLegacyOff !== false) {
      console.log('[CAM][LEGACY] Guardian disabled by flag');
      return;
    }
    
    // Enhanced logging for investigation
    const ownerCount = (window as any).__guardianOwnerCount || 0;
    console.warn('[CAM][GUARD][LEGACY] HARD STOP', { 
      reason, 
      owners: ownerCount, 
      currentStream: document.querySelectorAll('video[src]').length > 0 
    });
    
    document.querySelectorAll('video').forEach(v => {
      const s = (v as HTMLVideoElement).srcObject as MediaStream | null;
      stopStream(s);
      detachVideo(v as HTMLVideoElement);
    });
  };

  // Feature flag to disable guardian (for rollback)
  const guardianSafeVisibility = window.location.search.includes('guardianFix=0') ? false : true;

  window.addEventListener('pagehide', () => hardStop('pagehide'));
  
  if (guardianSafeVisibility) {
    // Debounced, owner-aware visibilitychange
    document.addEventListener('visibilitychange', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const ownerCount = (window as any).__guardianOwnerCount || 0;
        if (document.visibilityState !== 'visible' && ownerCount === 0 && !isAcquiring) {
          hardStop('visibilitychange');
        }
      }, 250);
    });
  } else {
    // Original aggressive behavior (for rollback testing)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        hardStop('visibilitychange');
      }
    });
  }
  
  // Track acquisition state (set by guardian.ts)
  (window as any).__setGuardianAcquiring = (acquiring: boolean) => {
    isAcquiring = acquiring;
  };
}