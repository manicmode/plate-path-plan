/**
 * Unit tests for barcode adapter with ScoreEngine and deterministic flags
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toLegacyFromEdge } from './toLegacyFromEdge';

describe('Barcode Adapter with ScoreEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect artificial sweetener flag from ingredients', () => {
    const envelope = {
      mode: 'barcode',
      barcode: '1234567890',
      product: {
        product_name: 'Diet Soda',
        ingredients_text: 'carbonated water, aspartame, natural flavors, citric acid',
        nutriments: {
          'energy-kcal_100g': 0,
          'proteins_100g': 0,
          'carbohydrates_100g': 0,
          'sugars_100g': 0,
          'fat_100g': 0,
          'sodium_100g': 0.1
        }
      }
    };

    const result = toLegacyFromEdge(envelope);

    expect(result.healthFlags).toHaveLength(1);
    expect(result.healthFlags[0]).toMatchObject({
      key: 'artificial_sweeteners',
      label: 'Contains artificial sweeteners',
      severity: 'warning'
    });
  });

  it('should detect high sodium flag for products ≥600mg per 100g', () => {
    const envelope = {
      mode: 'barcode', 
      barcode: '9876543210',
      product: {
        product_name: 'Salty Chips',
        ingredients_text: 'potatoes, vegetable oil, salt',
        nutriments: {
          'energy-kcal_100g': 500,
          'proteins_100g': 6,
          'carbohydrates_100g': 50,
          'fat_100g': 30,
          'sodium_100g': 1.2 // 1.2g = 1200mg per 100g
        }
      }
    };

    const result = toLegacyFromEdge(envelope);

    const sodiumFlags = result.healthFlags.filter(f => 
      f.key === 'high_sodium' || f.key === 'very_high_sodium'
    );
    
    expect(sodiumFlags.length).toBeGreaterThan(0);
    // Should have very_high_sodium since 1200mg ≥ 1500mg threshold
    expect(sodiumFlags.some(f => f.key === 'very_high_sodium')).toBe(true);
  });

  it('should produce different fingerprints for different barcodes when VITE_DEBUG_PERF=true', () => {
    // Mock console.info to capture fingerprints
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubEnv('VITE_DEBUG_PERF', 'true');

    const envelope1 = {
      mode: 'barcode',
      barcode: '00818148',
      product: {
        product_name: 'Healthy Granola',
        ingredients_text: 'oats, honey, nuts',
        nutriments: {
          'energy-kcal_100g': 400,
          'proteins_100g': 8,
          'carbohydrates_100g': 60,
          'fat_100g': 12,
          'sodium_100g': 0.05
        }
      }
    };

    const envelope2 = {
      mode: 'barcode',
      barcode: '12345678',
      product: {
        product_name: 'Sweet Candy', 
        ingredients_text: 'sugar, corn syrup, artificial flavors, red 40',
        nutriments: {
          'energy-kcal_100g': 350,
          'proteins_100g': 0,
          'carbohydrates_100g': 87,
          'sugars_100g': 85,
          'fat_100g': 0,
          'sodium_100g': 0.1
        }
      }
    };

    const result1 = toLegacyFromEdge(envelope1);
    const result2 = toLegacyFromEdge(envelope2);

    // Extract fingerprints from console logs
    const fingerprints = consoleSpy.mock.calls
      .filter(call => call[0] === '[BARCODE.output.fp]')
      .map(call => call[1]);

    expect(fingerprints).toHaveLength(2);
    expect(fingerprints[0]).not.toBe(fingerprints[1]);
    expect(fingerprints[0]).toContain('Healthy Granola');
    expect(fingerprints[1]).toContain('Sweet Candy');

    // Verify different scores
    expect(result1.healthScore).not.toBe(result2.healthScore);
    
    // Granola should have fewer/different flags than candy with artificial colors
    expect(result1.healthFlags.length).not.toBe(result2.healthFlags.length);

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('should use ScoreEngine when VITE_SCORE_ENGINE_V1=true', () => {
    vi.stubEnv('VITE_SCORE_ENGINE_V1', 'true');

    const envelope = {
      mode: 'barcode',
      barcode: '1111111111',
      product: {
        product_name: 'Test Product',
        ingredients_text: 'whole grains, organic sugar',
        nutriments: {
          'energy-kcal_100g': 300,
          'proteins_100g': 10,
          'carbohydrates_100g': 50,
          'fat_100g': 8,
          'fiber_100g': 5,
          'sodium_100g': 0.3
        }
      }
    };

    const result = toLegacyFromEdge(envelope);

    expect(result.healthScore).toBeGreaterThan(0);
    expect(result.healthScore).toBeLessThanOrEqual(10);
    expect(result.scoreUnit).toBe('0-10');

    vi.unstubAllEnvs();
  });

  it('should use legacy scoring when VITE_SCORE_ENGINE_V1=false', () => {
    vi.stubEnv('VITE_SCORE_ENGINE_V1', 'false');

    const envelope = {
      mode: 'barcode',
      barcode: '2222222222',
      product: {
        product_name: 'Legacy Product',
        health: { score: 7.5 },
        nutriments: {
          'energy-kcal_100g': 250,
          'proteins_100g': 5
        }
      }
    };

    const result = toLegacyFromEdge(envelope);

    expect(result.healthScore).toBe(7.5); // Should use legacy score
    expect(result.scoreUnit).toBe('0-10');

    vi.unstubAllEnvs();
  });

  it('should handle products with multiple flag types', () => {
    const envelope = {
      mode: 'barcode',
      barcode: '3333333333',
      product: {
        product_name: 'Processed Food',
        ingredients_text: 'flour, high fructose corn syrup, artificial color red 40, sodium benzoate',
        nutriments: {
          'energy-kcal_100g': 450,
          'proteins_100g': 4,
          'carbohydrates_100g': 70,
          'sugars_100g': 35, // High sugar
          'fat_100g': 15,
          'saturated-fat_100g': 8, // High sat fat 
          'sodium_100g': 0.8 // High sodium (800mg)
        }
      }
    };

    const result = toLegacyFromEdge(envelope);

    // Should detect multiple flags
    const flagKeys = result.healthFlags.map(f => f.key);
    expect(flagKeys).toContain('high_fructose_corn_syrup'); // ingredient
    expect(flagKeys).toContain('artificial_colors');        // ingredient
    expect(flagKeys).toContain('preservatives');            // ingredient
    expect(flagKeys).toContain('high_sugar');               // nutrition
    expect(flagKeys).toContain('high_saturated_fat');       // nutrition
    expect(flagKeys).toContain('high_sodium');              // nutrition

    expect(result.healthFlags.length).toBeGreaterThan(3);
  });
});