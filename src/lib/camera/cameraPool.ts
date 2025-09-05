// Tracks any MediaStreams opened anywhere (DOM or off-DOM) so we can kill all.
export class CameraPool {
  private entries = new Set<MediaStream>();

  add(stream: MediaStream) {
    this.entries.add(stream);
    return () => this.entries.delete(stream); // unregister
  }

  stopAll(reason = 'unknown') {
    let stopped = 0;
    for (const s of this.entries) {
      try {
        s.getTracks().forEach(t => { try { t.stop(); stopped++; } catch {} });
      } catch {}
    }
    this.entries.clear();
    console.log('[CAMERA][POOL][STOP_ALL]', { reason, stopped });
  }
}

export const cameraPool = new CameraPool();