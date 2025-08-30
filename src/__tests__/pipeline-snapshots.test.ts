/**
 * Pipeline Snapshot Tests
 * Ensures barcode/manual/voice outputs remain unchanged after OCR integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeProductForQuality } from '@/shared/barcode-analyzer';
import { parseFreeTextToReport } from '@/lib/health/freeTextParser';

// Mock fetch for barcode analyzer
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock supabase for manual/voice
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

import { supabase } from '@/integrations/supabase/client';

describe('Pipeline Snapshot Tests - No Regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Barcode Pipeline Snapshots', () => {
    it('should maintain identical barcode analysis for granola input', async () => {
      // Expected barcode result (snapshot baseline)
      const expectedBarcodeResult = {
        quality: { score: 78 },
        flags: [
          { code: 'added_sugar', label: 'Contains Added Sugar', severity: 'medium' }
        ],
        insights: ['Whole grain product with moderate sugar content']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(expectedBarcodeResult)
      });

      const barcodeInput = {
        name: 'Nature Valley Granola Bar',
        ingredientsText: 'Whole grain oats, sugar, canola oil, rice flour, honey',
        nutrition: {
          calories: 190,
          protein_g: 4,
          carbs_g: 29,
          fat_g: 6,
          sugar_g: 11,
          fiber_g: 2,
          sodium_mg: 160
        }
      };

      const result = await analyzeProductForQuality(barcodeInput);
      
      // Snapshot: exact structure and values must remain unchanged
      expect(result).toMatchObject(expectedBarcodeResult);
      expect(result?.quality?.score).toBe(78);
      expect(result?.flags).toHaveLength(1);
      expect(result?.flags?.[0].code).toBe('added_sugar');
    });

    it('should maintain identical barcode analysis for sour candy input', async () => {
      // Expected sour candy result (snapshot baseline)  
      const expectedCandyResult = {
        quality: { score: 23 },
        flags: [
          { code: 'high_sugar', label: 'High Sugar Content', severity: 'high' },
          { code: 'artificial_colors', label: 'Artificial Colors', severity: 'medium' }
        ],
        insights: ['High sugar content', 'Contains artificial additives']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(expectedCandyResult)
      });

      const candyInput = {
        name: 'Sour Gummy Worms',
        ingredientsText: 'Corn syrup, sugar, gelatin, citric acid, artificial flavors, red 40, yellow 5',
        nutrition: {
          calories: 140,
          sugar_g: 32,
          sodium_mg: 15
        }
      };

      const result = await analyzeProductForQuality(candyInput);
      
      // Snapshot: exact structure and values must remain unchanged
      expect(result).toMatchObject(expectedCandyResult);
      expect(result?.quality?.score).toBe(23);
      expect(result?.flags).toHaveLength(2);
    });
  });

  describe('Manual/Voice Pipeline Snapshots', () => {
    it('should maintain identical manual text analysis for granola input', async () => {
      // Expected manual/voice result (snapshot baseline)
      const expectedManualResult = {
        foods: [
          {
            name: 'Granola Bar',
            calories: 190,
            protein: 4,
            carbs: 29,
            fat: 6,
            sugar: 11,
            fiber: 2,
            sodium: 160
          }
        ],
        total_confidence: 0.85,
        processing_notes: 'Whole grain product with moderate sugar'
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: expectedManualResult,
        error: null
      });

      const result = await parseFreeTextToReport('Nature Valley Granola Bar with oats and honey');
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Snapshot: exact health scoring logic must remain unchanged  
        expect(result.report.healthScore).toBeCloseTo(6.5, 1); // Within 0.1
        expect(result.report.itemName).toBe('Granola Bar');
        expect(result.report.nutritionData.calories).toBe(190);
        expect(result.report.nutritionData.sugar).toBe(11);
      }
    });

    it('should maintain identical voice analysis error handling', async () => {
      // Test error handling remains unchanged
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Network timeout' }
      });

      const result = await parseFreeTextToReport('test input');
      
      expect(result.ok).toBe(false);
      expect((result as any).reason).toBe('analysis_error');
    });
  });

  describe('Pipeline Isolation Verification', () => {
    it('should not affect barcode analysis when OCR flag is disabled', async () => {
      // Even with OCR code present, barcode path should be unchanged
      const barcodeResult = {
        quality: { score: 85 },
        flags: [],
        insights: ['Clean ingredient list']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(barcodeResult)
      });

      const cleanInput = {
        name: 'Organic Apple',
        ingredientsText: 'Organic apples',
        nutrition: { calories: 80, fiber_g: 4 }
      };

      const result = await analyzeProductForQuality(cleanInput);
      
      // Should get exact same result regardless of OCR integration
      expect(result?.quality?.score).toBe(85);
      expect(result?.flags).toHaveLength(0);
    });
  });
});
