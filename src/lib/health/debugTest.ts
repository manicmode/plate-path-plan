// Quick debug test to verify environment variables are loaded
export function verifyDebugFlags() {
  const healthDebug = import.meta.env.VITE_HEALTH_DEBUG_SAFE === 'true';
  const perfDebug = import.meta.env.VITE_DEBUG_PERF === 'true';
  
  console.group('[HEALTH][DEBUG] Environment Check');
  console.log('🔧 VITE_HEALTH_DEBUG_SAFE:', healthDebug ? '✅ enabled' : '❌ disabled');
  console.log('🔧 VITE_DEBUG_PERF:', perfDebug ? '✅ enabled' : '❌ disabled');
  console.log('🔧 DEV mode:', import.meta.env.DEV ? '✅ yes' : '❌ no');
  console.groupEnd();
  
  return { healthDebug, perfDebug };
}

// Auto-run on import in development
if (import.meta.env.DEV) {
  verifyDebugFlags();
}