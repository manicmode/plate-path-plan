/**
 * Development logging utility for camera investigation
 * Gates all camera debug logs behind feature flags
 */

// Rate limiting for noisy logs
const rateLimits = new Map<string, number>();

export function devLog(tag: string, ...args: any[]) {
  // Hard gate: must be explicitly enabled AND not disabled
  if (!(window as any).__cam_inq_enable === true) return;
  if ((window as any).__trace_disable === true) return;
  
  // Rate limiting for specific tags (prevent loops)
  const now = Date.now();
  const lastLog = rateLimits.get(tag) || 0;
  if (tag.includes('[READY]') || tag.includes('[DECODE]') || tag.includes('[TICK]')) {
    if (now - lastLog < 1000) return; // Max 1/sec for noisy tags
    rateLimits.set(tag, now);
  }
  
  console.log(`[${tag}]`, ...args);
}

// Initialize state - disabled by default
if (typeof window !== 'undefined') {
  // Only enable if ?camInq=1 is present
  const urlParams = new URLSearchParams(window.location.search);
  (window as any).__cam_inq_enable = urlParams.get('camInq') === '1';
}