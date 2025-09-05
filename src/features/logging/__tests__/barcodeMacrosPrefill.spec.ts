import { describe, test, expect } from 'vitest';
import { mapBarcodeToRecognizedFood } from '@/lib/barcode/map';

describe('Barcode Macros Prefill Integration', () => {
  test('Mock cereal: kcal_100g=370, servingGrams=55 → expect confirm shows ≈204 kcal', () => {
    const cerealData = {
      barcode: '012345678901',
      product_name: 'Breakfast Cereal',
      brand: 'CerealCorp',
      serving_size: '2/3 cup (55 g)',
      nutriments: {
        'energy-kcal_100g': 370,
        'proteins_100g': 8,
        'carbohydrates_100g': 75,
        'fat_100g': 3,
        'fiber_100g': 5,
        'sugars_100g': 12
      }
    };

    const result = mapBarcodeToRecognizedFood(cerealData);
    
    expect(result.servingGrams).toBe(55);
    expect(result.macro_mode).toBe('SCALED_FROM_100G');
    expect(result.calories_serving).toBe(204); // round(370 * 0.55) = 204
    expect(result.protein_g_serving).toBe(4.4); // round(8 * 0.55 * 10) / 10 = 4.4
    expect(result.carbs_g_serving).toBe(41.3); // round(75 * 0.55 * 10) / 10 = 41.3
    expect(result.fat_g_serving).toBe(1.7); // round(3 * 0.55 * 10) / 10 = 1.7
    
    // Legacy fields for UI compatibility
    expect(result.calories).toBe(204);
    expect(result.protein_g).toBe(4.4);
    expect(result.carbs_g).toBe(41.3);
    expect(result.fat_g).toBe(1.7);
  });

  test('Mock yogurt: kcal_serving=170, servingGrams=170 → expect 170 kcal, mode SERVING_PROVIDER', () => {
    const yogurtData = {
      barcode: '012345678902',
      product_name: 'Greek Yogurt',
      brand: 'YogurtBrand',
      serving_weight_grams: 170,
      nutriments: {
        'energy-kcal_100g': 100,
        'energy-kcal_serving': 170, // Provider gives direct serving value
        'proteins_100g': 10,
        'proteins_serving': 17,
        'carbohydrates_100g': 12,
        'carbohydrates_serving': 20,
        'fat_100g': 0,
        'fat_serving': 0,
        'sugars_100g': 8,
        'sugars_serving': 14
      }
    };

    const result = mapBarcodeToRecognizedFood(yogurtData);
    
    expect(result.servingGrams).toBe(170);
    expect(result.macro_mode).toBe('SERVING_PROVIDER');
    expect(result.calories_serving).toBe(170);
    expect(result.protein_g_serving).toBe(17);
    expect(result.carbs_g_serving).toBe(20);
    expect(result.fat_g_serving).toBe(0);
    expect(result.sugar_g_serving).toBe(14);
    
    // Legacy fields should match
    expect(result.calories).toBe(170);
    expect(result.protein_g).toBe(17);
  });

  test('Mock bar: per-100g only, kcal_100g=500, servingGrams=40 → expect 200 kcal, scaled', () => {
    const barData = {
      barcode: '012345678903',
      product_name: 'Protein Bar',
      brand: 'BarBrand',
      serving_size: '1 bar (40 g)',
      nutriments: {
        'energy-kcal_100g': 500,
        'proteins_100g': 20,
        'carbohydrates_100g': 45,
        'fat_100g': 18,
        'fiber_100g': 8,
        'sugars_100g': 25,
        'sodium_100g': 200
      }
    };

    const result = mapBarcodeToRecognizedFood(barData);
    
    expect(result.servingGrams).toBe(40);
    expect(result.macro_mode).toBe('SCALED_FROM_100G');
    expect(result.calories_serving).toBe(200); // round(500 * 0.4) = 200
    expect(result.protein_g_serving).toBe(8.0); // round(20 * 0.4 * 10) / 10 = 8.0
    expect(result.carbs_g_serving).toBe(18.0); // round(45 * 0.4 * 10) / 10 = 18.0
    expect(result.fat_g_serving).toBe(7.2); // round(18 * 0.4 * 10) / 10 = 7.2
    expect(result.fiber_g_serving).toBe(3.2); // round(8 * 0.4 * 10) / 10 = 3.2
    expect(result.sodium_mg_serving).toBe(80); // round(200 * 0.4) = 80
    
    // Legacy fields
    expect(result.calories).toBe(200);
    expect(result.protein_g).toBe(8.0);
  });

  test('Mock peanut butter: kcal_100g=588, servingGrams=32 → expect ≈188 kcal', () => {
    const peanutButterData = {
      barcode: '012345678904',
      product_name: 'Natural Peanut Butter',
      brand: 'NutBrand',
      serving_size: '2 tbsp (32 g)',
      nutriments: {
        'energy-kcal_100g': 588,
        'proteins_100g': 25,
        'carbohydrates_100g': 20,
        'fat_100g': 50,
        'fiber_100g': 8,
        'sugars_100g': 3,
        'sodium_100g': 17
      }
    };

    const result = mapBarcodeToRecognizedFood(peanutButterData);
    
    expect(result.servingGrams).toBe(32);
    expect(result.macro_mode).toBe('SCALED_FROM_100G');
    expect(result.calories_serving).toBe(188); // round(588 * 0.32) = 188
    expect(result.protein_g_serving).toBe(8.0); // round(25 * 0.32 * 10) / 10 = 8.0
    expect(result.fat_g_serving).toBe(16.0); // round(50 * 0.32 * 10) / 10 = 16.0
  });

  test('Mock can: kcal_100g=42, grams=355 → expect ≈149 kcal', () => {
    const canData = {
      barcode: '012345678905',
      product_name: 'Soda Can',
      brand: 'SodaBrand',
      serving_size: '355 ml',
      nutriments: {
        'energy-kcal_100g': 42, // Per 100ml for beverages
        'carbohydrates_100g': 10.6,
        'sugars_100g': 10.6
      }
    };

    const result = mapBarcodeToRecognizedFood(canData);
    
    expect(result.servingGrams).toBe(355);
    expect(result.macro_mode).toBe('SCALED_FROM_100G');
    expect(result.calories_serving).toBe(149); // round(42 * 3.55) = 149
    expect(result.carbs_g_serving).toBe(37.6); // round(10.6 * 3.55 * 10) / 10 = 37.6
    expect(result.sugar_g_serving).toBe(37.6);
  });

  test('preserves per-100g values for reference', () => {
    const testData = {
      barcode: '012345678906',
      product_name: 'Test Product',
      serving_size: '50 g',
      nutriments: {
        'energy-kcal_100g': 400,
        'proteins_100g': 12,
        'carbohydrates_100g': 60,
        'fat_100g': 15
      }
    };

    const result = mapBarcodeToRecognizedFood(testData);
    
    // Per-100g values should be preserved
    expect(result.calories_per_100g).toBe(400);
    expect(result.protein_g_per_100g).toBe(12);
    expect(result.carbs_g_per_100g).toBe(60);
    expect(result.fat_g_per_100g).toBe(15);
    
    // Per-serving values should be scaled
    expect(result.calories_serving).toBe(200); // 400 * 0.5
    expect(result.protein_g_serving).toBe(6.0); // 12 * 0.5
    expect(result.carbs_g_serving).toBe(30.0); // 60 * 0.5
    expect(result.fat_g_serving).toBe(7.5); // 15 * 0.5
  });
});