import { SFX } from './sfxManager';

if (typeof window !== 'undefined') {
  let handled = false;
  const handler = async () => {
    if (handled) return;
    handled = true;
    try { await SFX().unlock(); } catch {}
    window.removeEventListener('pointerdown', handler, true);
  };
  window.addEventListener('pointerdown', handler, true);

  // Dev helpers
  (window as any).SFX = {
    unlock: () => SFX().unlock(),
    play:   (k: any) => SFX().play(k),
    debug:  () => { const d = SFX().debugDump(); console.table(d); return d; }
  };
}