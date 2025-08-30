// Camera feature flags for testing and rollback
export const getCameraFeatureFlags = () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    // Guardian flags
    guardianLegacyOff: urlParams.get('guardianFix') !== '0', // Default ON, disable with ?guardianFix=0
    scannerStickyMount: urlParams.get('stickyMount') !== '0', // Default ON, disable with ?stickyMount=0  
    scannerVideoFix: urlParams.get('videoFix') === '1', // Default OFF, enable with ?videoFix=1
    
    // Debug flags
    camInquiry: urlParams.get('camInq') === '1',
  };
};

// Set global flags for legacy guardian and components
if (typeof window !== 'undefined') {
  const flags = getCameraFeatureFlags();
  (window as any).__guardianLegacyOff = flags.guardianLegacyOff;
  (window as any).__scannerStickyMount = flags.scannerStickyMount;
  (window as any).__scannerVideoFix = flags.scannerVideoFix;
}