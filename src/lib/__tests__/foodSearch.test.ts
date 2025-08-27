import { describe, it, expect } from 'vitest';
import { searchResultToLegacyProduct, CanonicalSearchResult } from '../foodSearch';

describe('searchResultToLegacyProduct', () => {
  it('transforms complete result with all fields', () => {
    const result: CanonicalSearchResult = {
      source: 'off',
      id: '1234567890123',
      name: 'Organic Vanilla Almond Granola',
      brand: 'Trader Joe\'s',
      imageUrl: 'https://example.com/image.jpg',
      servingHint: 'per 55g',
      caloriesPer100g: 450,
      confidence: 0.95
    };

    const legacy = searchResultToLegacyProduct(result);

    expect(legacy).toEqual({
      productName: 'Organic Vanilla Almond Granola',
      barcode: null, // ID is not a barcode format
      brand: 'Trader Joe\'s',
      imageUrl: 'https://example.com/image.jpg',
      ingredientsText: null,
      healthScore: null,
      healthFlags: [],
      nutrition: {
        calories: 450,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
        sugar: null,
        sodium: null
      },
      status: 'ok',
      recommendation: null,
      servingHint: 'per 55g',
      source: 'off'
    });
  });

  it('handles barcode ID format', () => {
    const result: CanonicalSearchResult = {
      source: 'off',
      id: 'barcode:1234567890123',
      name: 'Test Product',
      confidence: 0.8
    };

    const legacy = searchResultToLegacyProduct(result);

    expect(legacy.barcode).toBe('1234567890123');
    expect(legacy.productName).toBe('Test Product');
  });

  it('handles minimal result with only required fields', () => {
    const result: CanonicalSearchResult = {
      source: 'fdc',
      id: 'fdc-12345',
      name: 'Basic Product'
    };

    const legacy = searchResultToLegacyProduct(result);

    expect(legacy).toEqual({
      productName: 'Basic Product',
      barcode: null,
      brand: null,
      imageUrl: null,
      ingredientsText: null,
      healthScore: null,
      healthFlags: [],
      nutrition: null,
      status: 'ok',
      recommendation: null,
      servingHint: undefined,
      source: 'fdc'
    });
  });

  it('handles missing brand gracefully', () => {
    const result: CanonicalSearchResult = {
      source: 'off',
      id: '98765',
      name: 'No Brand Product',
      caloriesPer100g: 300
    };

    const legacy = searchResultToLegacyProduct(result);

    expect(legacy.brand).toBeNull();
    expect(legacy.nutrition?.calories).toBe(300);
  });

  it('handles missing image gracefully', () => {
    const result: CanonicalSearchResult = {
      source: 'off',
      id: '11111',
      name: 'No Image Product',
      brand: 'Generic Brand'
    };

    const legacy = searchResultToLegacyProduct(result);

    expect(legacy.imageUrl).toBeNull();
    expect(legacy.brand).toBe('Generic Brand');
  });

  it('handles missing nutrition data', () => {
    const result: CanonicalSearchResult = {
      source: 'local',
      id: 'local-123',
      name: 'Local Product'
    };

    const legacy = searchResultToLegacyProduct(result);

    expect(legacy.nutrition).toBeNull();
    expect(legacy.source).toBe('local');
  });

  it('preserves serving hint when present', () => {
    const result: CanonicalSearchResult = {
      source: 'off',
      id: '22222',
      name: 'Serving Product',
      servingHint: 'per 2 slices (45g)',
      caloriesPer100g: 250
    };

    const legacy = searchResultToLegacyProduct(result);

    expect(legacy.servingHint).toBe('per 2 slices (45g)');
    expect(legacy.nutrition?.calories).toBe(250);
  });

  it('sets status to ok by default', () => {
    const result: CanonicalSearchResult = {
      source: 'off',
      id: '33333',
      name: 'Status Test Product'
    };

    const legacy = searchResultToLegacyProduct(result);

    expect(legacy.status).toBe('ok');
  });
});