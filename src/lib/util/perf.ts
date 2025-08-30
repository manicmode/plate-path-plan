export function mark(id: string, data?: any) {
  if (!window.__trace_disable) {
    console.log('[PERF]', id, data || '');
  }
}

export function wrap<T extends (...a: any) => any>(id: string, fn: T): T {
  return ((...args: any) => {
    const t = performance.now();
    const r = fn(...args);
    Promise.resolve(r).finally(() => 
      mark(id, { dt: (performance.now() - t).toFixed(1) })
    );
    return r;
  }) as T;
}

// Global performance helpers
declare global {
  interface Window {
    __trace_disable?: boolean;
    __flags?: any;
    __emergencyDisablePortions?: () => void;
    __emergencyDisablePortionsActive?: boolean;
  }
}

// Set trace disable by default
if (typeof window !== 'undefined') {
  window.__trace_disable = true;
}