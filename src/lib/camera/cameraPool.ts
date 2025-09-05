// Tracks any MediaStreams opened anywhere (DOM or off-DOM) so we can kill all.
export class CameraPool {
  private streams = new Set<MediaStream>();
  private tracks = new Map<string, MediaStreamTrack>();

  add(stream: MediaStream) {
    this.streams.add(stream);
    stream.getTracks().forEach(t => {
      this.tracks.set(t.id, t);
      t.onended = () => this.tracks.delete(t.id);
    });
    return () => {
      this.streams.delete(stream);
      stream.getTracks().forEach(t => this.tracks.delete(t.id));
    };
  }

  stopAll(reason: string) {
    const sCount = this.streams.size;
    const tCount = this.tracks.size;
    this.tracks.forEach(t => { try { t.stop(); } catch {} });
    this.streams.forEach(s => s.getTracks().forEach(t => { try { t.stop(); } catch {} }));
    this.tracks.clear();
    this.streams.clear();
    console.log('[CAMERA][POOL][STOP_ALL]', { sCount, tCount, reason });
  }

  getActiveTracks() {
    return Array.from(this.tracks.values()).filter(t => t.readyState === 'live');
  }
}

export const cameraPool = new CameraPool();