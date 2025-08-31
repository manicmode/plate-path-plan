/**
 * Manages capture mode transitions for UPC -> Nutrition Facts flow
 */

export type CaptureMode = 'barcode' | 'nutrition' | 'photo' | 'manual';

export interface CaptureState {
  mode: CaptureMode;
  requiresNutrition: boolean;
  overlayMessage?: string;
  validateKeywords?: string[];
}

export class CaptureModeManager {
  private currentMode: CaptureMode = 'barcode';
  private callbacks: Array<(state: CaptureState) => void> = [];

  constructor() {
    this.currentMode = 'barcode';
  }

  getCurrentState(): CaptureState {
    return {
      mode: this.currentMode,
      requiresNutrition: this.currentMode === 'nutrition',
      overlayMessage: this.getOverlayMessage(),
      validateKeywords: this.getValidationKeywords()
    };
  }

  setCaptureMode(mode: CaptureMode, options?: { overlayMessage?: string }) {
    console.log('[CAPTURE_MODE] Switching from', this.currentMode, 'to', mode);
    this.currentMode = mode;
    
    const state: CaptureState = {
      mode,
      requiresNutrition: mode === 'nutrition',
      overlayMessage: options?.overlayMessage || this.getOverlayMessage(),
      validateKeywords: this.getValidationKeywords()
    };
    
    this.notifyCallbacks(state);
  }

  onStateChange(callback: (state: CaptureState) => void) {
    this.callbacks.push(callback);
    // Immediately notify with current state
    callback(this.getCurrentState());
    
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private getOverlayMessage(): string {
    switch (this.currentMode) {
      case 'barcode':
        return 'Scan the barcode on your product';
      case 'nutrition':
        return 'Photograph the Nutrition Facts panel. Make sure "Serving size" is visible.';
      case 'photo':
        return 'Take a photo of your food';
      case 'manual':
        return 'Enter food details manually';
      default:
        return 'Ready to capture';
    }
  }

  private getValidationKeywords(): string[] {
    switch (this.currentMode) {
      case 'nutrition':
        return ['Nutrition Facts', 'Serving size'];
      default:
        return [];
    }
  }

  private notifyCallbacks(state: CaptureState) {
    this.callbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[CAPTURE_MODE] Callback error:', error);
      }
    });
  }

  reset() {
    this.setCaptureMode('barcode');
  }
}