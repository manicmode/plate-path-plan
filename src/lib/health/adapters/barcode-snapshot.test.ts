/**
 * Snapshot tests for barcode health analysis pipeline
 * Ensures no regressions in existing barcode functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeProductForQuality } from '@/shared/barcode-analyzer';

// Mock the fetch function to simulate analyzer responses
global.fetch = vi.fn();

describe('Barcode Health Analysis Snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should maintain consistent output for granola bar', async () => {
    const mockResponse = {
      quality: { score: 7.5 },
      flags: [
        { severity: 'medium', ingredient: 'Added Sugar', reason: 'Contains added sugars' }
      ],
      insights: ['Good source of fiber', 'Moderate sugar content']
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const input = {
      name: 'Nature Valley Granola Bar',
      ingredientsText: 'whole grain oats, sugar, roasted peanuts, rice flour',
      nutrition: {
        calories: 190,
        protein_g: 4,
        carbs_g: 29,
        fat_g: 6,
        sugar_g: 11,
        fiber_g: 2,
        sodium_mg: 160
      }
    };

    const result = await analyzeProductForQuality(input);
    
    // Snapshot the structure and key values
    expect(result).toMatchObject({
      quality: { score: expect.any(Number) },
      flags: expect.any(Array),
      insights: expect.any(Array)
    });
    
    expect(result?.quality?.score).toBeGreaterThan(0);
    expect(result?.quality?.score).toBeLessThanOrEqual(10);
  });

  it('should maintain consistent output for sour candy', async () => {
    const mockResponse = {
      quality: { score: 2.1 },
      flags: [
        { severity: 'high', ingredient: 'Artificial Colors', reason: 'Contains artificial coloring' },
        { severity: 'high', ingredient: 'High Sugar', reason: 'Very high sugar content' }
      ],
      insights: ['High in sugar', 'Contains artificial ingredients']
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const input = {
      name: 'Sour Gummy Worms',
      ingredientsText: 'corn syrup, sugar, gelatin, citric acid, artificial flavors, artificial colors',
      nutrition: {
        calories: 140,
        protein_g: 2,
        carbs_g: 32,
        fat_g: 0,
        sugar_g: 22,
        fiber_g: 0,
        sodium_mg: 10
      }
    };

    const result = await analyzeProductForQuality(input);
    
    expect(result).toMatchObject({
      quality: { score: expect.any(Number) },
      flags: expect.arrayContaining([
        expect.objectContaining({ severity: expect.any(String) })
      ])
    });
    
    expect(result?.quality?.score).toBeLessThan(5); // Should be low for candy
  });

  it('should handle null/error responses gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const input = { name: 'Test Product' };
    const result = await analyzeProductForQuality(input);
    
    expect(result).toBeNull();
  });
});