/**
 * V2 Standalone Route & Watchdog Tests
 * Ensures V2 only enables for 'standalone' route with proper fallback
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHealthReport } from '@/lib/health/renderHealthReport';

// Mock dependencies
vi.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: vi.fn((flag: string) => {
    if (flag === 'health_report_v2_enabled') return true;
    return true; // Other flags enabled for test
  })
}));

vi.mock('@/components/health-check/EnhancedHealthReport', () => ({
  EnhancedHealthReport: ({ result }: any) => {
    return {
      type: 'div',
      props: {
        'data-testid': 'enhanced-health-report-v2',
        itemName: result?.itemName || 'Test Product'
      }
    };
  }
}));

vi.mock('@/components/health-check/HealthReportPopup', () => ({
  HealthReportPopup: ({ result }: any) => {
    return {
      type: 'div',
      props: {
        'data-testid': 'legacy-health-report-v1',
        itemName: result?.itemName || 'Test Product'
      }
    };
  }
}));

describe('V2 Standalone Route & Watchdog', () => {
  const mockResult = {
    itemName: 'Test Product',
    healthScore: 7,
    ingredientFlags: [],
    flags: [],
    nutritionData: {},
    healthProfile: {},
    personalizedWarnings: [],
    suggestions: [],
    overallRating: 'good' as const
  };

  const mockOnScanAnother = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use V2 for standalone source', () => {
    const component = renderHealthReport({
      result: mockResult,
      onScanAnother: mockOnScanAnother,
      onClose: mockOnClose,
      analysisData: { source: 'standalone' }
    });

    // Should render the Enhanced component wrapper
    expect(component).toBeDefined();
    expect(component.type.name).toBe('EnhancedReportWithWatchdog');
  });

  it('should use legacy for manual source', () => {
    const component = renderHealthReport({
      result: mockResult,
      onScanAnother: mockOnScanAnother,
      onClose: mockOnClose,
      analysisData: { source: 'manual' }
    });

    // Should render legacy popup
    expect(component.type.name).toBe('HealthReportPopup');
  });

  it('should use legacy for voice source', () => {
    const component = renderHealthReport({
      result: mockResult,
      onScanAnother: mockOnScanAnother,
      onClose: mockOnClose,
      analysisData: { source: 'voice' }
    });

    expect(component.type.name).toBe('HealthReportPopup');
  });

  it('should use legacy for barcode source', () => {
    const component = renderHealthReport({
      result: mockResult,
      onScanAnother: mockOnScanAnother,
      onClose: mockOnClose,
      analysisData: { source: 'barcode' }
    });

    expect(component.type.name).toBe('HealthReportPopup');
  });

  it('should use legacy for photo source', () => {
    const component = renderHealthReport({
      result: mockResult,
      onScanAnother: mockOnScanAnother,
      onClose: mockOnClose,
      analysisData: { source: 'photo' }
    });

    expect(component.type.name).toBe('HealthReportPopup');
  });

  it('should use legacy for unknown source', () => {
    const component = renderHealthReport({
      result: mockResult,
      onScanAnother: mockOnScanAnother,
      onClose: mockOnClose,
      analysisData: { source: 'unknown' }
    });

    expect(component.type.name).toBe('HealthReportPopup');
  });

  it('should use legacy when analysisData is missing', () => {
    const component = renderHealthReport({
      result: mockResult,
      onScanAnother: mockOnScanAnother,
      onClose: mockOnClose
      // analysisData is undefined
    });

    expect(component.type.name).toBe('HealthReportPopup');
  });

  it('should log telemetry for standalone route', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    renderHealthReport({
      result: mockResult,
      onScanAnother: mockOnScanAnother,
      onClose: mockOnClose,
      analysisData: { source: 'standalone' }
    });

    // Should log boot telemetry with correct format
    expect(consoleSpy).toHaveBeenCalledWith(
      '[REPORT][V2][BOOT]',
      expect.objectContaining({
        entry: 'standalone',
        flags: expect.objectContaining({
          hasToggle: expect.any(Boolean),
          hasFlagsTab: expect.any(Boolean),
          hasSaveTab: expect.any(Boolean),
          hasSuggestions: expect.any(Boolean)
        }),
        hasPer100g: expect.any(Boolean),
        hasPerServing: expect.any(Boolean),
        flagsCount: expect.any(Number)
      })
    );
    
    consoleSpy.mockRestore();
  });

  it('should not log V2 telemetry for non-standalone routes', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    renderHealthReport({
      result: mockResult,
      onScanAnother: mockOnScanAnother,
      onClose: mockOnClose,
      analysisData: { source: 'photo' }
    });

    // Should not log V2 boot telemetry
    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[REPORT][V2][BOOT]',
      expect.any(Object)
    );
    
    consoleSpy.mockRestore();
  });
});