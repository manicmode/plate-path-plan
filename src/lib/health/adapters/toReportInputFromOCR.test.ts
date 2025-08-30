/**
 * Tests for OCR to Health Report Input Adapter
 * Ensures OCR text parsing produces consistent results
 */

import { describe, it, expect } from 'vitest';
import { toReportInputFromOCR } from './toReportInputFromOCR';

describe('toReportInputFromOCR', () => {
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

  it('should handle real-world OCR text with noise', () => {
    const ocrText = `
      HEALTHY CHOICE
      Granola Cereal
      NUTRITION FACTS
      Serving Size 1 cup (55g)
      Calories 210
      Total Fat 3g
      Protein 6g
      Total Carbohydrate 42g
      Sugars 11g
      Fiber 5g
      Sodium 160mg
      INGREDIENTS: Whole grain oats, cane sugar, rice, honey
    `;
    
    const result = toReportInputFromOCR(ocrText);
    
    expect(result.name).toBe('HEALTHY CHOICE');
    expect(result.nutrition?.calories).toBe(210);
    expect(result.nutrition?.protein_g).toBe(6);
    expect(result.ingredientsText).toBe('Whole grain oats, cane sugar, rice, honey');
  });
});