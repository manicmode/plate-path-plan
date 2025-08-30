/**
 * OCR Snapshot Tests
 * Ensures OCR produces non-null scores and flags for common product types
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toReportFromOCR } from '@/lib/health/adapters/toReportInputFromOCR';
import { parseFreeTextToReport } from '@/lib/health/freeTextParser';
import { isSuccessResult, isInconclusiveResult, isErrorResult } from '@/lib/health/adapters/ocrResultHelpers';

// Mock the shared parser
vi.mock('@/lib/health/freeTextParser', () => ({
  parseFreeTextToReport: vi.fn()
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('OCR Snapshot Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should produce non-null score and at least 1 flag for granola OCR text', async () => {
    // Mock typical granola bar analysis result
    const mockGranolaReport = {
      itemName: 'Nature Valley Granola Bar',
      healthScore: 6.5, // 65/100 when normalized
      ingredientFlags: [
        { code: 'added_sugar', label: 'Contains Added Sugar', severity: 'medium' }
      ],
      nutritionData: {
        calories: 190,
        protein: 4,
        carbs: 29,
        sugar: 11,
        fiber: 2,
        fat: 6,
        sodium: 160
      },
      overallRating: 'good',
      suggestions: ['Consider lower sugar alternatives']
    };

    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: true,
      report: mockGranolaReport
    });

    const granolOcrText = `
      Nature Valley Granola Bar
      Whole grain oats, sugar, canola oil, rice flour, honey, brown sugar syrup
      Calories 190 Protein 4g Carbs 29g Sugars 11g Fiber 2g Fat 6g Sodium 160mg
    `;

    const result = await toReportFromOCR(granolOcrText);
    
    expect(isSuccessResult(result)).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.report.healthScore).toBeGreaterThan(0);
      expect(result.report.healthScore).toBeLessThanOrEqual(10);
      expect(result.report.ingredientFlags).toHaveLength(1);
      expect(result.report.ingredientFlags[0].code).toBe('added_sugar');
      expect(result.report.source).toBe('OCR');
      expect(result.report.itemName).toBe('Nature Valley Granola Bar');
    }
  });

  it('should handle empty/invalid OCR gracefully without crashing', async () => {
    // Test various edge cases
    const invalidInputs = ['', '   ', 'hi', 'a b c', '123'];

    for (const input of invalidInputs) {
      const result = await toReportFromOCR(input);
      expect(isErrorResult(result) || isInconclusiveResult(result)).toBe(true);
    }
  });

  it('should preserve exact output structure expected by PhotoSandbox', async () => {
    // Mock response matching what PhotoSandbox expects
    const expectedStructure = {
      itemName: 'Test Product',
      healthScore: 7.2,
      ingredientFlags: [
        { code: 'artificial_colors', label: 'Artificial Colors', severity: 'medium' }
      ],
      overallRating: 'good',
      nutritionData: { calories: 150 },
      suggestions: []
    };

    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: true,
      report: expectedStructure
    });

    const result = await toReportFromOCR('Valid product with sufficient text content for analysis');
    
    expect(isSuccessResult(result)).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.report).toHaveProperty('itemName');
      expect(result.report).toHaveProperty('healthScore');
      expect(result.report).toHaveProperty('source');
      expect(result.report.source).toBe('OCR');
    }
  });
});