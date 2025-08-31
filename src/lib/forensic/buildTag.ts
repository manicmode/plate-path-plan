/**
 * Forensic build tag for 30g portion enforcement investigation
 */

export const __BUILD_ID__ = '2025-08-30T18:55Z-forensic';

export function logBuildInfo(component: string, variant?: string) {
  console.debug('[FORENSIC][BUILD]', { 
    component, 
    variant, 
    build: __BUILD_ID__,
    timestamp: new Date().toISOString()
  });
}