import { describe, test, expect } from 'vitest';
import { detectFoodVisionV1, filterFoodish } from '@/detect/vision_v1';
import { estimatePortions, classifyFood } from '@/portion/estimate';

// Mock fixture data - in real implementation these would be loaded from actual test images
const GOLDEN_FIXTURES = [
  {
    name: 'salmon_asparagus_plate',
    expectedFoods: ['salmon', 'asparagus'],
    expectedPortions: { salmon: { min: 100, max: 200 }, asparagus: { min: 50, max: 150 } }
  },
  {
    name: 'chicken_rice_broccoli',
    expectedFoods: ['chicken', 'rice', 'broccoli'],
    expectedPortions: { chicken: { min: 120, max: 180 }, rice: { min: 150, max: 200 }, broccoli: { min: 80, max: 120 } }
  },
  {
    name: 'pasta_tomato_salad',
    expectedFoods: ['pasta', 'tomato', 'salad'],
    expectedPortions: { pasta: { min: 160, max: 220 }, tomato: { min: 80, max: 120 }, salad: { min: 60, max: 100 } }
  }
];

describe('Vision V1 Golden Set Tests', () => {
  test.skip('should detect foods in golden set images', async () => {
    // Skip in CI until we have actual fixture images
    for (const fixture of GOLDEN_FIXTURES) {
      // In real implementation, load actual base64 image data
      const mockBase64 = 'placeholder_base64_data';
      
      const result = await detectFoodVisionV1(mockBase64);
      
      // Assert at least one food item detected
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      
      // Check that expected foods are present (allowing for some variation)
      const detectedLower = result.items.map(item => item.toLowerCase());
      const hasExpectedFoods = fixture.expectedFoods.some(expected => 
        detectedLower.some(detected => detected.includes(expected))
      );
      
      expect(hasExpectedFoods).toBe(true);
    }
  });

  test('should filter non-food items correctly', () => {
    const input = ['plate', 'fork', 'salmon', 'asparagus', 'logo', 'chicken', 'brand'];
    const result = filterFoodish(input);
    expect(result).toEqual(['salmon', 'asparagus', 'chicken']);
  });

  test('should classify foods correctly', () => {
    expect(classifyFood('salmon')).toBe('protein');
    expect(classifyFood('grilled chicken')).toBe('protein');
    expect(classifyFood('rice')).toBe('starch');
    expect(classifyFood('pasta')).toBe('starch');
    expect(classifyFood('asparagus')).toBe('veg');
    expect(classifyFood('broccoli')).toBe('veg');
    expect(classifyFood('lettuce')).toBe('leafy');
    expect(classifyFood('spinach')).toBe('leafy');
    expect(classifyFood('unknown food')).toBe('other');
  });

  test('should estimate portions within sane bounds', () => {
    const foods = ['salmon', 'rice', 'broccoli'];
    const mockBboxes = [
      { x: 100, y: 100, width: 80, height: 60 },
      { x: 200, y: 100, width: 100, height: 80 },
      { x: 150, y: 200, width: 70, height: 50 }
    ];
    const imageWH = { width: 800, height: 600 };
    const plateBBox = { x: 50, y: 50, width: 300, height: 300 };

    const estimates = estimatePortions(foods, mockBboxes, imageWH, plateBBox);

    expect(estimates).toHaveLength(3);
    
    estimates.forEach(estimate => {
      // All estimates should be within reasonable bounds
      expect(estimate.grams_est).toBeGreaterThanOrEqual(10);
      expect(estimate.grams_est).toBeLessThanOrEqual(600);
      
      // Should have confidence rating
      expect(['high', 'medium', 'low']).toContain(estimate.confidence);
      
      // Should have food classification
      expect(estimate.food_class).toBeDefined();
    });
    
    // Salmon should be classified as protein
    const salmonEstimate = estimates.find(e => e.name === 'salmon');
    expect(salmonEstimate?.food_class).toBe('protein');
    
    // With plate present, confidence should be high
    expect(salmonEstimate?.confidence).toBe('high');
  });

  test('should handle missing plate gracefully', () => {
    const foods = ['chicken'];
    const mockBboxes = [{ x: 100, y: 100, width: 80, height: 60 }];
    const imageWH = { width: 800, height: 600 };
    // No plate bounding box

    const estimates = estimatePortions(foods, mockBboxes, imageWH);

    expect(estimates).toHaveLength(1);
    expect(estimates[0].confidence).toBe('low');
    expect(estimates[0].grams_est).toBeGreaterThanOrEqual(10);
  });
});

// Export for CI integration
export { GOLDEN_FIXTURES };