import { camHardStop, camRegister, camGetCurrent, camGetRefs } from '@/lib/camera/guardian';

// Debug helpers
function camDump() {
  const current = camGetCurrent();
  const refs = camGetRefs();
  const activeTracks = current?.getTracks().filter(t => t.readyState === 'live') || [];
  
  console.group('[CAM][DUMP]');
  console.log('Current stream:', !!current);
  console.log('Ref count:', refs);
  console.log('Active tracks:', activeTracks.map(t => `${t.kind}:${t.readyState}`));
  console.groupEnd();
  
  return {
    hasStream: !!current,
    refs,
    activeTracks: activeTracks.length
  };
}

function testCameraGuardian() {
  const md = navigator.mediaDevices as any;
  const isWired = md.getUserMedia.__wired === true;
  const dump = camDump();
  
  console.group('[CAM][TEST]');
  console.log('Guardian wired:', isWired);
  console.log('Current state:', dump);
  console.groupEnd();
  
  return {
    wired: isWired,
    ...dump
  };
}

export function installCameraGuardianWire() {
  if (typeof window === 'undefined') return;
  
  const md = navigator.mediaDevices as any;
  if (md.getUserMedia.__wired) return;

  const orig = md.getUserMedia.bind(md);
  md.getUserMedia = async (constraints: MediaStreamConstraints) => {
    const s: MediaStream = await orig(constraints);
    // Tag every stream that enters the app
    camRegister(s, { 
      constraints, 
      ownerHint: new Error().stack?.split('\n')[2]?.trim() ?? 'unknown' 
    });
    return s;
  };
  md.getUserMedia.__orig = orig;
  md.getUserMedia.__wired = true;

  // Route & visibility hard-stops (belt + suspenders) - removed aggressive blur
  window.addEventListener('pagehide', () => camHardStop('pagehide'));

  // Dev helpers (always available but logged conditionally)
  (window as any).__camDump = camDump;
  (window as any).__testCameraGuardian = testCameraGuardian;
  (window as any).__camHardStop = camHardStop;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[CAM][WIRE] Guardian wire installed - all getUserMedia calls are now tracked');
  }
}