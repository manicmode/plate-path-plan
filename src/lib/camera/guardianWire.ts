import { camHardStop, camRegister } from '@/lib/camera/guardian';

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

  // Route & visibility hard-stops (belt + suspenders)
  window.addEventListener('pagehide', () => camHardStop('pagehide'));
  window.addEventListener('blur', () => camHardStop('window_blur')); // Desktop tab switches
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') camHardStop('visibilitychange');
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[CAM][WIRE] Guardian wire installed - all getUserMedia calls are now tracked');
  }
}