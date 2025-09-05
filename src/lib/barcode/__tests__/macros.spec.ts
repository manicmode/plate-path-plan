import { describe, test, expect } from 'vitest';
import { mapBarcodeToRecognizedFood } from '../map';

describe('Barcode Macros Scaling', () => {
  test('Case A: Provider provides per-serving - should use SERVING_PROVIDER mode', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'Test Yogurt Cup',
      serving_weight_grams: 170,
      nutriments: {
        'energy-kcal_100g': 100,
        'energy-kcal_serving': 170, // Direct serving value
        'proteins_100g': 10,
        'proteins_serving': 17, // Direct serving value
        'carbohydrates_100g': 12,
        'carbohydrates_serving': 20,
        'fat_100g': 0,
        'fat_serving': 0
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    
    expect(result.macro_mode).toBe('SERVING_PROVIDER');
    expect(result.calories_serving).toBe(170);
    expect(result.protein_g_serving).toBe(17);
    expect(result.carbs_g_serving).toBe(20);
    expect(result.fat_g_serving).toBe(0);
    // Legacy fields should match serving values
    expect(result.calories).toBe(170);
    expect(result.protein_g).toBe(17);
  });

  test('Case B: Only per-100g + servingGrams - should use SCALED_FROM_100G mode', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'Test Cereal',
      serving_size: '55 g',
      nutriments: {
        'energy-kcal_100g': 370, // 100g has 370 kcal
        'proteins_100g': 8,
        'carbohydrates_100g': 75,
        'fat_100g': 3,
        'fiber_100g': 5,
        'sugars_100g': 10
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    
    expect(result.macro_mode).toBe('SCALED_FROM_100G');
    expect(result.servingGrams).toBe(55);
    // Should scale: 370 * 0.55 = 203.5, rounded = 204
    expect(result.calories_serving).toBe(204);
    expect(result.protein_g_serving).toBe(4.4); // 8 * 0.55 = 4.4
    expect(result.carbs_g_serving).toBe(41.3); // 75 * 0.55 = 41.25 rounded to 41.3
    expect(result.fat_g_serving).toBe(1.7); // 3 * 0.55 = 1.65 rounded to 1.7
    // Legacy fields should match serving values
    expect(result.calories).toBe(204);
    expect(result.protein_g).toBe(4.4);
  });

  test('Case C: Only per-100g, serving unknown (100g fallback) - should use PER100G_FALLBACK mode', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'Unknown Product',
      nutriments: {
        'energy-kcal_100g': 250,
        'proteins_100g': 15,
        'carbohydrates_100g': 30,
        'fat_100g': 8
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    
    expect(result.macro_mode).toBe('PER100G_FALLBACK');
    expect(result.servingGrams).toBe(100); // Fallback to 100g
    expect(result.calories_serving).toBe(250); // Same as per-100g
    expect(result.protein_g_serving).toBe(15);
    expect(result.carbs_g_serving).toBe(30);
    expect(result.fat_g_serving).toBe(8);
    // Legacy fields should match
    expect(result.calories).toBe(250);
    expect(result.protein_g).toBe(15);
  });

  test('converts kJ to kcal when necessary', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'European Product',
      serving_size: '40 g',
      nutriments: {
        'energy-kj_100g': 2092, // kJ value: 2092 / 4.184 ≈ 500 kcal
        'proteins_100g': 10,
        'carbohydrates_100g': 60,
        'fat_100g': 20
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    
    expect(result.macro_mode).toBe('SCALED_FROM_100G');
    expect(result.calories_per_100g).toBe(500); // kJ converted to kcal
    expect(result.calories_serving).toBe(200); // 500 * 0.4 = 200
  });

  test('handles mixed serving and 100g data properly', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'Peanut Butter',
      serving_size: '2 tbsp (32 g)',
      nutriments: {
        'energy-kcal_100g': 588,
        'energy-kcal_serving': 188, // Direct serving value provided
        'proteins_100g': 25,
        // No proteins_serving - should fall back to scaled value
        'carbohydrates_100g': 20,
        'fat_100g': 50,
        'fat_serving': 16 // Direct serving value
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    
    expect(result.macro_mode).toBe('SERVING_PROVIDER');
    expect(result.calories_serving).toBe(188); // Uses direct serving value
    expect(result.protein_g_serving).toBe(25); // Falls back to 100g value since no serving provided
    expect(result.fat_g_serving).toBe(16); // Uses direct serving value
  });
});