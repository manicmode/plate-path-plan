import { test, expect } from '@playwright/test';

test('confirm card shows brand image for items with imageUrl', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Mock a food item with image during manual entry
  await page.evaluate(() => {
    // Simulate selecting a food item with an image
    const mockItem = {
      id: 'test-food-123',
      name: 'Test Brand Food',
      imageUrl: 'https://images.openfoodfacts.org/images/products/123/456/789/012/front_en.400.jpg',
      imageAttribution: 'off',
      calories: 150,
      protein: 10,
      carbs: 20,
      fat: 5,
      source: 'manual'
    };
    
    // Store the item globally so we can access it in tests
    (window as any).__testFoodItem = mockItem;
  });
  
  // Trigger manual food entry (this will vary based on your UI)
  // This is a placeholder - adapt to your actual UI flow
  await page.click('[data-test="manual-entry-button"]'); // Adjust selector as needed
  
  // Wait for confirm modal to appear
  await page.waitForSelector('[data-test="confirm-food-img"]', { timeout: 10000 });
  
  // Assert that the image element is visible and has correct src
  const imageElement = page.getByTestId('confirm-food-img');
  await expect(imageElement).toBeVisible();
  
  // Check that the image source is correctly bound
  const imageSrc = await imageElement.getAttribute('src');
  expect(imageSrc).toBeTruthy();
  expect(imageSrc).toContain('http'); // Should be a real URL, not initials fallback
  
  // Verify no estimated ribbons are shown
  const estimatedRibbon = page.locator('.estimated-ribbon');
  await expect(estimatedRibbon).not.toBeVisible();
  
  // Run the probe to verify internal state
  const probeResult = await page.evaluate(() => {
    const s = (window as any).__stores?.nutrition?.getState?.() || {};
    const el = document.querySelector('[data-test="confirm-food-img"]');
    return {
      storeImage: s.currentFoodItem?.imageUrl,
      domSrc: el?.getAttribute('src'),
      hasImage: !!el && !!el.getAttribute('src')
    };
  });
  
  expect(probeResult.hasImage).toBe(true);
  expect(probeResult.storeImage).toBeTruthy();
  expect(probeResult.domSrc).toBeTruthy();
});

test('confirm card shows initials fallback when no imageUrl', async ({ page }) => {
  await page.goto('/');
  
  // Mock a food item WITHOUT image
  await page.evaluate(() => {
    const mockItem = {
      id: 'test-food-no-image',
      name: 'Test Food No Image',
      imageUrl: null,
      imageAttribution: null,
      calories: 100,
      protein: 5,
      carbs: 15,
      fat: 2,
      source: 'manual'
    };
    (window as any).__testFoodItem = mockItem;
  });
  
  // Trigger confirm flow
  await page.click('[data-test="manual-entry-button"]');
  
  // Should show initials fallback, not image
  await page.waitForSelector('[data-test="confirm-food-initials"]', { timeout: 10000 });
  
  const initialsElement = page.getByTestId('confirm-food-initials');
  await expect(initialsElement).toBeVisible();
  
  // Should NOT show image element
  const imageElement = page.locator('[data-test="confirm-food-img"]');
  await expect(imageElement).not.toBeVisible();
});