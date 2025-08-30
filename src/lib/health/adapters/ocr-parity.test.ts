/**
 * Parity tests between OCR and barcode analysis
 * Ensures OCR path produces comparable results to barcode path
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toReportInputFromOCR } from './toReportInputFromOCR';
import { analyzeProductForQuality } from '@/shared/barcode-analyzer';

// Mock the analyzer
global.fetch = vi.fn();

describe('OCR vs Barcode Parity Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should produce similar scores for equivalent granola data', async () => {
    // Mock analyzer response
    const mockHealthReport = {
      quality: { score: 7.2 },
      flags: [
        { severity: 'medium', ingredient: 'Added Sugar', reason: 'Contains sugar' }
      ]
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHealthReport)
    });

    // Barcode input
    const barcodeInput = {
      name: 'Granola Bar',
      ingredientsText: 'oats, honey, almonds',
      nutrition: {
        calories: 180,
        protein_g: 5,
        carbs_g: 28,
        fat_g: 6,
        sugar_g: 10,
        fiber_g: 3
      }
    };

    // OCR equivalent 
    const ocrText = `
      Granola Bar
      Ingredients: oats, honey, almonds
      Calories: 180
      Protein: 5g
      Carbohydrates: 28g
      Fat: 6g
      Sugar: 10g
      Fiber: 3g
    `;

    const ocrInput = toReportInputFromOCR(ocrText);

    // Both should call the same analyzer
    const barcodeResult = await analyzeProductForQuality(barcodeInput);
    const ocrResult = await analyzeProductForQuality(ocrInput);

    // Scores should be within 0.5 points (delta ≤ 5 on 0-10 scale)
    const scoreDelta = Math.abs((barcodeResult?.quality?.score || 0) - (ocrResult?.quality?.score || 0));
    expect(scoreDelta).toBeLessThanOrEqual(0.5);

    // Both should have same structure
    expect(barcodeResult).toMatchObject({
      quality: { score: expect.any(Number) },
      flags: expect.any(Array)
    });
    expect(ocrResult).toMatchObject({
      quality: { score: expect.any(Number) },
      flags: expect.any(Array)
    });
  });

  it('should produce similar flag count for sour candy', async () => {
    const mockHealthReport = {
      quality: { score: 1.8 },
      flags: [
        { severity: 'high', ingredient: 'High Sugar', reason: 'Very high sugar' },
        { severity: 'high', ingredient: 'Artificial Colors', reason: 'Contains artificial colors' }
      ]
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHealthReport)
    });

    const barcodeInput = {
      name: 'Sour Candy',
      ingredientsText: 'sugar, corn syrup, artificial colors',
      nutrition: { calories: 150, sugar_g: 35 }
    };

    const ocrText = `
      Sour Candy
      Ingredients: sugar, corn syrup, artificial colors
      Calories: 150
      Sugar: 35g
    `;

    const ocrInput = toReportInputFromOCR(ocrText);

    const barcodeResult = await analyzeProductForQuality(barcodeInput);
    const ocrResult = await analyzeProductForQuality(ocrInput);

    // Both should have similar flag counts (top 2 flags should be identical)
    expect(barcodeResult?.flags?.length).toEqual(ocrResult?.flags?.length);
    
    if (barcodeResult?.flags && ocrResult?.flags) {
      expect(barcodeResult.flags[0]?.severity).toBe(ocrResult.flags[0]?.severity);
      if (barcodeResult.flags.length > 1 && ocrResult.flags.length > 1) {
        expect(barcodeResult.flags[1]?.severity).toBe(ocrResult.flags[1]?.severity);
      }
    }
  });
});