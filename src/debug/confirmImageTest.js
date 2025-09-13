// Runtime test script for Confirm Food Card image binding
// Paste in DevTools console when confirm card is open

(() => {
  console.log('=== CONFIRM IMAGE TEST ===');
  
  // 1. Check for image element
  const imgEl = document.querySelector('[data-test="confirm-food-img"]');
  const initialsEl = document.querySelector('[data-test="confirm-food-initials"]');
  
  console.log('[TEST][IMG-ELEMENT]', {
    hasImage: !!imgEl,
    hasInitials: !!initialsEl,
    imageSrc: imgEl?.getAttribute('src'),
    imageLoaded: imgEl?.complete,
    naturalWidth: imgEl?.naturalWidth,
    naturalHeight: imgEl?.naturalHeight
  });
  
  // 2. Check for control image (should load)
  const controlEl = document.querySelector('[data-test="confirm-img-control"]');
  console.log('[TEST][CONTROL]', {
    found: !!controlEl,
    loaded: controlEl?.complete
  });
  
  // 3. Check for estimated ribbons (should be none)
  const ribbons = document.querySelectorAll('.estimated-ribbon');
  console.log('[TEST][RIBBONS]', {
    count: ribbons.length,
    shouldBeZero: ribbons.length === 0
  });
  
  // 4. Check brand pill positioning
  const brandPill = document.querySelector('.brand-badge');
  console.log('[TEST][BRAND-PILL]', {
    found: !!brandPill,
    pointerEvents: brandPill ? getComputedStyle(brandPill).pointerEvents : null,
    zIndex: brandPill ? getComputedStyle(brandPill).zIndex : null
  });
  
  // 5. Check for placeholder requests
  const networkEntries = performance.getEntriesByType('resource');
  const placeholderRequests = networkEntries.filter(entry => 
    entry.name.includes('food-placeholder') || 
    entry.name.includes('placeholder.png')
  );
  console.log('[TEST][PLACEHOLDER-REQUESTS]', {
    count: placeholderRequests.length,
    shouldBeZero: placeholderRequests.length === 0,
    requests: placeholderRequests
  });
  
  // 6. Check CSP errors
  const cspErrors = [];
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('Content Security Policy') && message.includes('image')) {
      cspErrors.push(message);
    }
    originalError.apply(console, args);
  };
  
  console.log('[TEST][CSP-ERRORS]', {
    count: cspErrors.length,
    shouldBeZero: cspErrors.length === 0,
    errors: cspErrors
  });
  
  // 7. Overall test result
  const allTestsPassed = 
    (!!imgEl || !!initialsEl) && // Has image OR initials
    ribbons.length === 0 && // No estimated ribbons
    placeholderRequests.length === 0 && // No placeholder requests
    cspErrors.length === 0; // No CSP errors
    
  console.log('[TEST][RESULT]', {
    allTestsPassed,
    summary: allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'
  });
  
  return {
    passed: allTestsPassed,
    hasImage: !!imgEl,
    hasInitials: !!initialsEl,
    noRibbons: ribbons.length === 0,
    noPlaceholders: placeholderRequests.length === 0,
    noCspErrors: cspErrors.length === 0
  };
})();