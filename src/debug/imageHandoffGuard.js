/**
 * Image Handoff Guard Verification
 * Checks that imageUrl survives payload → mount with the final guard
 */

(() => {
  console.log('=== Image Handoff Guard Verification ===');
  
  // This should run when you:
  // 1. Add a food item with an image (manual entry, voice, or photo detection)
  // 2. Open the confirm dialog
  
  console.log('Expected console output for branded items:');
  console.log('1. [CONFIRM][OPEN][PAYLOAD_SNAPSHOT] { hasImage: true, imageUrl: "https://..." }');
  console.log('2. [CONFIRM][MOUNT_SNAPSHOT] { hasImageUrl: true, imageUrl: "https://...", name: "..." }');
  console.log('3. [CONFIRM][IMG_LOADED] https://...');
  
  // DOM verification
  const img = document.querySelector('[data-test="confirm-food-img"]');
  const initials = document.querySelector('[data-test="confirm-food-initials"]');
  
  console.log('Current DOM state:');
  console.log('- Has branded image:', !!img);
  console.log('- Image src:', img?.src?.slice(0, 80));
  console.log('- Has initials fallback:', !!initials);
  
  if (img && img.src.includes('food-placeholder.png')) {
    console.error('❌ FAIL: Still using placeholder for branded item');
  } else if (img && img.src.startsWith('http')) {
    console.log('✅ PASS: Using real image URL for branded item');
  } else if (initials && !img) {
    console.log('✅ PASS: Using initials fallback for generic item (expected)');
  }
  
  console.log('=======================');
})();