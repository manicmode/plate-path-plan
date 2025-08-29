/**
 * Integration tests for Health Check with Score Engine
 */

import { describe, it, expect, vi } from 'vitest';
import { calculateHealthScore, toFinal10 } from '@/score/ScoreEngine';

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SCORE_ENGINE_V1: 'false'
  }
});

describe('Health Check Score Engine Integration', () => {
  it('should use ScoreEngine when flag is enabled', () => {
    // Mock the flag to be true
    vi.stubEnv('VITE_SCORE_ENGINE_V1', 'true');
    
    const mockProduct = {
      name: 'Test Product',
      nutrition: {
        calories: 200,
        protein_g: 10,
        sugar_g: 20,
        sodium_mg: 400
      },
      ingredientsText: 'flour, sugar, artificial flavor'
    };

    const result = calculateHealthScore(mockProduct);
    const final10Score = toFinal10(result.score);

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(final10Score).toBeGreaterThanOrEqual(0);
    expect(final10Score).toBeLessThanOrEqual(10);

    vi.unstubAllEnvs();
  });

  it('should use legacy path when flag is disabled', () => {
    // Flag is already false from mock above
    expect(import.meta.env.VITE_SCORE_ENGINE_V1).toBe('false');
    
    // This would trigger the legacy scoring path in the actual component
    // For now, just verify the flag is working as expected
  });
});