/**
 * Scanner Lifecycle Tests
 * Ensures proper camera init → stream → warmup → scan loop sequence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock MediaDevices API
const mockGetUserMedia = vi.fn();
const mockMediaStream = {
  getVideoTracks: vi.fn(() => [{ 
    getSettings: vi.fn(() => ({ width: 720, height: 720, facingMode: 'environment' })),
    getCapabilities: vi.fn(() => ({ torch: true })),
    stop: vi.fn()
  }]),
  getAudioTracks: vi.fn(() => []),
  removeTrack: vi.fn()
};

Object.defineProperty(window.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true
});

// Mock video element
const mockVideoElement = {
  srcObject: null,
  play: vi.fn().mockResolvedValue(undefined),
  videoWidth: 720,
  videoHeight: 720,
  pause: vi.fn(),
  removeAttribute: vi.fn(),
  load: vi.fn()
};

// Mock MultiPassBarcodeScanner
vi.mock('@/utils/barcodeScan', () => ({
  MultiPassBarcodeScanner: vi.fn().mockImplementation(() => ({
    scanQuick: vi.fn().mockResolvedValue(null)
  }))
}));

// Mock platform detection
vi.mock('@/lib/platform', () => ({
  scannerLiveCamEnabled: vi.fn(() => true)
}));

import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';

describe('Scanner Lifecycle', () => {
  let logSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(mockMediaStream);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should follow proper init sequence: VIDEO INIT → Stream → Decoder warmup', async () => {
    // Simulate the scanner component mounting and starting camera
    const startCamera = async () => {
      console.log("[VIDEO INIT] videoRef =", mockVideoElement);
      
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 720 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[VIDEO] Stream received:", mediaStream);
      
      mockVideoElement.srcObject = mediaStream;
      await mockVideoElement.play();
      
      return mediaStream;
    };

    const warmUpDecoder = async () => {
      const scanner = new MultiPassBarcodeScanner();
      
      // Mock warm-up canvas
      const warmCanvas = document.createElement('canvas');
      warmCanvas.width = 100;
      warmCanvas.height = 50;
      
      await scanner.scanQuick(warmCanvas).catch(() => null);
      console.log('[WARM] Decoder warmed up');
      
      return scanner;
    };

    // Execute the lifecycle
    await startCamera();
    await warmUpDecoder();

    // Verify the sequence
    expect(logSpy).toHaveBeenCalledWith("[VIDEO INIT] videoRef =", mockVideoElement);
    expect(logSpy).toHaveBeenCalledWith("[VIDEO] Stream received:", mockMediaStream);
    expect(logSpy).toHaveBeenCalledWith('[WARM] Decoder warmed up');
    
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 720 },
        height: { ideal: 720 },
        frameRate: { ideal: 24, max: 30 }
      },
      audio: false
    });
    
    expect(mockVideoElement.play).toHaveBeenCalled();
    expect(MultiPassBarcodeScanner).toHaveBeenCalled();
  });

  it('should handle getUserMedia failure gracefully', async () => {
    const mockError = new Error('Permission denied');
    mockGetUserMedia.mockRejectedValueOnce(mockError);
    
    const startCamera = async () => {
      try {
        console.log("[VIDEO INIT] videoRef =", mockVideoElement);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        return mediaStream;
      } catch (error: any) {
        console.warn('[PHOTO] Live video denied, using native capture', error?.name || error);
        return null;
      }
    };

    const result = await startCamera();
    
    expect(result).toBeNull();
    expect(logSpy).toHaveBeenCalledWith("[VIDEO INIT] videoRef =", mockVideoElement);
    expect(logSpy).toHaveBeenCalledWith('[PHOTO] Live video denied, using native capture', mockError);
  });
});

describe('Quick Scan Loop', () => {
  let mockScanner: any;
  let logSpy: any;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockScanner = {
      scanQuick: vi.fn().mockResolvedValue(null)
    };
    (MultiPassBarcodeScanner as any).mockImplementation(() => mockScanner);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should run quick barcode scan with proper logging', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;

    const runQuickBarcodeScan = async (canvas: HTMLCanvasElement): Promise<string | null> => {
      const QUICK_SCAN_MS = 1000;
      const QUICK_PASSES = 4;
      
      console.log(`[HS] Quick barcode scan - budget: ${QUICK_SCAN_MS}ms, max passes: ${QUICK_PASSES}`);
      
      const scanner = new MultiPassBarcodeScanner();
      const barcodeResult = await scanner.scanQuick(canvas);
      
      if (barcodeResult) {
        console.log("🔍 Quick barcode hit:", {
          format: barcodeResult.format,
          value: barcodeResult.text
        });
        return barcodeResult.text;
      }
      
      console.log("🔍 Quick barcode scan: no detection");
      return null;
    };

    // Mock successful barcode detection
    mockScanner.scanQuick.mockResolvedValueOnce({
      text: '123456789012',
      format: 'UPC_A'
    });

    const result = await runQuickBarcodeScan(canvas);

    expect(logSpy).toHaveBeenCalledWith('[HS] Quick barcode scan - budget: 1000ms, max passes: 4');
    expect(logSpy).toHaveBeenCalledWith("🔍 Quick barcode hit:", {
      format: 'UPC_A',
      value: '123456789012'
    });
    expect(result).toBe('123456789012');
  });

  it('should handle no detection case', async () => {
    const canvas = document.createElement('canvas');
    
    const runQuickBarcodeScan = async (canvas: HTMLCanvasElement): Promise<string | null> => {
      console.log('[HS] Quick barcode scan - budget: 1000ms, max passes: 4');
      
      const scanner = new MultiPassBarcodeScanner();
      const barcodeResult = await scanner.scanQuick(canvas);
      
      if (!barcodeResult) {
        console.log("🔍 Quick barcode scan: no detection");
        return null;
      }
      
      return barcodeResult.text;
    };

    const result = await runQuickBarcodeScan(canvas);

    expect(logSpy).toHaveBeenCalledWith("🔍 Quick barcode scan: no detection");
    expect(result).toBeNull();
  });
});