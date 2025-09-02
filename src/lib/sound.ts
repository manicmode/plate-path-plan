// Embedded data-URI for immediate playback, no network fetch (tiny MP3)
const SHUTTER_DATA_URI = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjQ1LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PD//////////////////////////////////////8AAAAATGF2YzU4Ljk5AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV';

let shutterEl: HTMLAudioElement | null = null;

export function initShutter() {
  if (!shutterEl) {
    shutterEl = new Audio(SHUTTER_DATA_URI);
    shutterEl.preload = 'auto';
    shutterEl.volume = 0.3;
    shutterEl.crossOrigin = 'anonymous';
  }
}

export async function playShutter() {
  try {
    initShutter();
    if (!shutterEl) return;
    
    // Reset time to allow rapid successive plays
    shutterEl.currentTime = 0;
    await shutterEl.play();
  } catch (error) {
    // iOS Safari doesn't support navigator.vibrate - silently fail
    console.log('Shutter sound failed:', error);
  }
}

export function bindShutterInit(element: HTMLElement | null) {
  if (!element) return;
  
  const handler = () => {
    // Initialize audio on first interaction
    if (!shutterEl) {
      initShutter();
    }
    element.removeEventListener('pointerdown', handler);
  };
  
  element.addEventListener('pointerdown', handler, { once: true });
}