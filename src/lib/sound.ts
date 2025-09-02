// Reusable sound utility for camera shutter and other UI sounds
let shutter: HTMLAudioElement | null = null;

export function initShutter() {
  if (!shutter) {
    try {
      // Use a short audio data URL for immediate availability
      shutter = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWX3PbDczEICg');
      shutter.preload = 'auto';
      shutter.volume = 0.3; // Keep it subtle
    } catch (error) {
      console.log('Shutter sound init failed:', error);
    }
  }
}

export async function playShutter() {
  try {
    initShutter();
    if (!shutter) return;
    
    // Reset time to allow rapid successive plays
    shutter.currentTime = 0;
    
    // iOS: ensure called in direct click/tap handler
    await shutter.play();
  } catch (error) {
    // Ignore - never throw on sound failure
    console.log('Shutter sound play failed:', error);
  }
}

// Initialize on first user interaction
export function bindShutterInit(element: HTMLElement | null) {
  if (!element) return;
  
  const handler = () => {
    initShutter();
    element.removeEventListener('pointerdown', handler);
  };
  
  element.addEventListener('pointerdown', handler, { once: true });
}