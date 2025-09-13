// One-liner probe for confirm image binding
// Paste in DevTools console when confirm card is open

(() => {
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
    allMatch: s.currentFoodItem?.imageUrl === el?.getAttribute('src')
  };
})();