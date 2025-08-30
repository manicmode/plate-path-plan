/**
 * Script to ship Health Report V2 globally
 * Run this in console to immediately activate global V2 rollout
 */

import { shipV2Globally, clearDeviceOverrides, getCacheStatus } from '@/lib/health/reportFlags';

// Make functions globally available for console use
(window as any).shipV2Globally = shipV2Globally;
(window as any).clearDeviceOverrides = clearDeviceOverrides;
(window as any).getCacheStatus = getCacheStatus;

// Auto-execute global rollout on script load
if (typeof window !== 'undefined') {
  console.log('🚀 Health Report V2 - Global Rollout Script Loaded');
  console.log('Available functions:');
  console.log('- shipV2Globally(): Enable V2 for all users globally');
  console.log('- clearDeviceOverrides(): Remove any local V2 overrides');
  console.log('- getCacheStatus(): Check current flag cache status');
  
  // Immediately ship V2 globally
  shipV2Globally();
}

export { shipV2Globally, clearDeviceOverrides, getCacheStatus };