/**
 * Camera stream debugging utility for investigation
 */

export function installCamDump() {
  if (typeof window === 'undefined') return;
  
  (window as any).__camDump = () => {
    const liveStreams: Array<{
      id: string;
      tracks: Array<{
        kind: string;
        label: string;
        readyState: string;
        enabled: boolean;
      }>;
    }> = [];
    
    // Find all video elements with active streams
    const videos = document.querySelectorAll('video');
    videos.forEach((video, index) => {
      const stream = (video as any).srcObject as MediaStream;
      if (stream && stream.getTracks().length > 0) {
        liveStreams.push({
          id: `video-${index}-${stream.id?.substring(0, 8) || 'unknown'}`,
          tracks: stream.getTracks().map(track => ({
            kind: track.kind,
            label: track.label?.substring(0, 20) || 'unlabeled',
            readyState: track.readyState,
            enabled: track.enabled
          }))
        });
      }
    });
    
    return {
      liveStreams,
      totalTracks: liveStreams.reduce((sum, stream) => sum + stream.tracks.length, 0),
      timestamp: Date.now()
    };
  };
  
  console.log('[CAM][DUMP] utility installed');
}