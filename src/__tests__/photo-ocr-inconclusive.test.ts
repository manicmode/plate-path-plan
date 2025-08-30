import { describe, it, expect, vi } from 'vitest';
import { hasLabelData, shouldReturnInconclusive, isFrontOfPack } from '@/lib/health/adapters/inconclusiveAnalyzer';

describe('Photo OCR Inconclusive Detection', () => {
  describe('hasLabelData', () => {
    it('should return false for empty text', () => {
      expect(hasLabelData('')).toBe(false);
      expect(hasLabelData('   ')).toBe(false);
    });

    it('should return false for short text', () => {
      expect(hasLabelData('Coca Cola')).toBe(false);
    });

    it('should return true for text with ingredients', () => {
      const text = 'Product Name Ingredients: Water, Sugar, Natural Flavors, Citric Acid, Caffeine Contains: No allergens';
      expect(hasLabelData(text)).toBe(true);
    });

    it('should return true for text with nutrition facts', () => {
      const text = 'Nutrition Facts Calories 140 Total Fat 0g Sodium 35mg Total Carbohydrate 39g Sugars 39g Protein 0g Vitamin C 100%';
      expect(hasLabelData(text)).toBe(true);
    });

    it('should return true for text with nutrition table pattern', () => {
      const text = 'Calories 240 Protein 8g 15% Fat 12g 18% Carbs 30g 10% Sugar 15g Sodium 420mg 18%';
      expect(hasLabelData(text)).toBe(true);
    });

    it('should return false for marketing text without nutrition/ingredients', () => {
      const text = 'New Improved Formula! Delicious Premium Original Taste Fresh Natural Organic Authentic Traditional';
      expect(hasLabelData(text)).toBe(false);
    });
  });

  describe('isFrontOfPack', () => {
    it('should return true for marketing heavy text', () => {
      const text = 'New Original Premium Delicious Fresh Natural Net Wt 12 oz';
      expect(isFrontOfPack(text)).toBe(true);
    });

    it('should return false for ingredients/nutrition text', () => {
      const text = 'Ingredients: Water, Sugar Nutrition Facts Calories 140 Daily Value Protein 2g Allergen Information Contains Milk';
      expect(isFrontOfPack(text)).toBe(false);
    });

    it('should return false for empty text', () => {
      expect(isFrontOfPack('')).toBe(false);
    });
  });

  describe('shouldReturnInconclusive', () => {
    it('should return inconclusive for insufficient text', () => {
      const result = shouldReturnInconclusive('Short text');
      expect(result).toMatchObject({
        status: 'inconclusive',
        reason: 'insufficient_text'
      });
    });

    it('should return inconclusive for front-of-pack content', () => {
      const text = 'New Improved Premium Delicious Fresh Natural Original Classic Gourmet Net Wt 16 oz';
      const result = shouldReturnInconclusive(text);
      expect(result).toMatchObject({
        status: 'inconclusive', 
        reason: 'front_of_pack'
      });
    });

    it('should return inconclusive when no label data detected', () => {
      const text = 'This is some random text that doesn\'t contain any ingredients or nutrition information at all here';
      const result = shouldReturnInconclusive(text);
      expect(result).toMatchObject({
        status: 'inconclusive',
        reason: 'no_ingredients' 
      });
    });

    it('should return null for valid ingredients text', () => {
      const text = 'Product Name Ingredients: Water, Sugar, Natural Flavors, Citric Acid Contains: No allergens information';
      const result = shouldReturnInconclusive(text);
      expect(result).toBeNull();
    });

    it('should return null for valid nutrition text', () => {
      const text = 'Nutrition Facts Serving Size 1 cup Calories 140 Total Fat 0g Sodium 35mg Total Carbohydrate 39g Sugars 39g Protein 0g';
      const result = shouldReturnInconclusive(text);
      expect(result).toBeNull();
    });

    it('should return inconclusive for low confidence parser result', () => {
      const text = 'Valid ingredients text here with enough words to pass the length check and nutrition info';
      const parseResult = { ok: false, reason: 'low_confidence' };
      const result = shouldReturnInconclusive(text, parseResult);
      expect(result).toMatchObject({
        status: 'inconclusive',
        reason: 'low_confidence'
      });
    });

    it('should return inconclusive for low confidence score', () => {
      const text = 'Valid ingredients text here with enough words to pass the length check and nutrition info';
      const result = shouldReturnInconclusive(text, undefined, 0.2);
      expect(result).toMatchObject({
        status: 'inconclusive',
        reason: 'low_confidence'
      });
    });
  });
});