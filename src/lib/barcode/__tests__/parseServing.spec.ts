import { describe, test, expect } from 'vitest';
import { parseServingFromText, parseServingGrams } from '../map';

describe('parseServingFromText', () => {
  test('extracts grams from numeric values', () => {
    expect(parseServingFromText('32g')).toEqual({ grams: 32, text: '32g' });
    expect(parseServingFromText('32 g')).toEqual({ grams: 32, text: '32 g' });
    expect(parseServingFromText('32.5 g')).toEqual({ grams: 32.5, text: '32.5 g' });
    expect(parseServingFromText('(32g)')).toEqual({ grams: 32, text: '(32g)' });
  });

  test('extracts grams from text with portions', () => {
    expect(parseServingFromText('2 tbsp (32g)')).toEqual({ grams: 32, text: '2 tbsp (32g)' });
    expect(parseServingFromText('1/2 cup (120 ml)')).toEqual({ grams: 120, text: '1/2 cup (120 ml)' });
    expect(parseServingFromText('2/3 cup (55 g)')).toEqual({ grams: 55, text: '2/3 cup (55 g)' });
    expect(parseServingFromText('1 bar (40 g)')).toEqual({ grams: 40, text: '1 bar (40 g)' });
  });

  test('extracts from ounces', () => {
    expect(parseServingFromText('1 oz')).toEqual({ grams: 28.349523125, text: '1 oz' });
    expect(parseServingFromText('2 ounces')).toEqual({ grams: 56.69904625, text: '2 ounces' });
  });

  test('extracts from milliliters (assuming ~1 g/ml)', () => {
    expect(parseServingFromText('240 ml')).toEqual({ grams: 240, text: '240 ml' });
    expect(parseServingFromText('355ml')).toEqual({ grams: 355, text: '355ml' });
  });

  test('returns null for invalid strings', () => {
    expect(parseServingFromText('')).toEqual({ grams: null, text: undefined });
    expect(parseServingFromText('unknown')).toEqual({ grams: null, text: 'unknown' });
    expect(parseServingFromText('per 100g')).toEqual({ grams: 100, text: 'per 100g' });
  });

  test('handles european decimal format', () => {
    expect(parseServingFromText('32,5 g')).toEqual({ grams: 32.5, text: '32,5 g' });
  });
});

describe('parseServingGrams', () => {
  test('extracts from direct fields', () => {
    expect(parseServingGrams({ serving_weight_grams: 55 })).toBe(55);
    expect(parseServingGrams({ serving_size_g: 120 })).toBe(120);
    expect(parseServingGrams({ serving_grams: 85 })).toBe(85);
  });

  test('extracts from serving size strings', () => {
    expect(parseServingGrams({ serving_size: '2 tbsp (32 g)' })).toBe(32);
    expect(parseServingGrams({ serving: '170 g' })).toBe(170);
  });

  test('back-calculates from calorie ratios', () => {
    const raw = {
      nutriments: {
        'energy-kcal_100g': 100,
        'energy-kcal_serving': 55
      }
    };
    expect(parseServingGrams(raw)).toBe(55);
  });

  test('returns null when no serving info available', () => {
    expect(parseServingGrams({})).toBeNull();
    expect(parseServingGrams({ some_other_field: 'value' })).toBeNull();
  });
});