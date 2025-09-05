export function stopMedia(el?: HTMLVideoElement | null) {
  try {
    const tracks = (el?.srcObject as MediaStream | null)?.getTracks?.() || [];
    tracks.forEach(t => t.stop());
    if (el) el.srcObject = null;
    console.log('[CAMERA][STOP]', { tracks: tracks.map(t => t.kind) });
  } catch (e) { 
    console.warn('[CAMERA][STOP][ERROR]', e); 
  }
}