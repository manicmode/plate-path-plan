import { devLog } from './devLog';

// Central registry + guaranteed stop regardless of owner timing
let current: MediaStream | null = null;
let refs = 0;

// Global registry for all streams (even those bypassing camAcquire)
type Reg = { s: MediaStream, ownerHint?: string };
const registry = new Set<Reg>();

// Owner tracking for smart visibilitychange handling
const owners = new Set<string>();
export const camOwnerMount = (id: string) => owners.add(id);
export const camOwnerUnmount = (id: string) => owners.delete(id);

export async function camAcquire(owner: string, constraints: MediaStreamConstraints): Promise<MediaStream> {
  // Update owner count for legacy guardian
  (window as any).__guardianOwnerCount = owners.size;
  
  // Signal to legacy guardian that we're acquiring (prevent premature stops)
  (window as any).__setGuardianAcquiring?.(true);
  
  if (!current) {
    current = await navigator.mediaDevices.getUserMedia(constraints);
  }
  refs++;
  
  // Clear acquiring state after successful acquisition
  setTimeout(() => {
    (window as any).__setGuardianAcquiring?.(false);
  }, 1500);
  
  if (process.env.NODE_ENV !== 'production') {
    devLog('CAM][GUARD] acquire', { 
      owner, 
      refs,
      tracks: current.getTracks().map(t => `${t.kind}:${t.readyState}`) 
    });
  }
  return current;
}

export function camRelease(owner: string) {
  refs = Math.max(0, refs - 1);
  
  // Update owner count for legacy guardian
  (window as any).__guardianOwnerCount = owners.size;
  
  // Clear acquiring state on release
  (window as any).__setGuardianAcquiring?.(false);
  
  if (process.env.NODE_ENV !== 'production') {
    devLog('CAM][GUARD] release', { owner, refs });
  }
  if (refs === 0 && current) {
    current.getTracks().forEach(t => { 
      try { 
        t.stop(); 
        if (process.env.NODE_ENV !== 'production') {
          devLog('CAM][GUARD] stopped track', { kind: t.kind, readyState: t.readyState });
        }
      } catch {} 
    });
    current = null;
    if (process.env.NODE_ENV !== 'production') {
      devLog('CAM][GUARD] stop_all');
    }
  }
}

export function camRegister(s: MediaStream, meta?: { ownerHint?: string; constraints?: any }) {
  registry.add({ s, ownerHint: meta?.ownerHint });
}

export function camHardStop(reason: string) {
  // Enhanced logging with owner count - gated
  const ownerCount = owners.size;
  devLog('CAM][GUARD] HARD STOP', { reason, owners: ownerCount, registrySize: registry.size, currentStream: !!current });
  
  // Stop registry streams (all getUserMedia calls)
  registry.forEach(({ s }) => {
    try { s.getTracks().forEach(t => { try { t.stop(); } catch {} }); } catch {}
  });
  registry.clear();
  
  // Stop current (camAcquire stream)
  if (current) {
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
}

export function camGetCurrent(): MediaStream | null {
  return current;
}

export function camGetRefs(): number {
  return refs;
}

// Safety on route/visibility with smart owner-aware stopping
if (typeof window !== 'undefined' && !(window as any).__cam_guard_installed) {
  (window as any).__cam_guard_installed = true;
  
  window.addEventListener('pagehide', () => camHardStop('pagehide'));
  
  // Debounced visibilitychange - only stop if no camera owners are mounted
  let visTimer: any = null;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(visTimer);
    visTimer = setTimeout(() => {
      if (document.visibilityState !== 'visible' && owners.size === 0) {
        camHardStop('visibilitychange');
      }
    }, 250);
  });
  
  // Additional safety for beforeunload
  window.addEventListener('beforeunload', () => camHardStop('beforeunload'));
}