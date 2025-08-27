import { describe, it, expect } from 'vitest';
import { toLegacyFromEdge } from '@/lib/health/toLegacyFromEdge';

describe('toLegacyFromEdge', () => {
  describe('status detection', () => {
    it('should return no_detection status when no meaningful data is present', () => {
      const emptyResult = {
        product: {}
      };
      
      const legacy = toLegacyFromEdge(emptyResult);
      
      expect(legacy.status).toBe('no_detection');
      expect(legacy.healthScore).toBeNull();
      expect(legacy.healthFlags).toEqual([]);
      expect(legacy.recommendation).toBeNull();
    });

    it('should return no_detection status for Unknown product names', () => {
      const unknownResult = {
        product: {
          name: 'Unknown product'
        }
      };
      
      const legacy = toLegacyFromEdge(unknownResult);
      
      expect(legacy.status).toBe('no_detection');
      expect(legacy.healthScore).toBeNull();
    });

    it('should return not_found status when barcode exists but no product name', () => {
      const barcodeOnlyResult = {
        product: {
          barcode: '123456789'
        }
      };
      
      const legacy = toLegacyFromEdge(barcodeOnlyResult);
      
      expect(legacy.status).toBe('not_found');
      expect(legacy.barcode).toBe('123456789');
    });

    it('should return ok status when meaningful data is present', () => {
      const validResult = {
        product: {
          name: 'Organic Quinoa',
          health: {
            score: 85,
            flags: []
          }
        }
      };
      
      const legacy = toLegacyFromEdge(validResult);
      
      expect(legacy.status).toBe('ok');
      expect(legacy.productName).toBe('Organic Quinoa');
      expect(legacy.healthScore).toBe(85);
    });

    it('should return ok status when nutrition data is present', () => {
      const nutritionResult = {
        product: {
          nutrition: {
            calories: 200,
            protein: 10
          }
        }
      };
      
      const legacy = toLegacyFromEdge(nutritionResult);
      
      expect(legacy.status).toBe('ok');
      expect(legacy.nutrition).toEqual({
        calories: 200,
        protein: 10
      });
    });

    it('should return ok status when ingredients are present', () => {
      const ingredientsResult = {
        product: {
          ingredientsText: 'Organic quinoa, water, salt'
        }
      };
      
      const legacy = toLegacyFromEdge(ingredientsResult);
      
      expect(legacy.status).toBe('ok');
      expect(legacy.ingredientsText).toBe('Organic quinoa, water, salt');
    });

    it('should return ok status when detections array is present', () => {
      const detectionsResult = {
        detections: [
          { label: 'apple', confidence: 0.95 }
        ]
      };
      
      const legacy = toLegacyFromEdge(detectionsResult);
      
      expect(legacy.status).toBe('ok');
    });

    it('should ignore short ingredient text for signal detection', () => {
      const shortIngredientsResult = {
        product: {
          ingredientsText: 'salt'
        }
      };
      
      const legacy = toLegacyFromEdge(shortIngredientsResult);
      
      expect(legacy.status).toBe('no_detection');
    });
  });

  describe('data extraction', () => {
    it('should extract product name from various fields', () => {
      const result = {
        product: {
          productName: 'Test Product'
        }
      };
      
      const legacy = toLegacyFromEdge(result);
      
      expect(legacy.productName).toBe('Test Product');
      expect(legacy.status).toBe('ok');
    });

    it('should extract health flags correctly', () => {
      const result = {
        product: {
          name: 'Test Product',
          health: {
            flags: [
              { key: 'sugar', label: 'High Sugar', severity: 'danger' },
              { key: 'sodium', label: 'High Sodium', severity: 'warning' }
            ]
          }
        }
      };
      
      const legacy = toLegacyFromEdge(result);
      
      expect(legacy.healthFlags).toHaveLength(2);
      expect(legacy.healthFlags[0].severity).toBe('danger');
      expect(legacy.healthFlags[1].severity).toBe('warning');
    });
  });
});