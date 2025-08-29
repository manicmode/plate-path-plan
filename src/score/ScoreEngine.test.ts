/**
 * Unit tests for ScoreEngine
 */

import { describe, it, expect } from 'vitest';
import { calculateHealthScore, toFinal10 } from './ScoreEngine';

describe('ScoreEngine', () => {
  it('should calculate baseline score for minimal input', () => {
    const result = calculateHealthScore({
      name: 'Test Product'
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveProperty('nutrition');
    expect(result.breakdown).toHaveProperty('ingredients');
    expect(result.breakdown).toHaveProperty('processing');
  });

  it('should penalize high sugar content', () => {
    const highSugar = calculateHealthScore({
      name: 'Candy',
      nutrition: {
        sugar_g: 30
      }
    });

    const lowSugar = calculateHealthScore({
      name: 'Healthy Food',
      nutrition: {
        sugar_g: 5
      }
    });

    expect(highSugar.score).toBeLessThan(lowSugar.score);
  });

  it('should reward high protein and fiber', () => {
    const healthy = calculateHealthScore({
      name: 'Protein Bar',
      nutrition: {
        protein_g: 20,
        fiber_g: 10
      }
    });

    const basic = calculateHealthScore({
      name: 'Basic Food',
      nutrition: {
        protein_g: 2,
        fiber_g: 1
      }
    });

    expect(healthy.score).toBeGreaterThan(basic.score);
  });

  it('should penalize artificial additives', () => {
    const withAdditives = calculateHealthScore({
      name: 'Processed Food',
      ingredientsText: 'flour, artificial flavor, high fructose corn syrup, bht'
    });

    const natural = calculateHealthScore({
      name: 'Natural Food',
      ingredientsText: 'organic flour, natural vanilla'
    });

    expect(withAdditives.score).toBeLessThan(natural.score);
  });

  it('should consider NOVA group in processing score', () => {
    const ultraProcessed = calculateHealthScore({
      name: 'Ultra Processed',
      novaGroup: 4
    });

    const unprocessed = calculateHealthScore({
      name: 'Unprocessed',
      novaGroup: 1
    });

    expect(ultraProcessed.score).toBeLessThan(unprocessed.score);
  });
});

describe('toFinal10 converter', () => {
  it('should convert 0-100 scores to 0-10 scale', () => {
    expect(toFinal10(0)).toBe(0);
    expect(toFinal10(50)).toBe(5);
    expect(toFinal10(85)).toBe(9);
    expect(toFinal10(100)).toBe(10);
  });

  it('should handle null/undefined input', () => {
    expect(toFinal10(null as any)).toBe(0);
    expect(toFinal10(undefined as any)).toBe(0);
  });
});