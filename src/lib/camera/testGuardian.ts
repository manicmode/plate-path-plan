// Test function to verify camera guardian is working
import { camGetCurrent, camGetRefs } from '@/lib/camera/guardian';

export function testCameraGuardian() {
  console.group('[CAM][GUARDIAN] Test Results');
  
  // Check if wire is installed
  const md = navigator.mediaDevices as any;
  const isWired = md.getUserMedia.__wired === true;
  console.log('✓ Guardian wire installed:', isWired);
  
  // Check current state
  const current = camGetCurrent();
  const refs = camGetRefs();
  console.log('✓ Current stream:', !!current);
  console.log('✓ Ref count:', refs);
  
  // Check for active streams
  const camDump = (window as any).__camDump;
  if (camDump) {
    const dumpResult = camDump();
    console.log('✓ Dump result:', dumpResult);
  } else {
    console.log('__camDump not available (will be available after guardian wire install)');
  }
  
  // Test global access
  const stopAllVideos = (window as any).__stopAllVideos;
  const testGuardian = (window as any).__testCameraGuardian;
  const hardStop = (window as any).__camHardStop;
  
  console.log('✓ Global stopAllVideos available:', !!stopAllVideos);
  console.log('✓ Global testCameraGuardian available:', !!testGuardian);
  console.log('✓ Global camHardStop available:', !!hardStop);
  
  console.groupEnd();
  
  return {
    guardianWired: isWired,
    hasCurrentStream: !!current,
    refCount: refs,
    globalStopAvailable: !!stopAllVideos,
    globalTestAvailable: !!testGuardian,
    globalHardStopAvailable: !!hardStop
  };
}

// Make it globally accessible for testing
if (typeof window !== 'undefined') {
  (window as any).__testCameraGuardian = testCameraGuardian;
}