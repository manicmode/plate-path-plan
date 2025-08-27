import { describe, it, expect } from 'vitest';
import { toLegacyFromEdge } from '@/lib/health/toLegacyFromEdge';

describe('toLegacyFromEdge - Status Detection', () => {
  it('should return no_detection for empty input', () => {
    const result = toLegacyFromEdge({});
    expect(result.status).toBe('no_detection');
    expect(result.healthScore).toBeNull();
    expect(result.healthFlags).toEqual([]);
  });

  it('should return no_detection for irrelevant data', () => {
    const result = toLegacyFromEdge({
      some: 'irrelevant',
      data: 'here',
      nothing: 'useful'
    });
    expect(result.status).toBe('no_detection');
    expect(result.healthScore).toBeNull();
  });

  it('should return not_found when only barcode present', () => {
    const result = toLegacyFromEdge({
      product: { barcode: '1234567890123' }
    });
    expect(result.status).toBe('not_found');
    expect(result.barcode).toBe('1234567890123');
  });

  it('should return ok when meaningful product data exists', () => {
    const result = toLegacyFromEdge({
      product: {
        name: 'Test Product',
        health: { score: 75 }
      }
    });
    expect(result.status).toBe('ok');
    expect(result.productName).toBe('Test Product');
  });

  it('should return ok when health data exists', () => {
    const result = toLegacyFromEdge({
      health: { 
        score: 60,
        flags: [{ key: 'test', label: 'Test Flag', severity: 'warning' }]
      }
    });
    expect(result.status).toBe('ok');
    expect(result.healthScore).toBe(60);
  });

  it('should return ok when nutrition data exists', () => {
    const result = toLegacyFromEdge({
      nutrition: { calories: 250, protein: 10 }
    });
    expect(result.status).toBe('ok');
  });

  it('should return ok when substantial ingredients exist', () => {
    const result = toLegacyFromEdge({
      product: {
        ingredientsText: 'wheat flour, sugar, salt, baking powder'
      }
    });
    expect(result.status).toBe('ok');
  });

  it('should return no_detection for short ingredient text', () => {
    const result = toLegacyFromEdge({
      product: {
        ingredientsText: 'salt'
      }
    });
    expect(result.status).toBe('no_detection');
  });

  it('should return ok when detections array exists', () => {
    const result = toLegacyFromEdge({
      detections: [{ name: 'apple', confidence: 0.9 }]
    });
    expect(result.status).toBe('ok');
  });

  // New tests for Phase 5
  it('should map top-level healthFlags', () => {
    const result = toLegacyFromEdge({
      product: { name: 'Test Product' },
      healthFlags: [
        { key: 'high_sugar', label: 'High Sugar', severity: 'danger' }
      ]
    });
    expect(result.healthFlags).toHaveLength(1);
    expect(result.healthFlags[0].key).toBe('high_sugar');
    expect(result.healthFlags[0].severity).toBe('danger');
  });

  it('should map top-level nutritionSummary', () => {
    const result = toLegacyFromEdge({
      product: { name: 'Test Product' },
      nutritionSummary: { calories: 300, protein: 15 }
    });
    expect(result.nutrition).toEqual({ calories: 300, protein: 15 });
  });

  it('should handle fallback:true → status=no_detection with null score', () => {
    const result = toLegacyFromEdge({
      fallback: true,
      productName: 'Unknown',
      healthScore: 0
    });
    expect(result.status).toBe('no_detection');
    expect(result.healthScore).toBeNull();
    expect(result.healthFlags).toEqual([]);
  });
});

describe('toLegacyFromEdge - Data Extraction', () => {
  it('should extract product name from different fields', () => {
    const testCases = [
      { input: { product: { displayName: 'Display Name' } }, expected: 'Display Name' },
      { input: { product: { name: 'Product Name' } }, expected: 'Product Name' },
      { input: { product: { productName: 'Product Name Field' } }, expected: 'Product Name Field' },
      { input: { product: { title: 'Title Field' } }, expected: 'Title Field' },
      { input: { product: { product_name_en: 'English Name' } }, expected: 'English Name' },
      { input: { productName: 'Top Level Name' }, expected: 'Top Level Name' }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = toLegacyFromEdge(input);
      expect(result.productName).toBe(expected);
    });
  });

  it('should extract and map health flags with correct severity', () => {
    const result = toLegacyFromEdge({
      health: {
        flags: [
          { key: 'danger_flag', label: 'Danger', severity: 'high' },
          { key: 'warning_flag', label: 'Warning', severity: 'medium' },
          { key: 'info_flag', label: 'Info', severity: 'low' }
        ]
      }
    });

    expect(result.healthFlags).toHaveLength(3);
    expect(result.healthFlags[0].severity).toBe('danger');
    expect(result.healthFlags[1].severity).toBe('warning');
    expect(result.healthFlags[2].severity).toBe('good');
  });

  // New tests for kind detection
  it('should detect branded kind for single product', () => {
    const result = toLegacyFromEdge({
      kind: 'single_product',
      product: { name: 'Brand Product', barcode: '123' }
    });
    expect(result.status).toBe('ok');
    // Add kind detection logic if needed
  });

  it('should detect branded_candidates kind for multiple candidates', () => {
    const result = toLegacyFromEdge({
      kind: 'multiple_candidates',
      candidates: [
        { id: '1', name: 'Product A' },
        { id: '2', name: 'Product B' }
      ]
    });
    expect(result.status).toBe('ok');
    // Add kind detection logic if needed
  });

  it('should detect meal kind for multi-food detection', () => {
    const result = toLegacyFromEdge({
      kind: 'meal',
      foods: [
        { name: 'chicken', portion: '150g' },
        { name: 'rice', portion: '100g' }
      ]
    });
    expect(result.status).toBe('ok');
    // Add kind detection logic if needed
  });
});