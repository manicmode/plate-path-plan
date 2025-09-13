// Quick runtime probes for image debugging - paste in DevTools console

// Basic image element check
(() => {
  const el = document.querySelector('[data-test="confirm-food-img"]');
  console.log('[PROBE][IMG-ELEM]', !!el, el?.getAttribute('src'));
})();

// Check if fallback initials tile is showing instead
(() => {
  const initialsEl = document.querySelector('[data-test="confirm-food-initials"]');
  console.log('[PROBE][INITIALS-ELEM]', !!initialsEl);
})();

// Check store state for imageUrl
(() => {
  const storeState = window.__stores?.nutrition?.getState?.() || {};
  console.log('[PROBE][STORE-STATE]', {
    currentItem: storeState.currentFoodItem?.name,
    hasImageUrl: !!storeState.currentFoodItem?.imageUrl,
    imageUrl: storeState.currentFoodItem?.imageUrl,
    imageAttribution: storeState.currentFoodItem?.imageAttribution
  });
})();

// Check for any food-placeholder.png requests (should be none)
(() => {
  const networkEntries = performance.getEntriesByType('resource');
  const placeholderRequests = networkEntries.filter(entry => 
    entry.name.includes('food-placeholder') || entry.name.includes('placeholder')
  );
  console.log('[PROBE][PLACEHOLDER-REQUESTS]', placeholderRequests.length, placeholderRequests);
})();

// Check for 404 image errors
(() => {
  const networkEntries = performance.getEntriesByType('resource');
  const failedImages = networkEntries.filter(entry => 
    entry.name.includes('.jpg') || entry.name.includes('.png') || entry.name.includes('.webp')
  ).filter(entry => entry.responseStatus === 404);
  console.log('[PROBE][FAILED-IMAGES]', failedImages.length, failedImages);
})();