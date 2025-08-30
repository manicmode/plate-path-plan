/**
 * Unit tests for portion detection safe implementation V2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectPortionSafe, getPortionInfoSync, formatPortionDisplay } from './portionDetectionSafe';

// Mock window global for feature flags
(global as any).window = {
  location: { search: '' },
  URLSearchParams: URLSearchParams
};

beforeEach(() => {
  // Reset all flags
  delete (global as any).window.__flags;
  delete (global as any).window.__emergencyPortionsDisabled;
  (global as any).window.location.search = '';
});

describe('Portion Detection Safe V2 - Zero Spillover', () => {

  describe('detectPortionSafe', () => {
    it('should return fallback when detection is disabled', async () => {
      // Disable via URL parameter
      (global as any).window.location.search = '?portionOff=1';

      const result = await detectPortionSafe({}, '', 'test');

      expect(result.grams).toBe(30);
      expect(result.source).toBe('fallback');
      expect(result.label).toBe('30g · est.');
    });

    it('should parse OCR text for grams', async () => {
      const ocrText = 'Serving size 1 cup (55 g)';

      const result = await detectPortionSafe({}, ocrText, 'test');

      expect(result.grams).toBe(55);
      expect(result.source).toBe('ocr');
      expect(result.label).toBe('55g · OCR');
    });

    it('should use nutrition ratios when available', async () => {
      const productData = {
        nutrients: {
          energy_kcal_100g: 400,
          energy_kcal: 112 // This implies 28g serving (112/400 * 100)
        }
      };

      const result = await detectPortionSafe(productData, '', 'test');

      expect(result.grams).toBe(28);
      expect(result.source).toBe('nutrition_ratio');
      expect(result.label).toBe('28g · calc');
    });

    it('should use category estimates as fallback', async () => {
      const productData = { category: 'cereals' };

      const result = await detectPortionSafe(productData, '', 'test');

      expect(result.grams).toBe(55);
      expect(result.source).toBe('category_estimate');
    });

    it('should handle ml to grams conversion', async () => {
      const ocrText = 'Serving size 240 ml';

      const result = await detectPortionSafe({}, ocrText, 'test');

      expect(result.grams).toBe(240); // 1:1 ratio for default
      expect(result.source).toBe('ocr');
    });

    it('should reject out-of-bounds values', async () => {
      const ocrText = 'Serving size 500 g'; // Too large

      const result = await detectPortionSafe({}, ocrText, 'test');

      // Should fall back to category estimate or fallback
      expect(result.grams).toBeLessThanOrEqual(250);
      expect(result.grams).toBeGreaterThanOrEqual(5);
    });

    it('should handle emergency kill switch', async () => {
      (global as any).window.__emergencyPortionsDisabled = true;

      const result = await detectPortionSafe({}, '', 'test');

      expect(result.grams).toBe(30);
      expect(result.source).toBe('fallback');
    });
  });

  describe('Legacy compatibility functions', () => {
    it('should convert PortionResult to legacy PortionInfo format', () => {
      const portionResult = {
        grams: 45,
        source: 'ocr' as const,
        label: '45g · OCR'
      };

      const result = getPortionInfoSync(portionResult);
      expect(result.grams).toBe(45);
      expect(result.isEstimated).toBe(false);
      expect(result.confidence).toBe(0.9);
    });

    it('should return fallback when no data', () => {
      const result = getPortionInfoSync();
      expect(result.grams).toBe(30);
      expect(result.isEstimated).toBe(true);
      expect(result.source).toBe('fallback');
    });

    it('should format display correctly', () => {
      const portionInfo = {
        grams: 55,
        source: 'ocr',
        label: '55g · OCR'
      };

      const result = formatPortionDisplay(portionInfo);
      expect(result).toBe('55g · OCR');
    });
  });

  describe('OCR parsing patterns - comprehensive coverage', () => {
    const testCases = [
      { text: 'Serving size 1 cup (55 g)', expected: 55, description: 'serving size with grams in parentheses' },
      { text: '30g per serving', expected: 30, description: 'direct grams pattern' },
      { text: 'Serving: 2/3 cup', expected: 40, description: 'fraction cups conversion' },
      { text: '240 ml serving', expected: 240, description: 'ml to grams conversion' },
      { text: 'serving size (28g)', expected: 28, description: 'grams in parentheses' },
      { text: '1.5 cups cereal', expected: 90, description: 'decimal cups with category' }
    ];

    testCases.forEach(({ text, expected, description }) => {
      it(`should parse ${description}: "${text}"`, async () => {
        const product = text.includes('cereal') ? { category: 'cereals' } : {};
        const result = await detectPortionSafe(product, text, 'test');
        expect(result.grams).toBe(expected);
        expect(result.source).toBe('ocr');
      });
    });
  });

  describe('Error handling and safety - zero spillover verification', () => {
    it('should never throw errors', async () => {
      // Test with completely invalid inputs
      await expect(detectPortionSafe(null as any, null as any, '')).resolves.toBeDefined();
      await expect(detectPortionSafe(undefined as any, undefined as any, 'test')).resolves.toBeDefined();
      
      // Should always return valid portion info
      const result = await detectPortionSafe(null as any, null as any, '');
      expect(typeof result.grams).toBe('number');
      expect(result.grams).toBeGreaterThan(0);
      expect(result.source).toBeDefined();
      expect(result.label).toBeDefined();
    });

    it('should handle malformed JSON and objects gracefully', async () => {
      const malformedProduct = { nutrients: 'not an object' };

      const result = await detectPortionSafe(malformedProduct, '', 'test');
      
      expect(result).toBeDefined();
      expect(typeof result.grams).toBe('number');
      expect(result.grams).toBeGreaterThanOrEqual(5);
      expect(result.grams).toBeLessThanOrEqual(250);
    });

    it('should emit proper telemetry traces', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await detectPortionSafe({ category: 'nuts' }, 'serving size 30g', 'test');
      
      // Should have logged a trace
      expect(consoleSpy).toHaveBeenCalledWith(
        '[REPORT][V2][PORTION][TRACE]',
        expect.objectContaining({
          flags: expect.any(Object),
          sourcesTried: expect.any(Array),
          outcomes: expect.any(Array),
          chosen: expect.objectContaining({
            source: expect.any(String),
            grams: expect.any(Number)
          }),
          totalMs: expect.any(Number)
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Bounds and timeouts enforcement', () => {
    it('should enforce 5-250g bounds', async () => {
      // Test too small
      const tinyResult = await detectPortionSafe({}, '1g serving', 'test');
      expect(tinyResult.grams).toBeGreaterThanOrEqual(5);
      
      // Test too large  
      const hugeResult = await detectPortionSafe({}, '999g serving', 'test');
      expect(hugeResult.grams).toBeLessThanOrEqual(250);
    });

    it('should handle timeouts gracefully', async () => {
      // Mock a slow operation
      const slowProduct = {
        get nutrients() {
          return new Promise(resolve => setTimeout(() => resolve({}), 5000));
        }
      };
      
      const result = await detectPortionSafe(slowProduct, '', 'test');
      
      // Should still return a valid result within reasonable time
      expect(result).toBeDefined();
      expect(result.grams).toBeDefined();
    });
  });
});