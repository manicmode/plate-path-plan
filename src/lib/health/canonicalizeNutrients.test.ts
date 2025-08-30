/**
 * Tests for nutrient canonicalization
 */

import { describe, it, expect } from 'vitest';
import { canonicalizePer100g, perServingFromPer100g } from './canonicalizeNutrients';

describe('canonicalizePer100g', () => {
  it('should handle energy_kcal fields', () => {
    const result = canonicalizePer100g({
      'energy_kcal_100g': 250,
      'sugars_100g': 12,
      'saturated-fat_100g': 3
    });
    
    expect(result.energy_kcal).toBe(250);
    expect(result.sugars_g).toBe(12);
    expect(result.saturated_fat_g).toBe(3);
  });

  it('should convert kJ to kcal when kcal not available', () => {
    const result = canonicalizePer100g({
      'energy_kj_100g': 1046, // ~250 kcal
      'sugars_100g': 8
    });
    
    expect(Math.round(result.energy_kcal)).toBe(250);
    expect(result.sugars_g).toBe(8);
  });

  it('should handle salt to sodium conversion', () => {
    const result = canonicalizePer100g({
      'salt_100g': 2.5 // Should convert to ~983mg sodium
    });
    
    expect(Math.round(result.sodium_mg)).toBe(983);
  });

  it('should handle various sugar field names', () => {
    const tests = [
      { 'sugars_100g': 10 },
      { 'total_sugars_100g': 12 },
      { 'added_sugars_100g': 8 }
    ];
    
    tests.forEach(test => {
      const result = canonicalizePer100g(test);
      expect(result.sugars_g).toBeGreaterThan(0);
    });
  });
});

describe('perServingFromPer100g', () => {
  it('should calculate per-serving correctly', () => {
    const per100g = {
      energy_kcal: 400,
      sugars_g: 20,
      saturated_fat_g: 5,
      sodium_mg: 1000,
      fiber_g: 10,
      protein_g: 15
    };
    
    const perServing = perServingFromPer100g(per100g, 45); // 45g portion
    
    expect(perServing.energy_kcal).toBe(180); // 400 * 0.45
    expect(perServing.sugars_g).toBe(9); // 20 * 0.45
    expect(perServing.saturated_fat_g).toBe(2.25); // 5 * 0.45
    expect(perServing.sodium_mg).toBe(450); // 1000 * 0.45
  });
});

// Golden tests for scoring calibration
describe('Golden scoring tests', () => {
  it('should score granola in 78-88 range', () => {
    const granolaData = {
      'energy_kcal_100g': 450,
      'sugars_100g': 12,
      'saturated-fat_100g': 2,
      'fiber_100g': 8,
      'proteins_100g': 10,
      'sodium_100g': 0.1 // 100mg
    };
    
    const per100g = canonicalizePer100g(granolaData);
    const perServing = perServingFromPer100g(per100g, 45); // Typical granola serving
    
    // Import scoring function to test
    const { safeScoreV2 } = require('./scoring');
    const score = safeScoreV2({
      per100g: granolaData,
      perServing,
      meta: { category: 'cereal', name: 'Granola', portionGrams: 45 },
      flags: []
    });
    
    expect(score).toBeGreaterThanOrEqual(78);
    expect(score).toBeLessThanOrEqual(88);
  });

  it('should score sour punch in 42-58 range', () => {
    const sourPunchData = {
      'energy_kcal_100g': 350,
      'sugars_100g': 80,
      'saturated-fat_100g': 0,
      'fiber_100g': 0,
      'proteins_100g': 0,
      'sodium_100g': 0.05 // 50mg
    };
    
    const per100g = canonicalizePer100g(sourPunchData);
    const perServing = perServingFromPer100g(per100g, 30); // Small candy portion
    
    const { safeScoreV2 } = require('./scoring');
    const score = safeScoreV2({
      per100g: sourPunchData,
      perServing,
      meta: { category: 'candy', name: 'Sour Punch', portionGrams: 30 },
      flags: ['artificial_colors', 'high_sugar']
    });
    
    expect(score).toBeGreaterThanOrEqual(42);
    expect(score).toBeLessThanOrEqual(58);
  });
});