export function stopMedia(el?: HTMLVideoElement | null) {
  try {
    const tracks = (el?.srcObject as MediaStream | null)?.getTracks?.() || [];
    tracks.forEach(t => t.stop());
    if (el) {
      el.pause();
      el.srcObject = null;
    }
    console.log('[CAMERA][STOP]', { tracks: tracks.map(t => t.kind) });
    console.log('[CAMERA][STOPPED]', {
      paused: el?.paused,
      srcObject: !!el?.srcObject
    });
  } catch (e) { 
    console.warn('[CAMERA][STOP][ERROR]', e); 
  }
}