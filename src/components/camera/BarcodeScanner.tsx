import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ScanBarcode, AlertCircle } from 'lucide-react';
import { BarcodeScanner as CapBarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { toast } from 'sonner';

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

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const result = await CapBarcodeScanner.isSupported();
        setIsSupported(result.supported);
        if (!result.supported) {
          setError('Barcode scanning is not supported on this device');
        }
      } catch (err) {
        console.error('Error checking barcode scanner support:', err);
        setIsSupported(false);
        setError('Unable to access barcode scanner');
      }
    };

    if (isOpen) {
      checkSupport();
    }
  }, [isOpen]);

  const startScan = async () => {
    try {
      setIsScanning(true);
      setError(null);

      // Request camera permissions
      const permissions = await CapBarcodeScanner.requestPermissions();
      if (permissions.camera !== 'granted') {
        throw new Error('Camera permission denied');
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
        ]
      });

    } catch (err) {
      console.error('Barcode scanning error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start scanner');
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
    onClose();
  };

  // Web fallback scanner (basic implementation)
  const WebFallbackScanner = () => (
    <div className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-xl">
      <ScanBarcode className="h-16 w-16 text-gray-400 mb-4" />
      <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
        Barcode scanning requires a native mobile app or device with camera access
      </p>
      <input
        type="text"
        placeholder="Enter barcode manually"
        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-center"
        onKeyPress={(e) => {
          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            onBarcodeDetected(e.currentTarget.value.trim());
            onClose();
          }
        }}
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden">
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

          {/* Scanner Content */}
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
              <p className="text-red-600 dark:text-red-400 text-center mb-4">
                {error}
              </p>
              <Button
                variant="outline"
                onClick={() => setError(null)}
                className="border-red-300 text-red-600"
              >
                Try Again
              </Button>
            </div>
          ) : !isSupported ? (
            <WebFallbackScanner />
          ) : (
            <>
              {/* Scanner Instructions */}
              <div className="text-center mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    {isScanning 
                      ? "Align the barcode within the camera view to scan automatically"
                      : "Tap 'Start Scanning' to open the camera and scan a product barcode"
                    }
                  </p>
                </div>

                {/* Scanner Visualization */}
                <div className="relative bg-gray-900 rounded-xl overflow-hidden h-64 flex items-center justify-center">
                  {isScanning ? (
                    <>
                      {/* Scanning Frame */}
                      <div className="absolute inset-0 bg-black bg-opacity-50" />
                      <div className="relative w-48 h-32 border-2 border-white rounded-lg">
                        <div className="absolute inset-0 border border-dashed border-white border-opacity-50 rounded-lg animate-pulse" />
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 transform -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-white bg-opacity-90 rounded-lg px-3 py-1">
                          <span className="text-xs text-gray-900 font-medium">Scanning...</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <ScanBarcode className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 text-sm">Camera will open here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isScanning ? (
                  <Button
                    onClick={startScan}
                    className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12"
                  >
                    <ScanBarcode className="h-5 w-5 mr-2" />
                    Start Scanning
                  </Button>
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
      </DialogContent>
    </Dialog>
  );
};