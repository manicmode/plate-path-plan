import React, { useEffect, useState } from 'react';
import AccessibleDialogContent from '@/components/a11y/AccessibleDialogContent';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ScanBarcode, AlertCircle, FileText, Smartphone, Globe } from 'lucide-react';
import { BarcodeScanner as CapBarcodeScanner, BarcodeFormat, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { WebBarcodeScanner } from './WebBarcodeScanner';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showWebScanner, setShowWebScanner] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [platformInfo, setPlatformInfo] = useState({
    isNative: false,
    isWeb: false,
    platform: 'unknown'
  });

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[BARCODE][MOUNT]');
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[BARCODE][GUARD] active');
      const original = console.log;
      console.log = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].startsWith('[PHOTO]')) {
          original('[GUARD][VIOLATION] Photo log during barcode mode:', args[0], args[1] ?? '');
        }
        original(...args);
      };
      return () => { console.log = original; };
    }
  }, []);

  useEffect(() => {
    const checkPlatformAndSupport = async () => {
      // Detect platform
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      const isWeb = platform === 'web';

      setPlatformInfo({
        isNative,
        isWeb,
        platform
      });

      if (isNative) {
        // Native app - check ML Kit support
        try {
          const result = await CapBarcodeScanner.isSupported();
          setIsSupported(result.supported);
          if (!result.supported) {
            setError('ML Kit barcode scanning is not available on this device');
          }
        } catch (err) {
          console.error('Error checking ML Kit support:', err);
          setIsSupported(false);
          setError('Unable to access native barcode scanner');
        }
      } else {
        // Web browser - check camera access
        try {
          const hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
          setIsSupported(hasCamera);
          if (!hasCamera) {
            setError('Camera access is not available in this browser');
          }
        } catch (err) {
          console.error('Error checking camera support:', err);
          setIsSupported(false);
          setError('Unable to access camera');
        }
      }
    };

    if (isOpen) {
      checkPlatformAndSupport();
    }
  }, [isOpen]);

  const startScan = async () => {
    try {
      setIsScanning(true);
      setError(null);

      // Check and request camera permissions
      const permissions = await CapBarcodeScanner.requestPermissions();
      if (permissions.camera !== 'granted') {
        setError('Camera access is required to scan barcodes. Please enable it in Settings > Plate Path Plan.');
        setIsScanning(false);
        return;
      }

      // Start scanning
      await CapBarcodeScanner.addListener('barcodesScanned', async (result) => {
        console.log('Barcode detected:', result);
        if (result.barcodes && result.barcodes.length > 0) {
          const barcode = result.barcodes[0];
          if (barcode.displayValue) {
            await stopScan();
            onBarcodeDetected(barcode.displayValue);
            onClose();
          }
        }
      });

      await CapBarcodeScanner.startScan({
        formats: [
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.UpcA,
          BarcodeFormat.UpcE,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.Code93,
          BarcodeFormat.Codabar,
          BarcodeFormat.DataMatrix,
          BarcodeFormat.Pdf417,
          BarcodeFormat.QrCode,
          BarcodeFormat.Itf,
          BarcodeFormat.Aztec,
        ],
        lensFacing: LensFacing.Back
      });

      toast.success('Scanner ready - align barcode within frame');

    } catch (err) {
      console.error('Barcode scanning error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start scanner';
      
      if (errorMessage.includes('permission')) {
        setError('Camera access is required to scan barcodes. Please enable it in Settings > Plate Path Plan.');
      } else {
        setError(errorMessage);
      }
      setIsScanning(false);
    }
  };

  const stopScan = async () => {
    try {
      await CapBarcodeScanner.stopScan();
      await CapBarcodeScanner.removeAllListeners();
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping scan:', err);
    }
  };

  const handleClose = async () => {
    if (isScanning) {
      await stopScan();
    }
    setShowManualEntry(false);
    setShowWebScanner(false);
    setBarcodeValue('');
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcodeValue.trim()) {
      toast.error('Please enter a barcode number');
      return;
    }

    // Basic validation for common barcode formats
    const cleanBarcode = barcodeValue.trim().replace(/\s+/g, '');
    
    // Check for valid barcode patterns (UPC, EAN, etc.)
    if (!/^\d{8,14}$/.test(cleanBarcode)) {
      toast.error('Please enter a valid barcode (8-14 digits)');
      return;
    }

    onBarcodeDetected(cleanBarcode);
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and spaces
    const value = e.target.value.replace(/[^\d\s]/g, '');
    setBarcodeValue(value);
  };

  // Enhanced platform-specific information
  const PlatformInfoDisplay = () => (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800 mb-4">
      <div className="flex items-center gap-2 mb-2">
        {platformInfo.isNative ? (
          <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        )}
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          {platformInfo.isNative ? 'Native App' : 'Web Browser'}
        </span>
      </div>
      <p className="text-xs text-blue-600 dark:text-blue-400">
        {platformInfo.isNative 
          ? 'Full ML Kit barcode scanning with advanced features'
          : 'Browser-based camera scanning with basic barcode support'
        }
      </p>
    </div>
  );

  // Enhanced fallback for unsupported devices
  const UnsupportedDeviceFallback = () => (
    <div className="flex flex-col items-center justify-center space-y-4 p-6">
      <AlertCircle className="h-16 w-16 text-red-400 mb-2" />
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 text-center">
        {platformInfo.isNative ? 'ML Kit Not Available' : 'Camera Access Denied'}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center text-sm mb-4">
        {platformInfo.isNative 
          ? 'This device doesn\'t support ML Kit barcode scanning.'
          : 'Barcode scanning works best in the native app. Use \'Enter Barcode Manually\' in PWA.'
        }
      </p>
      
      <div className="w-full space-y-3">
        {!platformInfo.isNative && (
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Retry Camera Access
          </Button>
        )}
        
        <input
          type="text"
          placeholder="Enter barcode number manually"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              onBarcodeDetected(e.currentTarget.value.trim());
              onClose();
            }
          }}
        />
        
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Look for the barcode number on the product packaging
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <AccessibleDialogContent 
        title="Barcode Scanner"
        description="Position the barcode within the camera view to scan"
        className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Scan Barcode
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Platform Information */}
          <PlatformInfoDisplay />

          {/* Scanner Content */}
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
              <p className="text-red-600 dark:text-red-400 text-center mb-4">
                {error}
              </p>
              <div className="space-y-3">
                {platformInfo.isWeb && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setShowWebScanner(true);
                    }}
                    className="w-full border-blue-300 text-blue-600"
                  >
                    Try Web Scanner
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setError(null)}
                  className="w-full border-red-300 text-red-600"
                >
                  Try Again
                </Button>
                <Button
                  variant="default"
                  onClick={() => setShowManualEntry(true)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                >
                  Enter Code Manually
                </Button>
              </div>
            </div>
          ) : !isSupported ? (
            <UnsupportedDeviceFallback />
          ) : showWebScanner ? (
            <WebBarcodeScanner
              onBarcodeDetected={(barcode) => {
                onBarcodeDetected(barcode);
                onClose();
              }}
              onClose={() => setShowWebScanner(false)}
            />
          ) : showManualEntry ? (
            /* Manual Entry Form */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Enter Barcode Manually
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Type or paste the barcode number from the product
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Barcode Number
                  </label>
                  <input
                    type="text"
                    value={barcodeValue}
                    onChange={handleInputChange}
                    placeholder="e.g., 123456789012"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-lg font-mono tracking-wider bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    maxLength={14}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Look for numbers below the barcode stripes
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowManualEntry(false)}
                    className="w-full"
                  >
                    Back to Scanner
                  </Button>
                  <Button
                    type="submit"
                    disabled={!barcodeValue.trim()}
                    className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                  >
                    Search Product
                  </Button>
                </div>
              </form>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <ScanBarcode className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">Supported formats:</p>
                    <p>UPC-A (12 digits), EAN-13 (13 digits), EAN-8 (8 digits)</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Scanner Instructions */}
              <div className="text-center mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                {isScanning 
                  ? "Hold steady and align the barcode within the scanning frame. Keep the camera 4-6 inches away for best results."
                  : "Tap 'Start Scanning' to open the camera and scan a product barcode"
                }
              </p>
            </div>

                {/* Scanner Visualization */}
                <div className="relative bg-gray-900 rounded-xl overflow-hidden h-64 flex items-start justify-center pt-12">
                  {isScanning ? (
                    <>
                      {/* Scanning Frame with improved UI */}
                      <div className="absolute inset-0 bg-black bg-opacity-60" />
                      <div className="relative w-56 h-36 border-2 border-emerald-400 rounded-lg shadow-lg">
                        {/* Corner indicators */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                        
                        {/* Scanning line */}
                        <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 transform -translate-y-1/2 animate-pulse shadow-lg" />
                        
                        {/* Pulsing border effect */}
                        <div className="absolute inset-0 border border-emerald-300 border-opacity-50 rounded-lg animate-pulse" />
                      </div>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-emerald-600 bg-opacity-90 rounded-lg px-4 py-2">
                          <span className="text-sm text-white font-medium">Scanning for barcode...</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <ScanBarcode className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 text-sm">High-resolution camera scanner</p>
                      <p className="text-gray-500 text-xs mt-1">Supports UPC, EAN, QR codes</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isScanning ? (
                  <>
                    <Button
                      onClick={platformInfo.isNative ? startScan : () => setShowWebScanner(true)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12"
                    >
                      <ScanBarcode className="h-5 w-5 mr-2" />
                      {platformInfo.isNative ? 'Start ML Kit Scanner' : 'Start Camera Scanner'}
                    </Button>
                    
                    {platformInfo.isWeb && (
                      <div className="text-center">
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                          Browser camera scanning - basic barcode support
                        </p>
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => setShowManualEntry(true)}
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      🔎 Enter Barcode Manually
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      (For damaged or unscannable barcodes)
                    </p>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={stopScan}
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Stop Scanning
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </AccessibleDialogContent>
    </Dialog>
  );
};