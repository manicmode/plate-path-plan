export function stopAllVideos() {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[FAILSAFE] Stopping all video elements');
  }
  
  document.querySelectorAll('video').forEach(v => {
    const video = v as HTMLVideoElement;
    const s = video.srcObject as MediaStream | null;
    
    if (s) { 
      try { 
        s.getTracks().forEach(t => {
          try {
            t.stop();
            if (process.env.NODE_ENV !== 'production') {
              console.info('[FAILSAFE] Stopped track', { kind: t.kind });
            }
          } catch {}
        }); 
      } catch {} 
    }
    
    try {
      video.srcObject = null;
    } catch {}
  });
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).__stopAllVideos = stopAllVideos;
}