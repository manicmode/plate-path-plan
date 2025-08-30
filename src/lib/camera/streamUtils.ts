export function stopStream(stream?: MediaStream | null) {
  if (!stream) return;
  try { 
    stream.getTracks().forEach(t => { 
      try { 
        t.stop(); 
      } catch {} 
    }); 
  } catch {}
}

export function detachVideo(el?: HTMLVideoElement | null) {
  if (!el) return;
  try { 
    el.srcObject = null; 
    el.removeAttribute('srcObject'); 
  } catch {}
}