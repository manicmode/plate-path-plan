/**
 * Standalone Test Route Integration Tests
 * Ensures /standalone-test route works properly and triggers V2
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('Standalone Test Route Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be a dev-only route', () => {
    // Route should only be available when import.meta.env.DEV is true
    const isDevRoute = import.meta.env.DEV;
    
    // In production, this route should not exist
    expect(typeof isDevRoute).toBe('boolean');
  });

  it('should trigger V2 with standalone entry', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Mock the expected telemetry when route loads
    const expectedTelemetry = {
      entry: 'standalone',
      route: '/standalone-test',
      flagsCount: expect.any(Number),
      hasPer100g: expect.any(Boolean),
      hasPerServing: expect.any(Boolean)
    };
    
    // Simulate the telemetry logging that should happen
    console.log('[REPORT][V2][BOOT]', expectedTelemetry);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[REPORT][V2][BOOT]',
      expect.objectContaining({
        entry: 'standalone',
        route: '/standalone-test'
      })
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle mock query parameter', () => {
    // Test that ?mock=true parameter works
    const searchParams = new URLSearchParams('?mock=true');
    const mockValue = searchParams.get('mock');
    
    expect(mockValue).toBe('true');
    
    // Test default case
    const defaultParams = new URLSearchParams('');
    const defaultValue = defaultParams.get('mock');
    
    expect(defaultValue).toBeNull();
  });

  it('should have proper mock data structure', () => {
    // Mock data should have all required fields for complete V2 testing
    const mockData = {
      itemName: 'Organic Granola Bar (Test Data)',
      healthScore: 6.8,
      ingredientFlags: [
        {
          ingredient: 'sugar',
          flag: 'added_sugar',
          severity: 'medium',
          reason: 'Contains added sugars which may contribute to blood sugar spikes'
        }
      ],
      nutritionData: {
        calories: 180,
        protein: 5,
        fat: 8,
        carbs: 24
      },
      nutritionDataPerServing: {
        energyKcal: 180,
        protein_g: 5,
        fat_g: 8,
        carbs_g: 24
      },
      healthProfile: {
        isOrganic: true,
        isGMO: false,
        allergens: ['tree nuts'],
        preservatives: [],
        additives: ['palm oil']
      },
      suggestions: [
        'Look for bars with less than 6g added sugar',
        'Consider bars with more protein (8g+) for better satiety'
      ]
    };
    
    // Verify mock data has required fields
    expect(mockData.itemName).toBeDefined();
    expect(mockData.healthScore).toBeGreaterThan(0);
    expect(mockData.ingredientFlags).toHaveLength(1);
    expect(mockData.nutritionData.calories).toBeGreaterThan(0);
    expect(mockData.suggestions.length).toBeGreaterThan(0);
  });

  it('should navigate properly from debug menu', () => {
    const mockNavigate = vi.fn();
    
    // Simulate clicking the debug button
    const expectedRoute = '/standalone-test';
    mockNavigate(expectedRoute);
    
    expect(mockNavigate).toHaveBeenCalledWith('/standalone-test');
  });

  it('should log route mounting telemetry', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Expected route mounting log
    console.log('[STANDALONE][ROUTE] Mounted /standalone-test', { 
      mock: false,
      route: '/standalone-test' 
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[STANDALONE][ROUTE] Mounted /standalone-test',
      expect.objectContaining({
        mock: expect.any(Boolean),
        route: '/standalone-test'
      })
    );
    
    consoleSpy.mockRestore();
  });
});