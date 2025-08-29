// Anti-spinner-hang utilities for photo health flow
export function createWatchdog(timeoutMs: number, onTimeout: () => void) {
  let resolved = false;
  
  const timer = setTimeout(() => {
    if (!resolved) {
      console.warn(`[WATCHDOG] Timeout after ${timeoutMs}ms - forcing resolution`);
      onTimeout();
    }
  }, timeoutMs);

  return {
    resolve: () => {
      resolved = true;
      clearTimeout(timer);
    },
    isResolved: () => resolved
  };
}

export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  timeoutReason: string = 'timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(timeoutReason)), timeoutMs)
    )
  ]);
}

export function safeSupabaseQuery(queryPromise: Promise<any>, fallbackData: any = { data: [], error: null }) {
  return queryPromise.catch(err => {
    console.warn('[SAFE_QUERY][POSTGREST_ERROR]', err);
    return fallbackData;
  });
}