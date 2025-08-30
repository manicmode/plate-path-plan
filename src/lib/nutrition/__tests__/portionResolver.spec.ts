import { describe, it, expect } from 'vitest';
import { resolvePortion } from '../portionResolver';
import { parseOCRServing } from '../parsers/ocrServing';

describe('portionResolver', () => {
  describe('parseOCRServing', () => {
    it('should extract serving size from explicit patterns', () => {
      const ocrText = 'Serving Size 55g\nCalories 210';
      const result = parseOCRServing(ocrText, 'granola');
      
      expect(result).toEqual({
        grams: 55,
        confidence: 0.9,
        source: 'serving_size',
        extractedText: 'Serving Size 55g'
      });
    });

    it('should extract grams from volume conversion', () => {
      const ocrText = '1 cup (30g)\nCalories 150';
      const result = parseOCRServing(ocrText, 'cereal');
      
      expect(result).toEqual({
        grams: 30,
        confidence: 0.8,
        source: 'volume_conversion',
        extractedText: '1 cup (30g)'
      });
    });

    it('should reject nutrient lines', () => {
      const ocrText = 'Total Fat 6g\nSugar 12g\nProtein 8g';
      const result = parseOCRServing(ocrText, 'product');
      
      expect(result).toBeNull();
    });

    it('should reject net weight', () => {
      const ocrText = 'NET WT 240g\nServing Size varies';
      const result = parseOCRServing(ocrText, 'product');
      
      expect(result).toBeNull();
    });

    it('should only accept plain grams in serving context', () => {
      const contextText = 'Per serving 40g\nCalories 180';
      const noContextText = 'Contains 40g\nTotal weight';
      
      const withContext = parseOCRServing(contextText, 'nuts');
      const withoutContext = parseOCRServing(noContextText, 'nuts');
      
      expect(withContext?.grams).toBe(40);
      expect(withoutContext).toBeNull();
    });
  });

  describe('resolvePortion', () => {
    it('should prefer database values (Granola)', async () => {
      const productData = {
        name: 'Granola',
        serving_size_g: 55,
        nutrition: {
          calories: 210,
          calories_per_100g: 381
        }
      };
      
      const result = await resolvePortion(productData);
      
      expect(result.grams).toBe(55);
      expect(result.source).toBe('database');
      expect(result.label).toBe('55g · DB');
    });

    it('should extract from OCR "1 cup (55g)" pattern', async () => {
      const productData = { name: 'Granola' };
      const ocrText = 'Nutrition Facts\n1 cup (55g)\nCalories 210';
      
      const result = await resolvePortion(productData, ocrText);
      
      expect(result.grams).toBe(55);
      expect(result.source).toBe('ocr');
      expect(result.label).toBe('55g · OCR');
    });

    it('should use database for nuts user override (40g)', async () => {
      const productData = {
        name: 'Mixed Nuts',
        serving_size_g: 40, // User/DB override
        nutrition: {
          calories: 160,
          calories_per_100g: 400
        }
      };
      
      const result = await resolvePortion(productData);
      
      expect(result.grams).toBe(40);
      expect(result.source).toBe('database');
      expect(result.label).toBe('40g · DB');
    });

    it('should calculate from per-serving kcal ratio (candy)', async () => {
      const productData = {
        name: 'Candy Bar',
        nutrition: {
          calories: 140, // per serving
          calories_per_100g: 500 // per 100g -> 140/500 * 100 = 28g
        }
      };
      
      const result = await resolvePortion(productData);
      
      expect(result.grams).toBe(28);
      expect(result.source).toBe('ratio');
      expect(result.label).toBe('28g · calc');
    });

    it('should reject NET WT and use category (cereal)', async () => {
      const productData = { name: 'Breakfast Cereal' };
      const ocrText = 'NET WT 240g\nIngredients: Corn, Sugar\nVitamins and Minerals';
      
      const result = await resolvePortion(productData, ocrText);
      
      expect(result.grams).toBe(55); // cereal category median
      expect(result.source).toBe('category');
      expect(result.label).toBe('55g · cereal');
    });

    it('should fallback to 30g for unknown products', async () => {
      const productData = { name: 'Unknown Exotic Food' };
      
      const result = await resolvePortion(productData);
      
      expect(result.grams).toBe(30);
      expect(result.source).toBe('fallback');
      expect(result.label).toBe('30g · est.');
    });

    it('should include all candidates and choose highest scored', async () => {
      const productData = {
        name: 'Granola',
        serving_size_g: 55,
        nutrition: {
          calories: 210,
          calories_per_100g: 381
        }
      };
      const ocrText = 'Serving Size 50g';
      
      const result = await resolvePortion(productData, ocrText);
      
      expect(result.candidates.length).toBeGreaterThanOrEqual(4);
      expect(result.source).toBe('database'); // DB should win over OCR
      expect(result.grams).toBe(55); // DB value, not OCR 50g
    });

    it('should respect portionOff=1 emergency override', async () => {
      // Mock URL params
      const originalSearch = window.location.search;
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, search: '?portionOff=1' }
      });
      
      const productData = {
        name: 'Granola',
        serving_size_g: 55
      };
      
      const result = await resolvePortion(productData);
      
      expect(result.grams).toBe(30);
      expect(result.source).toBe('fallback');
      expect(result.chosenFrom).toBe('emergency_override');
      
      // Restore
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, search: originalSearch }
      });
    });
  });
});