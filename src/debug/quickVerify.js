// Quick verification script for confirm image binding
// Paste in DevTools console when confirm card is open

(() => {
  console.log('=== CONFIRM IMAGE QUICK VERIFY ===');
  
  // Check store state
  const s = window.__stores?.nutrition?.getState?.() || {};
  console.log('[PROBE][STORE_CURRENT]', { 
    name: s.currentFoodItem?.name, 
    imageUrl: s.currentFoodItem?.imageUrl 
  });
  
  // Check DOM binding
  const el = document.querySelector('[data-test="confirm-food-img"]');
  console.log('[PROBE][IMG_DOM]', !!el, el?.getAttribute('src'));
  
  // Expected results
  const hasStoreImage = !!s.currentFoodItem?.imageUrl;
  const hasDomBinding = !!el && !!el.getAttribute('src');
  
  console.log('[VERIFY][RESULT]', {
    hasStoreImage,
    hasDomBinding,
    passed: hasStoreImage && hasDomBinding,
    status: (hasStoreImage && hasDomBinding) ? '✅ PASSED' : '❌ FAILED'
  });
  
  if (!hasStoreImage) {
    console.warn('[VERIFY][ISSUE] No imageUrl in store - check handoff logic');
  }
  
  if (!hasDomBinding) {
    console.warn('[VERIFY][ISSUE] No DOM image binding - check header component');
  }
  
  return {
    hasStoreImage,
    hasDomBinding,
    passed: hasStoreImage && hasDomBinding
  };
})();