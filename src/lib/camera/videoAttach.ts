export async function attachStreamToVideo(v: HTMLVideoElement, stream: MediaStream) {
  v.muted = true;
  (v as any).playsInline = true; // iOS safari
  v.srcObject = stream;

  await new Promise<void>(res => {
    const onMeta = () => { v.removeEventListener('loadedmetadata', onMeta); res(); };
    v.addEventListener('loadedmetadata', onMeta);
  });

  const tryPlay = async () => {
    try { 
      await v.play(); 
    } catch { 
      // retry next frame
      await new Promise(r => requestAnimationFrame(r)); 
      try { 
        await v.play(); 
      } catch {} 
    }
  };
  await tryPlay();
}

export function detachVideo(v?: HTMLVideoElement | null) {
  if (!v) return;
  v.pause?.();
  v.srcObject = null;
  v.removeAttribute('src');
  v.load?.();
}