// Central registry + guaranteed stop regardless of owner timing
let current: MediaStream | null = null;
let refs = 0;

export async function camAcquire(owner: string, constraints: MediaStreamConstraints): Promise<MediaStream> {
  if (!current) {
    current = await navigator.mediaDevices.getUserMedia(constraints);
  }
  refs++;
  if (process.env.NODE_ENV !== 'production') {
    console.info('[CAM][GUARD] acquire', { 
      owner, 
      refs,
      tracks: current.getTracks().map(t => `${t.kind}:${t.readyState}`) 
    });
  }
  return current;
}

export function camRelease(owner: string) {
  refs = Math.max(0, refs - 1);
  if (process.env.NODE_ENV !== 'production') {
    console.info('[CAM][GUARD] release', { owner, refs });
  }
  if (refs === 0 && current) {
    current.getTracks().forEach(t => { 
      try { 
        t.stop(); 
        if (process.env.NODE_ENV !== 'production') {
          console.info('[CAM][GUARD] stopped track', { kind: t.kind, readyState: t.readyState });
        }
      } catch {} 
    });
    current = null;
    if (process.env.NODE_ENV !== 'production') {
      console.info('[CAM][GUARD] stop_all');
    }
  }
}

export function camHardStop(reason: string) {
  if (!current) return;
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[CAM][GUARD] HARD STOP', { reason });
  }
  try { 
    current.getTracks().forEach(t => { 
      try { 
        t.stop(); 
      } catch {} 
    }); 
  } catch {}
  current = null; 
  refs = 0;
}

export function camGetCurrent(): MediaStream | null {
  return current;
}

export function camGetRefs(): number {
  return refs;
}

// Safety on route/visibility
if (typeof window !== 'undefined' && !(window as any).__cam_guard_installed) {
  (window as any).__cam_guard_installed = true;
  
  window.addEventListener('pagehide', () => camHardStop('pagehide'));
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      camHardStop('visibilitychange');
    }
  });
  
  // Additional safety for beforeunload
  window.addEventListener('beforeunload', () => camHardStop('beforeunload'));
}