import { stopStream, detachVideo } from './streamUtils';

// Safety hooks for global camera stream cleanup
if (typeof window !== 'undefined') {
  const hardStop = () => {
    document.querySelectorAll('video').forEach(v => {
      const s = (v as HTMLVideoElement).srcObject as MediaStream | null;
      stopStream(s);
      detachVideo(v as HTMLVideoElement);
    });
  };

  window.addEventListener('pagehide', hardStop);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      hardStop();
    }
  });
}