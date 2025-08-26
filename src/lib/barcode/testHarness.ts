import { enhancedBarcodeDecode, chooseBarcode } from './enhancedDecoder';
import { ScanReport } from './diagnostics';

/**
 * Test harness for barcode detection using static images
 * Only available when NEXT_PUBLIC_SCAN_DEBUG === '1'
 */
export async function decodeTestImage(imagePath: string): Promise<ScanReport | null> {
  if (process.env.NEXT_PUBLIC_SCAN_DEBUG !== '1') {
    console.warn('[HS_TEST] Test harness only available in debug mode');
    return null;
  }
  
  try {
    console.log('[HS_TEST] Loading test image:', imagePath);
    
    // Fetch the test image
    const response = await fetch(imagePath);
    if (!response.ok) {
      throw new Error(`Failed to load test image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('[HS_TEST] Test image loaded:', blob.size, 'bytes');
    
    // Create test metadata
    const img = new Image();
    const imageUrl = URL.createObjectURL(blob);
    
    const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(imageUrl);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load test image'));
      };
      img.src = imageUrl;
    });
    
    // Run decode with enhanced decoder
    const roiRect = {
      x: 0,
      y: Math.floor(imageDimensions.height * 0.35),
      w: imageDimensions.width,
      h: Math.floor(imageDimensions.height * 0.3)
    };
    
    const result = await enhancedBarcodeDecode(
      blob,
      roiRect,
      window.devicePixelRatio,
      2000
    );
    
    console.log('[HS_TEST] Test decode complete:', {
      success: result.success,
      code: result.code,
      format: result.format,
      attempts: result.attempts,
      ms: result.ms
    });
    // Create a mock scan report for testing
    const mockReport: ScanReport = {
      reqId: `test-${Date.now()}`,
      env: {
        innerHeight: window.innerHeight,
        cssVh: '1vh',
        dpr: window.devicePixelRatio
      },
      roiStrategy: 'center',
      attempts: [],
      final: {
        success: result.success,
        code: result.code,
        normalizedAs: chooseBarcode(result),
        checkDigitOk: result.checksumOk || false,
        willScore: result.success,
        willFallback: !result.success,
        totalMs: result.ms
      }
    };
    
    return mockReport;
    
  } catch (error) {
    console.error('[HS_TEST] Test harness failed:', error);
    return null;
  }
}

/**
 * Run predefined test cases
 */
export async function runBarcodeTests(): Promise<void> {
  if (process.env.NEXT_PUBLIC_SCAN_DEBUG !== '1') {
    return;
  }
  
  console.log('[HS_TEST] Running barcode test suite...');
  
  const testCases = [
    { name: 'Sample UPC', path: '/test/skittles_upc.jpg', expectedCode: '036000291452' }
  ];
  
  for (const testCase of testCases) {
    console.log(`[HS_TEST] Testing: ${testCase.name}`);
    
    try {
      const report = await decodeTestImage(testCase.path);
      
      if (report) {
        const success = report.final.success;
        const matchesExpected = report.final.code === testCase.expectedCode || 
                               report.final.normalizedAs === testCase.expectedCode;
        
        console.log(`[HS_TEST] ${testCase.name}:`, {
          success,
          matchesExpected,
          code: report.final.code,
          normalizedAs: report.final.normalizedAs,
          attempts: report.attempts.length
        });
      } else {
        console.log(`[HS_TEST] ${testCase.name}: No report generated`);
      }
    } catch (error) {
      console.error(`[HS_TEST] ${testCase.name} failed:`, error);
    }
  }
  
  console.log('[HS_TEST] Test suite complete');
}