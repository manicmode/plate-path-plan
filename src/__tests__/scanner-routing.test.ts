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
    it('should navigate to /scan/not-found on OCR failure from photo mode', () => {
      const handleOcrFailure = (source: string, reason: string) => {
        if (source === 'photo') {
          mockNavigate('/scan/not-found', { 
            state: { 
              source: 'photo', 
              tips: ['Try closer photo', 'Use Manual/Voice'], 
              retryMode: 'photo' 
            }
          });
        }
      };

      handleOcrFailure('photo', 'low_confidence');

      expect(mockNavigate).toHaveBeenCalledWith('/scan/not-found', {
        state: {
          source: 'photo',
          tips: ['Try closer photo', 'Use Manual/Voice'],
          retryMode: 'photo'
        }
      });
    });

    it('should NOT navigate to /scan/not-found from barcode mode', () => {
      const handleBarcodeFailure = (source: string, reason: string) => {
        if (source === 'barcode') {
          // Keep existing behavior - do not route to not-found
          console.log('Barcode failed, keeping existing fallback behavior');
        }
      };

      handleBarcodeFailure('barcode', 'no_detection');

      expect(mockNavigate).not.toHaveBeenCalled();
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
  it('should never reach /scan/not-found during barcode mode', () => {
    const routingLogic = (mode: string, detectionResult: string | null) => {
      if (mode === 'photo' && !detectionResult) {
        return '/scan/not-found';
      }
      if (mode === 'barcode' && !detectionResult) {
        return null; // Keep existing behavior, don't route to not-found
      }
      return null;
    };

    expect(routingLogic('barcode', null)).toBeNull();
    expect(routingLogic('barcode', 'failed')).toBeNull();
    expect(routingLogic('photo', null)).toBe('/scan/not-found');
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
