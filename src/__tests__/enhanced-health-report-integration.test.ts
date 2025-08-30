/**
 * Enhanced Health Report Integration Tests
 * Ensures all health flows render the enhanced report with new features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHealthReport } from '@/lib/health/renderHealthReport';
import { isFeatureEnabled } from '@/lib/featureFlags';

// Mock feature flags
vi.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: vi.fn()
}));

// Mock components
vi.mock('@/components/health-check/EnhancedHealthReport', () => ({
  EnhancedHealthReport: vi.fn(() => 'EnhancedHealthReport')
}));

vi.mock('@/components/health-check/HealthReportPopup', () => ({
  HealthReportPopup: vi.fn(() => 'HealthReportPopup')
}));

describe('Enhanced Health Report Integration', () => {
  const mockResult = {
    itemName: 'Test Product',
    productName: 'Test Product',
    title: 'Test Product',
    healthScore: 7.5,
    overallRating: 'good' as const,
    ingredientFlags: [
      { 
        ingredient: 'sugar', 
        flag: 'added_sugar', 
        severity: 'medium' as const,
        reason: 'Contains Added Sugar' 
      }
    ],
    nutritionData: { calories: 150, protein: 5 },
    healthProfile: {
      isOrganic: false,
      isGMO: false,
      allergens: [],
      preservatives: [],
      additives: []
    },
    personalizedWarnings: [],
    suggestions: [],
    ingredientsText: 'sugar, wheat flour'
  };

  const mockOptions = {
    result: mockResult,
    onScanAnother: vi.fn(),
    onClose: vi.fn(),
    analysisData: { source: 'barcode' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Flag Integration', () => {
    it('should render EnhancedHealthReport when V2 is enabled', () => {
      vi.mocked(isFeatureEnabled).mockImplementation((flag) => {
        return flag === 'health_report_v2_enabled';
      });

      const result = renderHealthReport(mockOptions);
      
      expect(result.type.name).toBe('EnhancedHealthReport');
    });

    it('should render legacy HealthReportPopup when V2 is disabled', () => {
      vi.mocked(isFeatureEnabled).mockReturnValue(false);

      const result = renderHealthReport(mockOptions);
      
      expect(result.type.name).toBe('HealthReportPopup');
    });

    it('should log telemetry with feature flag states', () => {
      vi.mocked(isFeatureEnabled).mockImplementation((flag) => {
        switch (flag) {
          case 'health_report_v2_enabled': return true;
          case 'nutrition_toggle_enabled': return true;
          case 'flags_tab_enabled': return true;
          case 'save_tab_enabled': return true;
          case 'smart_suggestions_enabled': return true;
          default: return false;
        }
      });

      renderHealthReport(mockOptions);

      expect(console.log).toHaveBeenCalledWith('[REPORT][V2]', {
        entry: 'barcode',
        hasToggle: true,
        hasFlagsTab: true,
        hasSaveTab: true,
        hasSuggestions: true,
        portionGrams: 'auto-detected',
        flagsCount: 1
      });
    });
  });

  describe('Universal Entry Points', () => {
    it('should handle barcode flow', () => {
      vi.mocked(isFeatureEnabled).mockReturnValue(true);
      
      const barcodeOptions = {
        ...mockOptions,
        analysisData: { source: 'barcode', barcode: '123456789' }
      };

      const result = renderHealthReport(barcodeOptions);
      
      expect(result.type.name).toBe('EnhancedHealthReport');
      expect(result.props.analysisData.source).toBe('barcode');
    });

    it('should handle manual flow', () => {
      vi.mocked(isFeatureEnabled).mockReturnValue(true);
      
      const manualOptions = {
        ...mockOptions,
        analysisData: { source: 'manual' }
      };

      const result = renderHealthReport(manualOptions);
      
      expect(result.type.name).toBe('EnhancedHealthReport');
      expect(result.props.analysisData.source).toBe('manual');
    });

    it('should handle voice flow', () => {
      vi.mocked(isFeatureEnabled).mockReturnValue(true);
      
      const voiceOptions = {
        ...mockOptions,
        analysisData: { source: 'voice' }
      };

      const result = renderHealthReport(voiceOptions);
      
      expect(result.type.name).toBe('EnhancedHealthReport');
      expect(result.props.analysisData.source).toBe('voice');
    });

    it('should handle photo OCR flow', () => {
      vi.mocked(isFeatureEnabled).mockReturnValue(true);
      
      const photoOptions = {
        ...mockOptions,
        analysisData: { source: 'photo', imageUrl: 'data:image/jpeg;base64,test' }
      };

      const result = renderHealthReport(photoOptions);
      
      expect(result.type.name).toBe('EnhancedHealthReport');
      expect(result.props.analysisData.source).toBe('photo');
    });
  });

  describe('Props Passing', () => {
    it('should pass all props correctly to EnhancedHealthReport', () => {
      vi.mocked(isFeatureEnabled).mockReturnValue(true);

      const fullOptions = {
        ...mockOptions,
        initialIsSaved: true,
        hideCloseButton: true
      };

      const result = renderHealthReport(fullOptions);
      
      expect(result.props.result).toEqual(mockResult);
      expect(result.props.onScanAnother).toBe(fullOptions.onScanAnother);
      expect(result.props.onClose).toBe(fullOptions.onClose);
      expect(result.props.analysisData).toBe(fullOptions.analysisData);
      expect(result.props.initialIsSaved).toBe(true);
      expect(result.props.hideCloseButton).toBe(true);
    });
  });
});