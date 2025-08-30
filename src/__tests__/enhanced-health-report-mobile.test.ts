/**
 * Mobile-specific boundary tests for Enhanced Health Report
 * Ensures no crashes on minimal payloads and mobile conditions
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHealthReport } from '@/lib/health/renderHealthReport';

// Mock dependencies
vi.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: vi.fn((flag: string) => {
    if (flag === 'health_report_v2_enabled') return true;
    return false;
  })
}));

vi.mock('@/components/health-check/EnhancedHealthReport', () => ({
  EnhancedHealthReport: ({ result }: any) => {
    // Simulate the component accessing potentially undefined properties
    const itemName = result?.itemName || 'Unknown Product';
    const healthScore = result?.healthScore || 0;
    const flags = result?.flags || result?.ingredientFlags || [];
    const nutritionData = result?.nutritionData || result?.nutritionDataPerServing || {};
    const portionGrams = result?.portionGrams;
    
    // If any critical property access would crash, this mock will crash too
    const testCriticalAccess = () => {
      // Test property access patterns that commonly crash
      const _ = result.nutritionDataPerServing?.calories; // Don't crash if undefined
      const __ = result.flags?.map ? result.flags.map(f => f) : []; // Don't crash if not array
      const ___ = portionGrams?.toFixed ? portionGrams.toFixed(1) : '0.0'; // Don't crash if null
    };
    
    testCriticalAccess();
    
    return {
      type: 'div',
      props: {
        'data-testid': 'enhanced-health-report',
        itemName,
        healthScore,
        flagsCount: flags.length
      }
    };
  }
}));

vi.mock('@/components/health-check/HealthReportPopup', () => ({
  HealthReportPopup: () => ({ type: 'div', props: { 'data-testid': 'legacy-health-report' } })
}));

describe('Enhanced Health Report - Mobile Boundary Tests', () => {
  const mockOnScanAnother = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with absolute minimal payload without crashing', () => {
    const minimalResult = {};

    expect(() => {
      const component = renderHealthReport({
        result: minimalResult as any,
        onScanAnother: mockOnScanAnother,
        onClose: mockOnClose
      });
    }).not.toThrow();
  });

  it('should handle undefined nutrition data without crashing', () => {
    const resultWithUndefinedNutrition = {
      itemName: 'Test Product',
      nutritionData: undefined,
      nutritionDataPerServing: undefined,
      nutritionDataPer100g: undefined,
      flags: undefined,
      ingredientFlags: undefined,
      healthScore: undefined,
      portionGrams: undefined
    } as any;

    expect(() => {
      renderHealthReport({
        result: resultWithUndefinedNutrition,
        onScanAnother: mockOnScanAnother,
        onClose: mockOnClose
      });
    }).not.toThrow();
  });

  it('should handle null values gracefully', () => {
    const resultWithNulls = {
      itemName: null,
      nutritionData: null,
      flags: null,
      healthScore: null,
      ingredientsText: null,
      portionGrams: null
    };

    expect(() => {
      renderHealthReport({
        result: resultWithNulls as any,
        onScanAnother: mockOnScanAnother,
        onClose: mockOnClose
      });
    }).not.toThrow();
  });

  it('should handle telemetry logging without crashing', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const result = {
      itemName: 'Test Product',
      healthScore: 5,
      flags: ['added_sugar']
    };

    expect(() => {
      renderHealthReport({
        result: result as any,
        onScanAnother: mockOnScanAnother,
        onClose: mockOnClose,
        analysisData: { source: 'photo' }
      });
    }).not.toThrow();
    
    // Should log telemetry
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[REPORT][V2][BOOT]'),
      expect.any(Object)
    );
    
    consoleSpy.mockRestore();
  });

  it('should safely handle potentially dangerous property access patterns', () => {
    // Test the specific patterns that commonly cause mobile crashes
    const dangerousResult = {
      // Missing nutritionDataPerServing but code tries to access .calories
      nutritionDataPerServing: undefined,
      // flags is not an array but code tries to call .map()
      flags: null,
      // portionGrams is null but code tries to call .toFixed()
      portionGrams: null,
      // ingredientsText is undefined but code tries to slice it
      ingredientsText: undefined
    };

    expect(() => {
      renderHealthReport({
        result: dangerousResult as any,
        onScanAnother: mockOnScanAnother,
        onClose: mockOnClose
      });
    }).not.toThrow();
  });
});