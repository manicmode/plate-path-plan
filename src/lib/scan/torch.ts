export async function setTorch(videoEl: HTMLVideoElement, on: boolean): Promise<boolean> {
  try {
    const stream = videoEl.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks?.()[0];
    if (!track || typeof track.getCapabilities !== 'function') return false;

    const caps = track.getCapabilities() as any;
    if (!caps || !('torch' in caps) || !caps.torch) return false;

    // iOS Safari needs advanced torch constraint on the active track
    await track.applyConstraints({ advanced: [{ torch: on } as any] });
    return true;
  } catch {
    return false;
  }
}