import { describe, test, expect } from 'vitest';
import { canonicalize, similar, fuseDetections } from '@/detect/ensemble';
import { classifyFood, estimatePortions } from '@/portion/estimate';
import { VisionFood } from '@/detect/vision_v1';

// Golden test cases for ensemble detection
const GOLDEN_CASES = [
  {
    name: 'salmon_asparagus_plate',
    vision: [
      { name: 'salmon', source: 'object', bbox: { x: 100, y: 100, width: 120, height: 80 }, score: 0.8 },
      { name: 'asparagus', source: 'object', bbox: { x: 250, y: 120, width: 80, height: 100 }, score: 0.7 }
    ] as VisionFood[],
    gpt: ['grilled salmon', 'asparagus spears'],
    expectedFused: 2, // Should dedupe to salmon + asparagus
    expectedPortions: {
      salmon: { min: 100, max: 200 },
      asparagus: { min: 50, max: 150 }
    }
  },
  {
    name: 'vision_miss_gpt_catch',
    vision: [
      { name: 'food', source: 'label', score: 0.3 }
    ] as VisionFood[],
    gpt: ['cherry tomatoes', 'mixed salad', 'chicken breast'],
    expectedFused: 4, // food + 3 from GPT (not deduped)
    expectedPortions: {
      tomato: { min: 30, max: 80 }, // cherry tomatoes -> tomato
      salad: { min: 60, max: 100 },
      chicken: { min: 120, max: 180 }
    }
  }
];

