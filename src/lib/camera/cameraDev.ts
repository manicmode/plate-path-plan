// Development-only camera instrumentation
export function installCameraDev() {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;
  if (!('mediaDevices' in navigator)) return;

  const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints: any) => {
    const stack = new Error().stack?.split('\n').slice(1, 4).join(' → ') || 'unknown';
    console.log('[GUM][CALL]', { constraints, from: stack });
    const stream = await orig(constraints);
    console.log('[GUM][SUCCESS]', { trackIds: stream.getTracks().map(t => t.id) });
    return stream;
  };

  // Verification snippet
  (window as any).checkTracks = () => {
    const videos = [...document.querySelectorAll('video')];
    const active = videos.flatMap(v => ((v.srcObject || {}) as any).getTracks?.() || []).filter((t: MediaStreamTrack) => t.readyState === 'live');
    console.log('[VERIFY][TRACKS]', { videoCount: videos.length, activeTracks: active.length, ids: active.map((t: MediaStreamTrack) => t.id) });
  };

  console.log('[CAM][DEV] Instrumentation installed');
}