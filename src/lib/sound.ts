// Embedded data-URI for immediate playback, no network fetch
const SHUTTER_DATA_URI = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWX3PbDczEICg';

let audio: HTMLAudioElement | null = null;

export async function playShutter() {
  try {
    if (!audio) {
      audio = new Audio(SHUTTER_DATA_URI);
      audio.preload = 'auto';
      audio.volume = 0.3;
    }
    
    // Reset time to allow rapid successive plays
    audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    // Fallback haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    console.log('Shutter sound failed, used haptic fallback:', error);
  }
}

export function bindShutterInit(element: HTMLElement | null) {
  if (!element) return;
  
  const handler = () => {
    // Initialize audio on first interaction
    if (!audio) {
      audio = new Audio(SHUTTER_DATA_URI);
      audio.preload = 'auto';
      audio.volume = 0.3;
    }
    element.removeEventListener('pointerdown', handler);
  };
  
  element.addEventListener('pointerdown', handler, { once: true });
}