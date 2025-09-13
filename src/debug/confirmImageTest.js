// DevTools test script for Confirm Food Card image functionality
// Paste this into the browser console when the Confirm card is open

(() => {
  console.log('🔍 [CONFIRM-IMAGE-TEST] Starting comprehensive image test...');
  
  // Test 1: Check if image element exists
  const imgEl = document.querySelector('[data-test="confirm-food-img"]');
  const fallbackEl = document.querySelector('[data-test="confirm-food-fallback"]');
  const controlEl = document.querySelector('[data-test="confirm-img-control"]');
  
  console.log('📷 [IMG-ELEMENTS]', {
    mainImage: !!imgEl,
    fallbackImage: !!fallbackEl,
    controlImage: !!controlEl,
    mainImageSrc: imgEl?.getAttribute('src'),
    fallbackImageSrc: fallbackEl?.getAttribute('src')
  });
  
  // Test 2: Check image dimensions and loading
  if (imgEl) {
    console.log('🖼️ [IMG-DIMENSIONS]', {
      naturalWidth: imgEl.naturalWidth,
      naturalHeight: imgEl.naturalHeight,
      displayWidth: imgEl.offsetWidth,
      displayHeight: imgEl.offsetHeight,
      complete: imgEl.complete
    });
  }
  
  // Test 3: Check CSP compliance
  const cspEl = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  const cspContent = cspEl?.getAttribute('content') || 'No CSP found';
  const imgSrcDirective = cspContent.match(/img-src ([^;]+)/)?.[1] || 'Not found';
  
  console.log('🔒 [CSP-CHECK]', {
    hasCsp: !!cspEl,
    imgSrcDirective,
    allowsHttps: imgSrcDirective.includes('https:'),
    allowsCloudfront: imgSrcDirective.includes('cloudfront'),
    allowsOpenfoodfacts: imgSrcDirective.includes('openfoodfacts')
  });
  
  // Test 4: Check store state
  const storeState = (window).__stores?.nutrition?.getState?.() || {};
  console.log('🏪 [STORE-STATE]', {
    currentItem: storeState.currentFoodItem?.name,
    hasImageUrl: !!storeState.currentFoodItem?.imageUrl,
    imageUrl: storeState.currentFoodItem?.imageUrl,
    imageAttribution: storeState.currentFoodItem?.imageAttribution
  });
  
  // Test 5: Check avatar container styling
  const avatarEl = document.querySelector('.confirm-avatar');
  if (avatarEl) {
    const styles = window.getComputedStyle(avatarEl);
    console.log('🎨 [AVATAR-STYLES]', {
      position: styles.position,
      overflow: styles.overflow,
      width: styles.width,
      height: styles.height,
      zIndex: styles.zIndex
    });
  }
  
  // Test 6: Check brand badge positioning
  const badgeEl = document.querySelector('.brand-badge');
  if (badgeEl) {
    const styles = window.getComputedStyle(badgeEl);
    console.log('🏷️ [BADGE-STYLES]', {
      position: styles.position,
      pointerEvents: styles.pointerEvents,
      zIndex: styles.zIndex,
      right: styles.right,
      top: styles.top
    });
  }
  
  // Test 7: Network request check
  const imageUrl = imgEl?.getAttribute('src');
  if (imageUrl && imageUrl.startsWith('http')) {
    fetch(imageUrl, { method: 'HEAD' })
      .then(response => {
        console.log('🌐 [NETWORK-CHECK]', {
          url: imageUrl,
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
      })
      .catch(error => {
        console.warn('❌ [NETWORK-ERROR]', { url: imageUrl, error: error.message });
      });
  }
  
  console.log('✅ [CONFIRM-IMAGE-TEST] Test complete. Check logs above for results.');
  
  return {
    hasImage: !!imgEl,
    imageLoaded: imgEl?.complete,
    imageUrl: imgEl?.getAttribute('src'),
    cspCompliant: imgSrcDirective.includes('https:'),
    storeHasImage: !!storeState.currentFoodItem?.imageUrl
  };
})();