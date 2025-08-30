// Performance-aware logging with trace guards
// Default OFF in production to prevent console spam

declare global {
  interface Window {
    __trace_disable?: boolean;
    __flags?: any;
  }
}

// Initialize trace disable by default (can be overridden)
if (typeof window !== 'undefined' && window.__trace_disable === undefined) {
  window.__trace_disable = true;
}

export function trace(id: string, data?: any) {
  if (typeof window !== 'undefined' && window.__trace_disable) return;
  console.log('[TRACE]', id, data || '');
}

export function mark(id: string, data?: any) {
  if (typeof window !== 'undefined' && window.__trace_disable) return;
  console.log('[PERF]', id, data || '');
}

export function logInfo(id: string, data?: any) {
  if (typeof window !== 'undefined' && window.__trace_disable) return;
  console.info(`[${id}]`, data || '');
}

export function logWarn(id: string, data?: any) {
  // Always show warnings
  console.warn(`[${id}]`, data || '');
}

export function logError(id: string, data?: any) {
  // Always show errors
  console.error(`[${id}]`, data || '');
}

// Enable/disable logging at runtime
export function enableTracing() {
  if (typeof window !== 'undefined') {
    window.__trace_disable = false;
  }
}

export function disableTracing() {
  if (typeof window !== 'undefined') {
    window.__trace_disable = true;
  }
}