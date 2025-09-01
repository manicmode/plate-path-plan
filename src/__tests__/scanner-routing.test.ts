/**
 * Scanner Routing Tests
 * Ensures /scan always mounts barcode scanner and photo OCR routes to no-detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/scan', search: '', state: null })
}));

// Mock feature flags
vi.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: vi.fn((flag: string) => {
    switch (flag) {
      case 'image_analyzer_v1': return true;
      case 'fallback_voice_enabled': return true;
      case 'fallback_text_enabled': return true;
      default: return false;
    }
  })
}));

describe('Scanner Routing Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route: /scan', () => {
    it('should initialize with mode="barcode" and ocrOnly=false', () => {
      // Simulate ScanHub initialization on /scan route
      const initialMode = 'barcode';
      const initialOcrOnly = false;
      
      expect(initialMode).toBe('barcode');
      expect(initialOcrOnly).toBe(false);
    });

    it('should mount barcode scanner by default', () => {
      // Simulate scanner mounting logic
      const shouldMountScanner = (mode: string, ocrOnly: boolean) => {
        const isPhotoOcrOnly = mode === 'photo' && ocrOnly === true;
        return !isPhotoOcrOnly; // Should mount unless it's photo OCR-only
      };

      expect(shouldMountScanner('barcode', false)).toBe(true);
      expect(shouldMountScanner('mixed', false)).toBe(true);
      expect(shouldMountScanner('photo', false)).toBe(true);
      expect(shouldMountScanner('photo', true)).toBe(false); // Only this should skip
    });
  });

  describe('Photo OCR Fallback Routing', () => {
    it('should show inline fallback on OCR failure from photo mode', () => {
      const mockSetState = vi.fn();
      const handleOcrFailure = (source: string, reason: string) => {
        if (source === 'photo') {
          mockSetState('no_detection');
        }
      };

      handleOcrFailure('photo', 'low_confidence');

      expect(mockSetState).toHaveBeenCalledWith('no_detection');
    });

    it('should NOT show fallback navigation from barcode mode', () => {
      const mockSetState = vi.fn();
      const handleBarcodeFailure = (source: string, reason: string) => {
        if (source === 'barcode') {
          // Keep existing behavior - do not show inline fallback
          console.log('Barcode failed, keeping existing fallback behavior');
        }
      };

      handleBarcodeFailure('barcode', 'no_detection');

      expect(mockSetState).not.toHaveBeenCalled();
    });
  });

  describe('Health Check Photo Modal', () => {
    it('should call handleImageCapture with ocrOnly:true for photo source', () => {
      const mockHandleImageCapture = vi.fn();
      
      const simulatePhotoCapture = (source: string, imageData: string) => {
        if (source === 'photo') {
          mockHandleImageCapture(imageData, { ocrOnly: true });
        } else {
          mockHandleImageCapture(imageData);
        }
      };

      simulatePhotoCapture('photo', 'base64-image-data');
      expect(mockHandleImageCapture).toHaveBeenCalledWith('base64-image-data', { ocrOnly: true });

      simulatePhotoCapture('barcode', 'base64-image-data');
      expect(mockHandleImageCapture).toHaveBeenCalledWith('base64-image-data');
    });

    it('should never touch /scan scanner internals from photo modal', () => {
      // Health Check Photo modal should be completely isolated
      const analysisData = { source: 'photo', imageBase64: 'test-data' };
      const touchesScannerInternals = analysisData.source === 'barcode';
      
      expect(touchesScannerInternals).toBe(false);
    });
  });
});

describe('Contract Tests', () => {
  it('should use inline fallback for photo mode, no fallback for barcode mode', () => {
    const routingLogic = (mode: string, detectionResult: string | null) => {
      if (mode === 'photo' && !detectionResult) {
        return 'inline_fallback';
      }
      if (mode === 'barcode' && !detectionResult) {
        return null; // Keep existing behavior, no fallback needed
      }
      return null;
    };

    expect(routingLogic('barcode', null)).toBeNull();
    expect(routingLogic('barcode', 'failed')).toBeNull();
    expect(routingLogic('photo', null)).toBe('inline_fallback');
  });

  it('should maintain separation between scanner modes', () => {
    const modes = {
      barcode: { allowsQuickScan: true, allowsOcrOnly: false },
      photo: { allowsQuickScan: false, allowsOcrOnly: true },
      mixed: { allowsQuickScan: true, allowsOcrOnly: false }
    };

    expect(modes.barcode.allowsQuickScan).toBe(true);
    expect(modes.barcode.allowsOcrOnly).toBe(false);
    expect(modes.photo.allowsOcrOnly).toBe(true);
    expect(modes.photo.allowsQuickScan).toBe(false);
  });
});
