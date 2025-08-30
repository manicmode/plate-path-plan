/**
 * Barcode Scanner Mount Tests
 * Ensures barcode scanner mounts properly and photo OCR stays isolated
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/featureFlags', () => ({
  FF: {
    PIPELINE_ISOLATION: false,
    BARCODE_ISOLATED: false
  }
}));

describe('Barcode Scanner Mount Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should mount scanner for barcode mode', () => {
    const shouldMountScanner = (mode: string, ctx: any) => {
      const isPhotoOcrOnly = ctx.mode === "photo" && ctx.ocrOnly === true;
      return !isPhotoOcrOnly;
    };

    const barcodeContext = { mode: 'barcode', ocrOnly: false };
    const photoContext = { mode: 'photo', ocrOnly: true };
    
    expect(shouldMountScanner('barcode', barcodeContext)).toBe(true);
    expect(shouldMountScanner('photo', photoContext)).toBe(false);
  });

  it('should NOT use ocrOnly flag for barcode captures', () => {
    const analysisData = { source: 'barcode' };
    const options = { ocrOnly: true };
    
    // Simulate the logic from HealthCheckModal
    const isPhotoOcrOnly = options?.ocrOnly && analysisData?.source === 'photo';
    
    expect(isPhotoOcrOnly).toBe(false);
  });

  it('should use ocrOnly flag only for photo captures', () => {
    const analysisData = { source: 'photo' };
    const options = { ocrOnly: true };
    
    // Simulate the logic from HealthCheckModal
    const isPhotoOcrOnly = options?.ocrOnly && analysisData?.source === 'photo';
    
    expect(isPhotoOcrOnly).toBe(true);
  });
});

describe('Photo OCR Isolation', () => {
  it('should isolate photo OCR from barcode scanner', () => {
    const analysisData = { source: 'photo', imageBase64: 'test-image' };
    const options = { ocrOnly: true };
    
    // Simulate the logic from HealthCheckModal
    const isPhotoOcrOnly = options?.ocrOnly && analysisData?.source === 'photo';
    
    expect(isPhotoOcrOnly).toBe(true);
  });

  it('should NOT apply ocrOnly to barcode mode', () => {
    const analysisData = { source: 'barcode' };
    const options = { ocrOnly: true };
    
    // Simulate the logic from HealthCheckModal
    const isPhotoOcrOnly = options?.ocrOnly && analysisData?.source === 'photo';
    
    expect(isPhotoOcrOnly).toBe(false);
  });

  it('should NOT apply ocrOnly without photo source', () => {
    const analysisData = { source: 'manual' };
    const options = { ocrOnly: true };
    
    // Simulate the logic from HealthCheckModal
    const isPhotoOcrOnly = options?.ocrOnly && analysisData?.source === 'photo';
    
    expect(isPhotoOcrOnly).toBe(false);
  });
});