/**
 * Parser Parity Tests 
 * Ensures OCR uses the same free-text parsing as Manual/Voice
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toReportFromOCR } from './toReportInputFromOCR';
import { parseFreeTextToReport } from '@/lib/health/freeTextParser';

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

describe('Parser Parity Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass granola label through shared parser with correct score range', async () => {
    const ocrText = `
      Nature Valley Granola Bar
      Ingredients: Whole grain oats, sugar, canola oil, rice flour, honey, brown sugar syrup
      Nutrition Facts per bar (42g):
      Calories 190
      Protein 4g
      Carbohydrates 29g
      Sugars 11g
      Fiber 2g
      Fat 6g
      Sodium 160mg
    `;

    // Mock response simulating what Manual/Voice would get from GPT analyzer
    const mockGranolaResponse = {
      itemName: 'Nature Valley Granola Bar',
      healthScore: 6.5, // Moderate score (sugar content but whole grains)
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
      suggestions: ['Consider lower sugar alternatives']
    };

    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: true,
      report: mockGranolaResponse
    });

    const result = await toReportFromOCR(ocrText);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify score is in expected range for granola (75-90 on 100-point scale)
      const normalizedScore = result.report.healthScore * 10;
      expect(normalizedScore).toBeGreaterThanOrEqual(75);
      expect(normalizedScore).toBeLessThanOrEqual(90);
      
      // Verify at least one "added sugar" flag
      expect(result.report.ingredientFlags).toHaveLength(1);
      expect(result.report.ingredientFlags[0].code).toBe('added_sugar');
      
      // Verify OCR source tag
      expect(result.report.source).toBe('OCR');
    }
  });

  it('should pass sour candy through shared parser with low score and multiple flags', async () => {
    const ocrText = `
      Haribo Sour Gummies
      Ingredients: Glucose syrup, sugar, gelatin, dextrose, citric acid, malic acid, 
      artificial flavoring, colors (red 40, yellow 5, blue 1), palm oil
      Nutrition Facts per serving (17 pieces, 40g):
      Calories 140
      Total Carbohydrate 32g
      Sugars 22g
      Protein 3g
      Fat 0g
      Sodium 10mg
    `;

    // Mock response simulating problematic candy analysis
    const mockCandyResponse = {
      itemName: 'Haribo Sour Gummies',
      healthScore: 2.2, // Low score for high-sugar candy
      ingredientFlags: [
        { code: 'high_sugar', label: 'High Sugar Content', severity: 'high' },
        { code: 'artificial_colors', label: 'Artificial Food Colors', severity: 'medium' },
        { code: 'corn_syrup', label: 'Contains Glucose Syrup', severity: 'medium' }
      ],
      nutritionData: {
        calories: 140,
        carbs: 32,
        sugar: 22,
        protein: 3,
        fat: 0,
        sodium: 10
      },
      suggestions: ['Limit consumption', 'Choose natural alternatives']
    };

    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: true,
      report: mockCandyResponse
    });

    const result = await toReportFromOCR(ocrText);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify score is in expected range for candy (20-45 on 100-point scale)  
      const normalizedScore = result.report.healthScore * 10;
      expect(normalizedScore).toBeGreaterThanOrEqual(20);
      expect(normalizedScore).toBeLessThanOrEqual(45);
      
      // Verify multiple flags including HFCS and colors
      expect(result.report.ingredientFlags.length).toBeGreaterThanOrEqual(2);
      
      const flagCodes = result.report.ingredientFlags.map((f: any) => f.code);
      expect(flagCodes).toContain('high_sugar');
      expect(flagCodes).toContain('artificial_colors');
    }
  });

  it('should handle empty/low-signal text without calling parser', async () => {
    // Should not call parser for very short text
    const result = await toReportFromOCR('Hi');
    
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('no_text');
    expect(vi.mocked(parseFreeTextToReport)).not.toHaveBeenCalled();
  });

  it('should pass through parser errors correctly', async () => {
    const ocrText = 'Some unclear product text that confuses the analyzer system completely';

    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: false,
      reason: 'low_confidence'
    });

    const result = await toReportFromOCR(ocrText);
    
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('low_confidence');
    expect(vi.mocked(parseFreeTextToReport)).toHaveBeenCalledWith(expect.stringContaining('unclear product text'));
  });

  it('should apply OCR pre-cleaning before parser', async () => {
    const dirtyOcrText = `
      Granola••Bar
      lngredients: oats,  honey,  0ats
      Calorie5: 180
    `;

    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: true,
      report: { itemName: 'Granola Bar', healthScore: 7 }
    });

    await toReportFromOCR(dirtyOcrText);
    
    // Verify parser was called with cleaned text
    expect(vi.mocked(parseFreeTextToReport)).toHaveBeenCalledWith(
      expect.stringMatching(/Granola,,Bar.*Ingredients.*oats.*honey.*Oats.*Calories.*180/)
    );
  });
});