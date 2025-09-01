// src/lib/sound/soundManager.ts
// iOS-safe WebAudio + HTMLAudio fallback with throttle & logs

type SoundName = "shutter" | "beep";

class _Sound {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private unlocked = false;
  private lastPlayed: Record<SoundName, number> = { shutter: 0, beep: 0 };
  private minIntervalMs: Record<SoundName, number> = { shutter: 160, beep: 220 };
  private htmlFallback: Record<SoundName, HTMLAudioElement | null> = { shutter: null, beep: null };

  /** Call from a user gesture (pointerdown/touchstart) */
  ensureUnlocked = async () => {
    try {
      if (!this.ctx) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) { console.debug("[SOUND][BLOCKED] no AudioContext"); return; }
        this.ctx  = new AC({ latencyHint: "interactive" });
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0.8;
        this.gain.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") await this.ctx.resume();
      // Prewarm HTML <audio> fallback (silent decode allowed after gesture)
      this.prepareFallback();
      this.unlocked = true;
      console.debug("[SOUND][UNLOCKED] ctx=", this.ctx?.state);
    } catch (e) {
      console.debug("[SOUND][ERROR] unlock", e);
    }
  };

  setVolume = (v: number) => { if (this.gain) this.gain.gain.value = Math.max(0, Math.min(1, v)); };

  /** Main API */
  play = async (name: SoundName) => {
    const now = Date.now();
    if (now - this.lastPlayed[name] < this.minIntervalMs[name]) return; // throttle
    this.lastPlayed[name] = now;

    try {
      if (!this.ctx || !this.gain) {
        console.debug("[SOUND][BLOCKED] no ctx; trying fallback");
        return this.playFallback(name);
      }
      if (this.ctx.state === "suspended") {
        // On iOS, resume is only allowed from a user gesture; fallback if not
        console.debug("[SOUND][BLOCKED] ctx suspended; trying fallback");
        return this.playFallback(name);
      }
      // WebAudio synth
      if (name === "beep") return this.playBeepWA();
      if (name === "shutter") return this.playShutterWA();
    } catch (e) {
      console.debug("[SOUND][ERROR] play", name, e);
      this.playFallback(name);
    }
  };

  // ==== WebAudio implementations ====
  private playBeepWA = () => {
    if (!this.ctx || !this.gain) return;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1000;
    g.gain.value = 0.0001;
    osc.connect(g); g.connect(this.gain);

    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.start(t);
    osc.stop(t + 0.16);
    navigator.vibrate?.(20);
    console.debug("[SOUND][PLAY] beep");
  };

  private playShutterWA = () => {
    if (!this.ctx || !this.gain) return;
    // two short clicks (shutter feel)
    const click = (start: number) => {
      const osc = this.ctx!.createOscillator();
      const g   = this.ctx!.createGain();
      osc.type = "square";
      osc.frequency.value = 900;
      g.gain.value = 0.0001;
      osc.connect(g); g.connect(this.gain!);

      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.7, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);

      osc.start(start);
      osc.stop(start + 0.08);
    };
    const t = this.ctx.currentTime;
    click(t);
    click(t + 0.09);
    navigator.vibrate?.(35);
    console.debug("[SOUND][PLAY] shutter");
  };

  // ==== HTMLAudio fallback ====
  private prepareFallback() {
    // Create minimal WAV data URIs for fallback sounds
    if (!this.htmlFallback.beep) {
      // Short beep tone (1000Hz square wave)
      this.htmlFallback.beep = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhEEXb1cvtZjsWMp7t9NqwfCb/ej39vU0tGEqb"
      );
    }
    if (!this.htmlFallback.shutter) {
      // Dual-click shutter sound (two quick square wave bursts)
      this.htmlFallback.shutter = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm14IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhEEXb5QgUXrTp66hVFApGn+DyvmwhEEXb"
      );
    }
    // Don't autoplay; just set properties
    for (const a of Object.values(this.htmlFallback)) {
      if (!a) continue; 
      a.preload = "auto"; 
      a.crossOrigin = "anonymous";
      a.volume = 0.7;
    }
  }

  private async playFallback(name: SoundName) {
    const el = this.htmlFallback[name];
    if (!el) return console.debug("[SOUND][BLOCKED] no fallback element");
    try {
      el.currentTime = 0;
      await el.play();
      navigator.vibrate?.(name === "shutter" ? 35 : 20);
      console.debug("[SOUND][PLAY] fallback", name);
    } catch (e) {
      console.debug("[SOUND][ERROR] fallback", name, e);
    }
  }
}

export const Sound = new _Sound();

// Legacy compatibility functions
export function playShutter() { 
  Sound.play("shutter");
}

export function playBeep() { 
  Sound.play("beep"); 
}

// Helpful hook-ups for lifecycle
export function bindSoundUnlockOnce(el: HTMLElement | null) {
  if (!el) return;
  const handler = () => { Sound.ensureUnlocked(); el.removeEventListener("pointerdown", handler); };
  el.addEventListener("pointerdown", handler, { passive: true });
}

// Auto-unlock on visibility change (iOS Safari backgrounding)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") Sound.ensureUnlocked();
});