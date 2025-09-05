// Tracks any MediaStreams opened anywhere (DOM or off-DOM) so we can kill all.
export class CameraPool {
  private streams = new Set<MediaStream>();
  private tracks = new Map<string, MediaStreamTrack>();
  private streamsByGen = new Map<number, Set<MediaStream>>();

  add(stream: MediaStream, gen?: number) {
    this.streams.add(stream);
    stream.getTracks().forEach(t => {
      this.tracks.set(t.id, t);
      t.onended = () => this.tracks.delete(t.id);
    });
    
    if (gen !== undefined) {
      if (!this.streamsByGen.has(gen)) {
        this.streamsByGen.set(gen, new Set());
      }
      this.streamsByGen.get(gen)!.add(stream);
    }
    
    return () => {
      this.streams.delete(stream);
      stream.getTracks().forEach(t => this.tracks.delete(t.id));
      if (gen !== undefined) {
        this.streamsByGen.get(gen)?.delete(stream);
      }
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

  stopByGen(gen: number, reason: string = 'gen-cleanup') {
    const streams = this.streamsByGen.get(gen);
    if (!streams) return;
    
    let sCount = 0;
    let tCount = 0;
    streams.forEach(s => {
      sCount++;
      s.getTracks().forEach(t => { 
        tCount++;
        try { t.stop(); } catch {} 
        this.tracks.delete(t.id);
      });
      this.streams.delete(s);
    });
    this.streamsByGen.delete(gen);
    console.log('[CAMERA][POOL][STOP_BY_GEN]', { gen, sCount, tCount, reason });
  }

  getActiveTracks() {
    return Array.from(this.tracks.values()).filter(t => t.readyState === 'live');
  }
}

export const cameraPool = new CameraPool();