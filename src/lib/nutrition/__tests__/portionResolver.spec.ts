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
    it('should prefer database values', async () => {
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

    it('should calculate from nutrition ratio when DB missing', async () => {
      const productData = {
        name: 'Nuts',
        nutrition: {
          calories: 160,
          calories_per_100g: 400
        }
      };
      
      const result = await resolvePortion(productData);
      
      expect(result.grams).toBe(40);
      expect(result.source).toBe('ratio');
      expect(result.label).toBe('40g · calc');
    });

    it('should use OCR when other methods unavailable', async () => {
      const productData = { name: 'Cereal' };
      const ocrText = 'Serving Size 30g\nCalories 110';
      
      const result = await resolvePortion(productData, ocrText);
      
      expect(result.grams).toBe(30);
      expect(result.source).toBe('ocr');
      expect(result.label).toBe('30g · OCR');
    });

    it('should estimate from category for unknown products', async () => {
      const productData = { name: 'Mixed Nuts Premium' };
      
      const result = await resolvePortion(productData);
      
      expect(result.grams).toBe(40);
      expect(result.source).toBe('category');
      expect(result.label).toBe('40g · nuts');
    });

    it('should fallback to 30g for completely unknown products', async () => {
      const productData = { name: 'Unknown Food Product' };
      
      const result = await resolvePortion(productData);
      
      expect(result.grams).toBe(30);
      expect(result.source).toBe('fallback');
      expect(result.label).toBe('30g · est.');
    });

    it('should include all candidates in result', async () => {
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
      
      expect(result.candidates).toHaveLength(4); // DB, ratio, OCR, category
      expect(result.candidates[0].source).toBe('database'); // Highest scored
    });
  });
});