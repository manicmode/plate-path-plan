// Test function to verify camera guardian is working
export function testCameraGuardian() {
  console.group('[CAM][GUARDIAN] Test Results');
  
  // Check if wire is installed
  const md = navigator.mediaDevices as any;
  const isWired = md.getUserMedia.__wired === true;
  console.log('✓ Guardian wire installed:', isWired);
  
  // Check for active streams (should be empty after close)
  const camDump = (window as any).__camDump;
  if (camDump) {
    camDump();
  } else {
    console.log('__camDump not available (camera diagnostic not enabled)');
  }
  
  // Test global access
  const stopAllVideos = (window as any).__stopAllVideos;
  console.log('✓ Global stopAllVideos available:', !!stopAllVideos);
  
  console.groupEnd();
  
  return {
    guardianWired: isWired,
    globalStopAvailable: !!stopAllVideos,
    diagnosticsAvailable: !!camDump
  };
}

// Make it globally accessible for testing
if (typeof window !== 'undefined') {
  (window as any).__testCameraGuardian = testCameraGuardian;
}