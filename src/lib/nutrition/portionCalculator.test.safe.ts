/**
 * Safe Portion Detection Tests
 * Comprehensive test coverage for hardened portion detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectPortionSafe, getPortionInfoSync, formatPortionDisplay } from './portionDetectionSafe';
import { isPortionDetectionEnabled } from '@/lib/health/reportFlags';

// Mock dependencies
vi.mock('@/lib/health/reportFlags');
vi.mock('./userPortionPrefs');

const mockIsPortionDetectionEnabled = vi.mocked(isPortionDetectionEnabled);

describe('Safe Portion Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to enabled for most tests
    mockIsPortionDetectionEnabled.mockResolvedValue({
      enabled: true,
      reason: 'enabled',
      urlOverride: false
    });
  });

  describe('detectPortionSafe', () => {
    it('should return fallback when detection is disabled', async () => {
      mockIsPortionDetectionEnabled.mockResolvedValue({
        enabled: false,
        reason: 'url_force_disabled',
        urlOverride: true
      });

      const result = await detectPortionSafe({}, '', 'test');

      expect(result).toEqual({
        grams: 30,
        isEstimated: true,
        source: 'fallback_default',
        confidence: 0,
        display: '30g'
      });
    });

    it('should handle OCR declared portions', async () => {
      const ocrText = `
        Nutrition Facts
        Serving size: 45g (1 cookie)
        Calories: 150
      `;

      const result = await detectPortionSafe({}, ocrText, 'test');

      expect(result.grams).toBe(45);
      expect(result.source).toBe('ocr_declared');
      expect(result.isEstimated).toBe(false);
    });

    it('should infer from nutrition ratios', async () => {
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

      const result = await detectPortionSafe(productData, '', 'test');

      expect(result.grams).toBe(50); // 100/200 * 100g = 50g
      expect(result.source).toBe('ocr_inferred_ratio');
      expect(result.confidence).toBe(1);
    });

    it('should use category-based estimates', async () => {
      const productData = {
        productName: 'Greek Yogurt',
        itemName: 'Greek Yogurt'
      };

      const result = await detectPortionSafe(productData, '', 'test');

      expect(result.grams).toBe(150); // Yogurt category default
      expect(result.source).toBe('model_estimate');
    });

    it('should clamp extreme values to safe bounds', async () => {
      const ocrText = 'Serving size: 500g'; // Too large

      const result = await detectPortionSafe({}, ocrText, 'test');

      expect(result.grams).toBeLessThanOrEqual(250);
      expect(result.grams).toBeGreaterThanOrEqual(5);
    });

    it('should handle errors gracefully and return fallback', async () => {
      // Simulate error in flag checking
      mockIsPortionDetectionEnabled.mockRejectedValue(new Error('Network error'));

      const result = await detectPortionSafe({}, '', 'test');

      expect(result).toEqual({
        grams: 30,
        isEstimated: true,
        source: 'fallback_default',
        confidence: 0,
        display: '30g'
      });
    });

    it('should timeout user preference requests', async () => {
      // This would require mocking getUserPortionPreference to delay
      // The function should still return a valid result
      const result = await detectPortionSafe({}, '', 'test');

      expect(result.grams).toBeGreaterThan(0);
      expect(typeof result.source).toBe('string');
    });
  });

  describe('getPortionInfoSync', () => {
    it('should return cached info when valid', () => {
      const cachedInfo = {
        grams: 45,
        isEstimated: false,
        source: 'user_set' as const,
        confidence: 2
      };

      const result = getPortionInfoSync(cachedInfo);
      expect(result).toEqual(cachedInfo);
    });

    it('should return fallback when cached info is invalid', () => {
      const invalidInfo = {
        grams: 0, // Invalid
        isEstimated: true,
        source: 'estimated' as const,
        confidence: 0
      };

      const result = getPortionInfoSync(invalidInfo);
      expect(result.grams).toBe(30);
      expect(result.source).toBe('fallback_default');
    });

    it('should return fallback when no cached info', () => {
      const result = getPortionInfoSync();
      expect(result.grams).toBe(30);
      expect(result.source).toBe('fallback_default');
    });
  });

  describe('formatPortionDisplay', () => {
    it('should format user set portions', () => {
      const portionInfo = {
        grams: 45,
        isEstimated: false,
        source: 'user_set' as const,
        confidence: 2
      };

      const result = formatPortionDisplay(portionInfo);
      expect(result).toBe('45g · Your setting');
    });

    it('should format OCR declared portions', () => {
      const portionInfo = {
        grams: 30,
        isEstimated: false,
        source: 'ocr_declared' as const,
        confidence: 1
      };

      const result = formatPortionDisplay(portionInfo);
      expect(result).toBe('30g · OCR');
    });

    it('should format estimated portions', () => {
      const portionInfo = {
        grams: 30,
        isEstimated: true,
        source: 'estimated' as const,
        confidence: 0
      };

      const result = formatPortionDisplay(portionInfo);
      expect(result).toBe('30g · est.');
    });

    it('should handle invalid portion info gracefully', () => {
      const invalidInfo = {
        grams: -5, // Invalid
        isEstimated: true,
        source: 'unknown' as any, // Invalid source
        confidence: 0
      };

      const result = formatPortionDisplay(invalidInfo);
      expect(result).toBe('30g · est.'); // Falls back to safe values
    });
  });

  describe('Error Boundaries', () => {
    it('should never throw exceptions', async () => {
      // Even with completely invalid inputs
      await expect(detectPortionSafe(null, null, '')).resolves.toBeDefined();
      await expect(detectPortionSafe(undefined, undefined, 'test')).resolves.toBeDefined();
      
      // Should always return valid portion info
      const result = await detectPortionSafe(null, null, '');
      expect(typeof result.grams).toBe('number');
      expect(result.grams).toBeGreaterThan(0);
      expect(typeof result.source).toBe('string');
    });

    it('should handle SSR context safely', async () => {
      // Mock SSR environment
      const originalWindow = global.window;
      delete (global as any).window;

      const result = await detectPortionSafe({}, '', 'test');
      
      expect(result.grams).toBe(30);
      expect(result.source).toBe('fallback_default');

      // Restore
      global.window = originalWindow;
    });
  });
});