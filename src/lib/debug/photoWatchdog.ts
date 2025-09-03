// Watchdog utility for photo processing - prevents infinite spinners
export function createPhotoWatchdog(
  requestId: string, 
  stopSpinner: () => void, 
  showError: (message: string) => void,
  timeoutMs: number = 12000
) {
  const watchdog = window.setTimeout(() => {
    console.warn('[PHOTO][WATCHDOG_TIMEOUT]', requestId);
    stopSpinner();
    showError('Slow network—try again');
  }, timeoutMs);

  return {
    clear: () => clearTimeout(watchdog),
    requestId
  };
}

// Centralized image getter - never misses an image that exists
export const getItemImage = (item: any): string | null => {
  return item?.image ?? item?.images?.[0] ?? item?.providerImage ?? item?.image_url ?? null;
};

// Debug probe for portion/score calculations
export function logPortionProbe(item: any, requestId: string) {
  if (!import.meta.env.VITE_DEBUG_CLIENT) return;
  
  console.log('[PORTION][STEP] base', { 
    per: item.per || 'serving|100g', 
    kcal: item.calories, 
    macros: item.nutrition, 
    requestId 
  });
  
  if (item.portionOverride) {
    console.log('[PORTION][STEP] override', { 
      source: item.portionSource || 'OCR|user|est', 
      portion: item.portionOverride, 
      requestId 
    });
  }
  
  console.log('[PORTION][STEP] applied', { 
    kcal: item.finalCalories || item.calories, 
    macros: item.finalMacros || item.nutrition, 
    requestId 
  });
}

export function logScoreProbe(item: any, requestId: string) {
  if (!import.meta.env.VITE_DEBUG_CLIENT) return;
  
  console.log('[SCORE][STEP]', { 
    score: item.score, 
    flags: item.flags || [], 
    requestId 
  });
}