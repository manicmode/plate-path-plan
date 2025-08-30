/**
 * Tests for portion calculation utilities
 */

import { describe, it, expect } from 'vitest';
import { toPerPortion, parsePortionGrams } from './portionCalculator';

describe('Portion Calculator', () => {
  describe('parsePortionGrams', () => {
    it('should parse serving size from product data', () => {
      const productData = { serving_size: '30g' };
      const result = parsePortionGrams(productData);
      
      expect(result.grams).toBe(30);
      expect(result.isEstimated).toBe(false);
      expect(result.source).toBe('product');
    });

    it('should parse complex serving sizes', () => {
      const productData = { serving_size: '1 bar (40g)' };
      const result = parsePortionGrams(productData);
      
      expect(result.grams).toBe(40);
      expect(result.isEstimated).toBe(false);
    });

    it('should handle unit conversions', () => {
      const productData = { serving_size: '2 cookies' };
      const result = parsePortionGrams(productData);
      
      expect(result.grams).toBe(60); // 2 * 30g
      expect(result.isEstimated).toBe(false);
    });

    it('should extract from OCR text', () => {
      const ocrText = `
        Product Name
        Serving size: 25g
        Nutrition Facts
      `;
      const result = parsePortionGrams(undefined, ocrText);
      
      expect(result.grams).toBe(25);
      expect(result.source).toBe('ocr');
    });

    it('should use default when no portion found', () => {
      const result = parsePortionGrams();
      
      expect(result.grams).toBe(30);
      expect(result.isEstimated).toBe(true);
      expect(result.source).toBe('estimated');
    });
  });

  describe('toPerPortion', () => {
    const nutrition100g = {
      calories: 400,
      protein: 10,
      carbs: 50,
      fat: 20,
      sugar: 25,
      fiber: 5,
      sodium: 800
    };

    it('should scale nutrition to 30g portion', () => {
      const result = toPerPortion(nutrition100g, 30);
      
      expect(result.calories).toBe(120); // 400 * 0.3
      expect(result.protein).toBe(3.0);   // 10 * 0.3
      expect(result.sugar).toBe(7.5);     // 25 * 0.3
      expect(result.sodium).toBe(240);    // 800 * 0.3
    });

    it('should scale nutrition to 50g portion', () => {
      const result = toPerPortion(nutrition100g, 50);
      
      expect(result.calories).toBe(200); // 400 * 0.5
      expect(result.fiber).toBe(2.5);    // 5 * 0.5
    });

    it('should handle zero portion size', () => {
      const result = toPerPortion(nutrition100g, 0);
      
      expect(result).toEqual({});
    });

    it('should handle missing nutrition data', () => {
      const result = toPerPortion({}, 30);
      
      expect(result).toEqual({});
    });

    it('should round appropriately', () => {
      const nutrition = { calories: 333, protein: 13.7, sodium: 777 };
      const result = toPerPortion(nutrition, 30);
      
      expect(result.calories).toBe(100);  // rounded
      expect(result.protein).toBe(4.1);   // 1 decimal
      expect(result.sodium).toBe(233);    // rounded
    });
  });
});