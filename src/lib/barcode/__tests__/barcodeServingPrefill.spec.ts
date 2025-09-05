import { describe, test, expect } from 'vitest';
import { mapBarcodeToRecognizedFood } from '../map';

describe('Barcode Serving Prefill', () => {
  test('shows actual serving when declared in UPC data', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'Test Cereal',
      brand: 'TestBrand',
      serving_size: '55 g',
      nutriments: {
        'energy-kcal_100g': 380,
        'proteins_100g': 8,
        'carbohydrates_100g': 75,
        'fat_100g': 3
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    expect(result.servingGrams).toBe(55);
    expect(result.portionSource).toBe('TEXT');
    expect(result.servingText).toBe('55 g');
  });

  test('uses numeric serving when available', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'Test Yogurt',
      serving_weight_grams: 170,
      nutriments: {
        'energy-kcal_100g': 100,
        'proteins_100g': 10,
        'carbohydrates_100g': 12,
        'fat_100g': 0
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    expect(result.servingGrams).toBe(170);
    expect(result.portionSource).toBe('NUMERIC');
  });

  test('falls back to 100g when no serving info', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'Unknown Product',
      nutriments: {
        'energy-kcal_100g': 200,
        'proteins_100g': 5,
        'carbohydrates_100g': 30,
        'fat_100g': 8
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    expect(result.servingGrams).toBe(100);
    expect(result.portionSource).toBe('FALLBACK');
  });

  test('back-calculates serving from calorie ratio', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'Test Bar',
      nutriments: {
        'energy-kcal_100g': 500,
        'energy-kcal_serving': 200, // 40g serving
        'proteins_100g': 10,
        'carbohydrates_100g': 60,
        'fat_g': 20
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    expect(result.servingGrams).toBe(40);
    expect(result.portionSource).toBe('KCAL_RATIO');
  });

  test('handles complex serving text', () => {
    const raw = {
      barcode: '123456789012',
      product_name: 'Peanut Butter',
      serving_size: '2 tbsp (32 g)',
      nutriments: {
        'energy-kcal_100g': 588,
        'proteins_100g': 25,
        'carbohydrates_100g': 20,
        'fat_100g': 50
      }
    };

    const result = mapBarcodeToRecognizedFood(raw);
    expect(result.servingGrams).toBe(32);
    expect(result.portionSource).toBe('TEXT');
    expect(result.servingText).toBe('2 tbsp (32 g)');
  });
});