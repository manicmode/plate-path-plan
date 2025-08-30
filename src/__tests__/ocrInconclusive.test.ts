/**
 * Tests for OCR Inconclusive Analysis
 */

import { describe, it, expect } from 'vitest';
import { shouldReturnInconclusive } from '@/lib/health/adapters/inconclusiveAnalyzer';

describe('OCR Inconclusive Analysis', () => {
  it('should return inconclusive for text too short', () => {
    const shortText = 'ABC';
    const result = shouldReturnInconclusive(shortText);
    
    expect(result).toBeTruthy();
    expect(result?.status).toBe('inconclusive');
    expect(result?.reason).toBe('insufficient_text');
    expect(result?.score).toBeNull();
    expect(result?.flags).toEqual([]);
  });

  it('should return inconclusive for low confidence parse result', () => {
    const text = 'Some product text with reasonable length but low confidence';
    const parseResult = { ok: false, reason: 'low_confidence' };
    
    const result = shouldReturnInconclusive(text, parseResult);
    
    expect(result).toBeTruthy();
    expect(result?.status).toBe('inconclusive');
    expect(result?.reason).toBe('low_confidence');
  });

  it('should return inconclusive for confidence below threshold', () => {
    const text = 'Some product text with reasonable length';
    const confidence = 0.2; // Below 0.35 threshold
    
    const result = shouldReturnInconclusive(text, undefined, confidence);
    
    expect(result).toBeTruthy();
    expect(result?.status).toBe('inconclusive');
    expect(result?.reason).toBe('low_confidence');
  });

  it('should return inconclusive for text with no ingredients or nutrition', () => {
    const text = 'Brand Name Product Logo Marketing Text Here';
    
    const result = shouldReturnInconclusive(text);
    
    expect(result).toBeTruthy();
    expect(result?.status).toBe('inconclusive');
    expect(result?.reason).toBe('no_ingredients');
  });

  it('should return null for valid analysis text', () => {
    const text = 'Product Name Ingredients: wheat flour, sugar, salt. Nutrition Facts per 100g: Calories 250, Protein 8g, Carbs 45g';
    
    const result = shouldReturnInconclusive(text);
    
    expect(result).toBeNull();
  });

  it('should return null for confidence above threshold', () => {
    const text = 'Some product text with reasonable length';
    const confidence = 0.8; // Above 0.35 threshold
    
    const result = shouldReturnInconclusive(text, undefined, confidence);
    
    expect(result).toBeNull();
  });
});