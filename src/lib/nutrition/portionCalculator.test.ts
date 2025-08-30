/**
 * Portion Calculator Tests - Updated for V2
 * Tests for calibrated scoring and portion detection
 */

import { describe, it, expect } from 'vitest';
import { toPerPortion, parsePortionGrams } from './portionCalculator';
import { scoreProduct } from '@/lib/health/scoring';

describe('Portion Calculator V2', () => {
  describe('parsePortionGrams', () => {
    it('should parse serving size from product data', () => {
      const productData = { serving_size: '30g' };
      const result = parsePortionGrams(productData);
      
      expect(result.grams).toBe(30);
      expect(result.isEstimated).toBe(false);
      expect(result.source).toBe('db_declared');
    });

    it('should parse OCR declared portions', () => {
      const ocrText = `
        Nutrition Facts
        Serving size: 45g (1 cookie)
        Calories: 150
      `;
      
      const result = parsePortionGrams({}, ocrText);
      
      expect(result.grams).toBe(45);
      expect(result.source).toBe('ocr_declared');
      expect(result.isEstimated).toBe(false);
    });

    it('should infer from nutrition ratios', () => {
      const productData = {
        nutritionData: {
          calories: 200, // per 100g
          protein: 10,
          carbs: 30,
          fat: 8
        },
        perServingNutrition: {
          calories: 100, // per serving = 50g
          protein: 5,
          carbs: 15,
          fat: 4
        }
      };

      const result = parsePortionGrams(productData);
      
      expect(result.grams).toBe(50); // 100/200 * 100g = 50g
      expect(result.source).toBe('ocr_inferred_ratio');
      expect(result.confidence).toBe(1);
    });

    it('should use category estimates', () => {
      const productData = {
        productName: 'Greek Yogurt',
        itemName: 'Greek Yogurt'
      };

      const result = parsePortionGrams(productData);
      
      expect(result.grams).toBe(150); // Yogurt category default
      expect(result.source).toBe('model_estimate');
    });

    it('should handle unit conversions', () => {
      const productData = { serving_size: '2 cookies' };
      const result = parsePortionGrams(productData);
      
      expect(result.grams).toBe(60); // 2 * 30g
      expect(result.isEstimated).toBe(false);
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

  describe('Score Calibration', () => {
    it('should score granola around 80-85', () => {
      const granolaNutrition = {
        calories: 400,
        protein: 8,
        carbs: 65,
        fat: 12,
        saturated_fat: 2,
        sugar: 12,
        fiber: 6,
        sodium: 150
      };

      const portionSize = 30; // 30g serving
      const perServing = toPerPortion(granolaNutrition, portionSize);

      const score = scoreProduct({
        per100g: granolaNutrition,
        perServing,
        meta: {
          category: 'cereal',
          name: 'Granola',
          brand: 'Test'
        },
        flags: []
      });

      expect(score).toBeGreaterThanOrEqual(78);
      expect(score).toBeLessThanOrEqual(88);
    });

    it('should score sour punch around 45-55', () => {
      const candyNutrition = {
        calories: 350,
        protein: 0,
        carbs: 87,
        fat: 0,
        saturated_fat: 0,
        sugar: 70,
        fiber: 0,
        sodium: 50
      };

      const portionSize = 50; // 50g serving
      const perServing = toPerPortion(candyNutrition, portionSize);

      const score = scoreProduct({
        per100g: candyNutrition,
        perServing,
        meta: {
          category: 'candy',
          name: 'Sour Punch',
          brand: 'Test',
          isUltraProcessed: true
        },
        flags: ['artificial_colors', 'high_fructose_corn_syrup']
      });

      expect(score).toBeGreaterThanOrEqual(42);
      expect(score).toBeLessThanOrEqual(58);
    });
  });
});