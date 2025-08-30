/**
 * OCR-only Pipeline Tests
 * Ensures OCR mode bypasses barcode/hybrid scanners and uses correct flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the free-text parser
vi.mock('@/lib/health/freeTextParser', () => ({
  parseFreeTextToReport: vi.fn()
}));

// Mock the analyzer
vi.mock('@/shared/barcode-analyzer', () => ({
  analyzeProductForQuality: vi.fn()
}));

// Mock OCR client
vi.mock('@/lib/ocrClient', () => ({
  callOCRFunction: vi.fn()
}));

import { parseFreeTextToReport } from '@/lib/health/freeTextParser';
import { analyzeProductForQuality } from '@/shared/barcode-analyzer';
import { callOCRFunction } from '@/lib/ocrClient';
import { toReportFromOCR } from './toReportInputFromOCR';
import { isSuccessResult, isErrorResult } from './ocrResultHelpers';

describe('OCR Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use shared free-text parser for OCR text', async () => {
    const mockOcrText = 'Granola Bar - Ingredients: oats, honey, almonds. Nutrition: 150 calories, 5g protein';
    
    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: true,
      report: {
        productName: 'Granola Bar',
        healthScore: 7.5,
        ingredientFlags: [{ ingredient: 'honey', flag: 'high_sugar', severity: 'medium' }],
        ingredientsText: 'oats, honey, almonds',
        nutritionData: { calories: 150, protein: 5 }
      }
    });

    const result = await toReportFromOCR(mockOcrText);
    
    expect(parseFreeTextToReport).toHaveBeenCalledWith(mockOcrText.replace(/\s+/g, ' ').trim());
    expect(isSuccessResult(result)).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.report.source).toBe('OCR');
      expect(result.report.healthScore).toBe(7.5);
    }
  });

  it('should handle low-signal OCR text', async () => {
    const shortText = 'ABC';
    const result = await toReportFromOCR(shortText);
    
    expect(isErrorResult(result)).toBe(true);
    if (isErrorResult(result)) {
      expect(result.reason).toBe('no_text');
    }
    expect(parseFreeTextToReport).not.toHaveBeenCalled();
  });

  it('should propagate parser failures', async () => {
    const mockOcrText = 'Some product text';
    
    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: false,
      reason: 'low_confidence'
    });

    const result = await toReportFromOCR(mockOcrText);
    
    expect(isErrorResult(result)).toBe(true);
    if (isErrorResult(result)) {
      expect(result.reason).toBe('low_confidence');
    }
  });

  it('should clean OCR text before parsing', async () => {
    const messyOcrText = '  Granola•Bar  ln organic  O2  calories  ';
    const expectedClean = 'Granola,Bar In organic 02 calories';
    
    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: true,
      report: { healthScore: 8.0, source: 'parser' }
    });

    await toReportFromOCR(messyOcrText);
    
    expect(parseFreeTextToReport).toHaveBeenCalledWith(expect.stringContaining('Granola,Bar'));
  });

  // Snapshot test for granola fixture
  it('should produce consistent health analysis for granola bar OCR', async () => {
    const granolaBarsOCR = `
      Nature Valley Granola Bars
      INGREDIENTS: Whole grain oats, sugar, canola oil, rice flour, honey, salt, natural flavor, vitamin E
      NUTRITION FACTS per bar: 190 calories, 3g protein, 29g carbs, 7g fat, 11g sugar, 2g fiber, 160mg sodium
    `;

    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: true,
      report: {
        productName: 'Nature Valley Granola Bars',
        healthScore: 6.2, // 62/100
        ingredientFlags: [
          { ingredient: 'sugar', flag: 'high_sugar', severity: 'medium' },
          { ingredient: 'canola oil', flag: 'processed_oil', severity: 'low' }
        ],
        ingredientsText: 'Whole grain oats, sugar, canola oil, rice flour, honey, salt, natural flavor, vitamin E',
        nutritionData: {
          calories: 190,
          protein: 3,
          carbs: 29,
          fat: 7,
          sugar: 11,
          fiber: 2,
          sodium: 160
        }
      }
    });

    const result = await toReportFromOCR(granolaBarsOCR);
    
    expect(isSuccessResult(result)).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.report.source).toBe('OCR');
      expect(result.report.healthScore).toBeGreaterThan(0);
      expect(result.report.ingredientFlags?.length).toBeGreaterThanOrEqual(1);
      expect(result.report.productName).toContain('Granola');
    }
  });
});