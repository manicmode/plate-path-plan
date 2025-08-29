/**
 * Unit tests for deterministic flag detection
 */

import { describe, it, expect } from 'vitest';
import { detectFlags, detectIngredientFlags, detectNutritionFlags } from './flagger';

describe('Ingredient Flag Detection', () => {
  it('should detect artificial sweeteners', () => {
    const flags = detectIngredientFlags('water, aspartame, natural flavors');
    
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      key: 'artificial_sweeteners',
      label: 'Contains artificial sweeteners',
      severity: 'warning'
    });
  });

  it('should detect multiple artificial sweeteners as one flag', () => {
    const flags = detectIngredientFlags('aspartame, sucralose, acesulfame potassium');
    
    expect(flags).toHaveLength(1);
    expect(flags[0].key).toBe('artificial_sweeteners');
  });

  it('should detect high fructose corn syrup', () => {
    const flags = detectIngredientFlags('sugar, high fructose corn syrup, natural flavors');
    
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      key: 'high_fructose_corn_syrup',
      label: 'Contains high fructose corn syrup',
      severity: 'danger'
    });
  });

  it('should detect artificial colors', () => {
    const flags = detectIngredientFlags('sugar, fd&c red 40, yellow 5');
    
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      key: 'artificial_colors',
      label: 'Contains artificial colors',
      severity: 'warning'
    });
  });

  it('should handle empty or invalid ingredient text', () => {
    expect(detectIngredientFlags('')).toHaveLength(0);
    expect(detectIngredientFlags(null as any)).toHaveLength(0);
    expect(detectIngredientFlags(undefined as any)).toHaveLength(0);
  });
});

describe('Nutrition Flag Detection', () => {
  it('should detect high sodium (≥600mg per 100g)', () => {
    const flags = detectNutritionFlags({
      sodium_mg_100g: 800
    });
    
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      key: 'high_sodium',
      label: 'High in sodium',
      severity: 'warning'
    });
  });

  it('should detect very high sodium (≥1500mg per 100g)', () => {
    const flags = detectNutritionFlags({
      sodium_mg_100g: 2000
    });
    
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      key: 'very_high_sodium',
      label: 'Very high in sodium', 
      severity: 'danger'
    });
  });

  it('should detect high sugar (≥22.5g per 100g)', () => {
    const flags = detectNutritionFlags({
      sugar_g_100g: 30
    });
    
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      key: 'high_sugar',
      label: 'High in sugar',
      severity: 'warning'
    });
  });

  it('should detect positive flags for fiber and protein', () => {
    const flags = detectNutritionFlags({
      fiber_g_100g: 8,    // ≥6g
      protein_g_100g: 15  // ≥12g
    });
    
    expect(flags).toHaveLength(2);
    expect(flags.map(f => f.key)).toContain('high_fiber');
    expect(flags.map(f => f.key)).toContain('high_protein');
    expect(flags.every(f => f.severity === 'good')).toBe(true);
  });

  it('should not detect flags when below thresholds', () => {
    const flags = detectNutritionFlags({
      sodium_mg_100g: 300,  // Below 600mg threshold
      sugar_g_100g: 10,     // Below 22.5g threshold
      fiber_g_100g: 3       // Below 6g threshold
    });
    
    expect(flags).toHaveLength(0);
  });
});

describe('Combined Flag Detection', () => {
  it('should combine ingredient and nutrition flags without duplicates', () => {
    const flags = detectFlags(
      'sugar, aspartame, red 40',
      {
        sodium_mg_100g: 800,
        sugar_g_100g: 25,
        fiber_g_100g: 7
      }
    );

    expect(flags.length).toBeGreaterThan(3);
    
    const flagKeys = flags.map(f => f.key);
    expect(flagKeys).toContain('artificial_sweeteners');
    expect(flagKeys).toContain('artificial_colors'); 
    expect(flagKeys).toContain('high_sodium');
    expect(flagKeys).toContain('high_sugar');
    expect(flagKeys).toContain('high_fiber');

    // Verify no duplicates
    const uniqueKeys = new Set(flagKeys);
    expect(uniqueKeys.size).toBe(flags.length);
  });

  it('should handle products with no concerning ingredients or nutrition', () => {
    const flags = detectFlags(
      'organic oats, honey, almonds',
      {
        sodium_mg_100g: 50,
        sugar_g_100g: 8,
        fiber_g_100g: 4,
        protein_g_100g: 8
      }
    );

    expect(flags).toHaveLength(0);
  });
});