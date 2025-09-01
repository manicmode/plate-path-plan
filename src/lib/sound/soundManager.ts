// soundManager.ts - iOS-safe sound system with guaranteed unlock and louder fallback
export const Sound = (() => {
  let ctx: AudioContext | null = null;
  let unlocked = false;
  let lastAt = 0;
  const buffers: Record<string, AudioBuffer | null> = { shutter: null, beep: null };

  async function ensureUnlocked() {
    if (unlocked) return;
    try {
      // @ts-ignore
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();
      unlocked = true;
      
      // Try preload (non-fatal)
      try { buffers.shutter = await load("/sounds/shutter.mp3"); } catch {}
      try { buffers.beep = await load("/sounds/beep.mp3"); } catch {}
      
      console.debug("[SOUND] unlocked");
    } catch (error) {
      console.warn('[SOUND] Failed to unlock audio:', error);
    }
  }

  async function load(url: string) {
    if (!ctx) return null;
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      return await ctx.decodeAudioData(arr);
    } catch {
      return null;
    }
  }

  function throttle() { 
    const now = Date.now(); 
    if (now - lastAt < 250) return false; 
    lastAt = now; 
    return true; 
  }

  function osc(ms: number, freq: number) {
    if (!ctx) return;
    try {
      const o = ctx.createOscillator(); 
      const g = ctx.createGain();
      o.type = "square"; 
      o.frequency.value = freq;
      o.connect(g); 
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 0.02);
      o.start(); 
      o.stop(ctx.currentTime + ms/1000);
    } catch (error) {
      console.warn('[SOUND] Oscillator failed:', error);
    }
  }

  async function play(name: "shutter" | "beep") {
    if (!ctx || !unlocked || !throttle()) return;
    
    try {
      if (ctx.state === "suspended") await ctx.resume();
      
      const buf = buffers[name];
      if (buf) { 
        const src = ctx.createBufferSource(); 
        src.buffer = buf; 
        src.connect(ctx.destination); 
        src.start(0); 
      } else { 
        osc(name === "shutter" ? 180 : 220, name === "shutter" ? 900 : 1250); 
      }
      
      // Add haptic feedback backup
      try { 
        (navigator as any).vibrate?.(40); 
      } catch {}
      
      console.debug("[SOUND] played", name);
    } catch (error) {
      console.warn(`[SOUND] Failed to play ${name}:`, error);
    }
  }

  return { ensureUnlocked, play };
})();