// Global probe setup for easy debugging
// Add this to window for easy access in DevTools

window.__probeConfirmImage = (() => {
  const s = window.__stores?.nutrition?.getState?.() || {};
  console.log('[PROBE][STORE_CURRENT]', { name: s.currentFoodItem?.name, imageUrl: s.currentFoodItem?.imageUrl });
  const el = document.querySelector('[data-test="confirm-food-img"]');
  console.log('[PROBE][IMG_DOM]', !!el, el?.getAttribute('src'));
  
  // Check guard
  const guard = window.__CONFIRM_GUARD__;
  if (guard) {
    console.log('[PROBE][GUARD]', { name: guard.name, imageUrl: guard.imageUrl });
  }
  
  return {
    storeImage: s.currentFoodItem?.imageUrl,
    domSrc: el?.getAttribute('src'),
    guardImage: guard?.imageUrl,
    allMatch: s.currentFoodItem?.imageUrl === el?.getAttribute('src'),
    hasImage: !!(s.currentFoodItem?.imageUrl && el?.getAttribute('src'))
  };
});

console.log('[DEBUG] Use window.__probeConfirmImage() to check image binding');