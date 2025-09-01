// soundManager.ts - Legacy sound system with HTMLAudio first, WebAudio fallback
const shutterAudio = new Audio("/sounds/shutter.mp3");
const beepAudio = new Audio("/sounds/beep.mp3");

// Preload audio files
shutterAudio.preload = 'auto';
beepAudio.preload = 'auto';

// Legacy API functions
export function playShutter() { 
  try { 
    shutterAudio.currentTime = 0; 
    shutterAudio.play(); 
    console.debug("[SOUND] shutter click");
  } catch (error) {
    console.warn('[SOUND] HTMLAudio shutter failed, using WebAudio fallback:', error);
    WebAudioFallback.play('shutter');
  }
}

export function playBeep() { 
  try { 
    beepAudio.currentTime = 0; 
    beepAudio.play(); 
    console.debug("[SOUND] barcode analyze click");
  } catch (error) {
    console.warn('[SOUND] HTMLAudio beep failed, using WebAudio fallback:', error);
    WebAudioFallback.play('beep');
  }
}

// WebAudio fallback system for when HTMLAudio fails
const WebAudioFallback = (() => {
  let ctx: AudioContext | null = null;
  let unlocked = false;
  let lastAt = 0;

  async function ensureUnlocked() {
    if (unlocked) return;
    try {
      // @ts-ignore
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();
      unlocked = true;
      console.debug("[SOUND] WebAudio unlocked");
    } catch (error) {
      console.warn('[SOUND] Failed to unlock WebAudio:', error);
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
      console.warn('[SOUND] WebAudio oscillator failed:', error);
    }
  }

  async function play(name: "shutter" | "beep") {
    if (!throttle()) return;
    
    try {
      await ensureUnlocked();
      if (!ctx || !unlocked) return;
      
      if (ctx.state === "suspended") await ctx.resume();
      osc(name === "shutter" ? 180 : 220, name === "shutter" ? 900 : 1250);
      console.debug("[SOUND] WebAudio fallback played", name);
    } catch (error) {
      console.warn(`[SOUND] WebAudio fallback failed for ${name}:`, error);
    }
  }

  return { play, ensureUnlocked };
})();

// Maintain compatibility with existing Sound.play() interface
export const Sound = {
  play: (name: "shutter" | "beep") => {
    if (name === "shutter") playShutter();
    else if (name === "beep") playBeep();
  },
  ensureUnlocked: WebAudioFallback.ensureUnlocked
};