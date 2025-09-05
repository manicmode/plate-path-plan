// Verification utility for camera teardown testing
export function verifyCameraTeardown() {
  if (typeof window === 'undefined') return { error: 'SSR environment' };
  
  const videos = [...document.querySelectorAll('video')];
  const activeStreams = videos.map(v => {
    const stream = (v as HTMLVideoElement).srcObject as MediaStream | null;
    return {
      paused: v.paused,
      hasSrcObject: !!stream,
      tracks: stream?.getTracks?.()?.map(t => ({
        id: t.id.substring(0, 8),
        kind: t.kind,
        readyState: t.readyState
      })) || []
    };
  });
  
  const liveTracks = activeStreams.flatMap(s => s.tracks).filter(t => t.readyState === 'live');
  
  console.log('[VERIFY][TRACKS]', { 
    videoCount: videos.length, 
    activeTracks: liveTracks.length, 
    streams: activeStreams 
  });
  
  return {
    videoCount: videos.length,
    activeTracks: liveTracks.length,
    allPaused: activeStreams.every(s => s.paused),
    allDetached: activeStreams.every(s => !s.hasSrcObject),
    success: liveTracks.length === 0
  };
}

// Install global verification
if (typeof window !== 'undefined') {
  (window as any).verifyCameraTeardown = verifyCameraTeardown;
}