describe('Vision Ensemble Golden Tests', () => {
  test('canonicalization works correctly', () => {
    expect(canonicalize('Cherry Tomatoes')).toBe('tomato');
    expect(canonicalize('Grilled Chicken Breast')).toBe('chicken');
    expect(canonicalize('French Fries')).toBe('french fries');
    expect(canonicalize('Cooked White Rice')).toBe('rice');
    expect(canonicalize('Fresh Spinach Leaves')).toBe('spinach');
  });

  test('similarity function works correctly', () => {
    expect(similar('salmon', 'grilled salmon')).toBeGreaterThan(0.5);
    expect(similar('tomato', 'cherry tomato')).toBeGreaterThan(0.5);
    expect(similar('chicken', 'beef')).toBeLessThan(0.3);
    expect(similar('rice', 'pasta')).toBeLessThan(0.3);
  });

  test('food classification works correctly', () => {
    expect(classifyFood('salmon')).toBe('protein');
    expect(classifyFood('chicken')).toBe('protein');
    expect(classifyFood('rice')).toBe('starch');
    expect(classifyFood('pasta')).toBe('starch');
    expect(classifyFood('french fries')).toBe('starch');
    expect(classifyFood('asparagus')).toBe('veg');
    expect(classifyFood('broccoli')).toBe('veg');
    expect(classifyFood('tomato')).toBe('veg');
    expect(classifyFood('lettuce')).toBe('leafy');
    expect(classifyFood('salad')).toBe('leafy');
    expect(classifyFood('spinach')).toBe('leafy');
    expect(classifyFood('unknown food')).toBe('other');
  });

  test('fusion deduplication works correctly', () => {
    const testCase = GOLDEN_CASES[0]; // salmon_asparagus_plate
    const fused = fuseDetections(testCase.vision, testCase.gpt);
    
    expect(fused).toHaveLength(testCase.expectedFused);
    
    // Should have both foods
    const foodNames = fused.map(f => f.canonicalName);
    expect(foodNames).toContain('salmon');
    expect(foodNames).toContain('asparagus');
    
    // Both should be marked as 'both' origin (vision + gpt)
    const salmonItem = fused.find(f => f.canonicalName === 'salmon');
    const asparagusItem = fused.find(f => f.canonicalName === 'asparagus');
    
    expect(salmonItem?.origin).toBe('both');
    expect(asparagusItem?.origin).toBe('both');
    expect(salmonItem?.sources.has('vision')).toBe(true);
    expect(salmonItem?.sources.has('gpt')).toBe(true);
  });

  test('GPT-only items are added correctly', () => {
    const testCase = GOLDEN_CASES[1]; // vision_miss_gpt_catch
    const fused = fuseDetections(testCase.vision, testCase.gpt);
    
    expect(fused.length).toBeGreaterThanOrEqual(3); // At least 3 from GPT
    
    // Should have GPT-only items
    const gptOnlyItems = fused.filter(f => f.origin === 'gpt');
    expect(gptOnlyItems.length).toBeGreaterThan(0);
    
    // Should include canonicalized versions
    const foodNames = fused.map(f => f.canonicalName);
    expect(foodNames).toContain('tomato'); // cherry tomatoes -> tomato
    expect(foodNames).toContain('salad'); // mixed salad -> salad
    expect(foodNames).toContain('chicken'); // chicken breast -> chicken
  });

  test('portion estimation with bounding boxes', () => {
    const mockFusedItems = [
      {
        canonicalName: 'salmon',
        sources: new Set(['vision']),
        bbox: { x: 100, y: 100, width: 120, height: 80 },
        origin: 'vision' as const
      },
      {
        canonicalName: 'asparagus', 
        sources: new Set(['vision']),
        bbox: { x: 250, y: 120, width: 80, height: 100 },
        origin: 'vision' as const
      }
    ];
    
    const imageWH = { width: 800, height: 600 };
    const plateBBox = { x: 50, y: 50, width: 400, height: 400 };
    
    const portions = estimatePortions(mockFusedItems, plateBBox, imageWH);
    
    expect(portions).toHaveLength(2);
    
    // Check salmon portion
    const salmonPortion = portions.find(p => p.name === 'salmon');
    expect(salmonPortion).toBeTruthy();
    expect(salmonPortion!.grams_est).toBeGreaterThanOrEqual(10);
    expect(salmonPortion!.grams_est).toBeLessThanOrEqual(600);
    expect(salmonPortion!.confidence).toBe('high'); // Has plate
    expect(salmonPortion!.food_class).toBe('protein');
    
    // Check asparagus portion
    const asparagusPortion = portions.find(p => p.name === 'asparagus');
    expect(asparagusPortion).toBeTruthy();
    expect(asparagusPortion!.grams_est).toBeGreaterThanOrEqual(10);
    expect(asparagusPortion!.grams_est).toBeLessThanOrEqual(600);
    expect(asparagusPortion!.confidence).toBe('high'); // Has plate
    expect(asparagusPortion!.food_class).toBe('veg');
  });

  test('portion estimation without plate (GPT-only items)', () => {
    const mockFusedItems = [
      {
        canonicalName: 'chicken',
        sources: new Set(['gpt']),
        origin: 'gpt' as const
        // No bbox
      }
    ];
    
    const portions = estimatePortions(mockFusedItems);
    
    expect(portions).toHaveLength(1);
    expect(portions[0].confidence).toBe('low'); // No bbox, no plate
    expect(portions[0].grams_est).toBe(135); // Base protein portion
    expect(portions[0].food_class).toBe('protein');
    expect(portions[0].source).toBe('gpt');
  });

  test('portions are within sane bounds', () => {
    // Test with extreme bbox sizes
    const mockFusedItems = [
      {
        canonicalName: 'rice',
        sources: new Set(['vision']),
        bbox: { x: 0, y: 0, width: 1000, height: 1000 }, // Huge bbox
        origin: 'vision' as const
      }
    ];
    
    const imageWH = { width: 800, height: 600 };
    const plateBBox = { x: 50, y: 50, width: 100, height: 100 }; // Small plate
    
    const portions = estimatePortions(mockFusedItems, plateBBox, imageWH);
    
    // Should be clamped to max 600g
    expect(portions[0].grams_est).toBeLessThanOrEqual(600);
    expect(portions[0].grams_est).toBeGreaterThanOrEqual(10);
  });
});

// Export for CI integration
export { GOLDEN_CASES };