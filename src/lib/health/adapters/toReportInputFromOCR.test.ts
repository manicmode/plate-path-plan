/**
 * Tests for OCR to Health Report Input Adapter
 * Updated to test the new toReportFromOCR function that uses shared parser
 */

import { describe, it, expect, vi } from 'vitest';
import { toReportInputFromOCR, toReportFromOCR } from './toReportInputFromOCR';

// Mock the free text parser
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

import { parseFreeTextToReport } from '@/lib/health/freeTextParser';

describe('toReportInputFromOCR (legacy)', () => {
  it('should extract basic product name from first line', () => {
    const ocrText = 'Granola Bar\nIngredients: oats, honey\nCalories: 150';
    const result = toReportInputFromOCR(ocrText);
    
    expect(result.name).toBe('Granola Bar');
  });

  it('should parse nutrition facts correctly', () => {
    const ocrText = `
      Healthy Snack
      Calories: 200
      Protein: 8g
      Carbohydrates: 30g
      Fat: 5g
      Sugar: 12g
      Fiber: 4g
      Sodium: 150mg
    `;
    
    const result = toReportInputFromOCR(ocrText);
    
    expect(result.nutrition).toEqual({
      calories: 200,
      protein_g: 8,
      carbs_g: 30,
      fat_g: 5,
      sugar_g: 12,
      fiber_g: 4,
      sodium_mg: 150
    });
  });

  it('should extract ingredients text', () => {
    const ocrText = `
      Granola Bar
      Ingredients: Rolled oats, honey, almonds, dried cranberries
      Calories: 180
    `;
    
    const result = toReportInputFromOCR(ocrText);
    
    expect(result.ingredientsText).toBe('Rolled oats, honey, almonds, dried cranberries');
  });

  it('should handle empty or minimal text gracefully', () => {
    const result = toReportInputFromOCR('');
    
    expect(result.name).toBe('Unknown Product');
    expect(result.ingredientsText).toBeUndefined();
    expect(result.nutrition).toBeUndefined();
  });

  it('should fallback to first words for product name', () => {
    const ocrText = 'Some Product Name Here with more text';
    const result = toReportInputFromOCR(ocrText);
    
    expect(result.name).toBe('Some Product Name Here');
  });
});

describe('toReportFromOCR (new shared parser)', () => {
  it('should return no_text for short input', async () => {
    const result = await toReportFromOCR('hi');
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('no_text');
  });

  it('should use shared parser for longer text', async () => {
    const mockReport = {
      itemName: 'Test Product',
      healthScore: 7.5,
      ingredientFlags: ['added_sugar']
    };

    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: true,
      report: mockReport
    });

    const result = await toReportFromOCR('Granola Bar with rolled oats, honey, and dried cranberries. Contains sugar.');
    
    expect(result.ok).toBe(true);
    expect((result as any).report.source).toBe('OCR');
    expect((result as any).report.itemName).toBe('Test Product');
  });

  it('should handle parser failures gracefully', async () => {
    vi.mocked(parseFreeTextToReport).mockResolvedValue({
      ok: false,
      reason: 'low_confidence'
    });

    const result = await toReportFromOCR('Some unclear text that cannot be parsed properly');
    
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('low_confidence');
  });
});