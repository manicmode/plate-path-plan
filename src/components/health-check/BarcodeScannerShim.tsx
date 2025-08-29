import React, { useEffect } from 'react';
import { HealthScannerInterface } from './HealthScannerInterface';

type Props = React.ComponentProps<typeof HealthScannerInterface> & {
  // For explicitness, no photo code should run when using this shim.
  __forceBarcodeOnly?: true;
};

export default function BarcodeScannerShim(props: Props) {
  useEffect(() => {
    if (import.meta.env.DEV) console.log('[BARCODE][MOUNT]: shim');
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log('[BARCODE][GUARD] active');
    const original = console.log;
    console.log = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].startsWith('[PHOTO]')) {
        original('[GUARD][VIOLATION] Photo log during barcode mode:', args[0], args[1] ?? '');
      }
      original(...args);
    };
    return () => { console.log = original; };
  }, []);

  return (
    <HealthScannerInterface
      {...props}
      // Explicit signal to the unified scanner: barcode-only mode
      mode="barcode"
      // optional guard to keep photo dormant
      onAnalysisTimeout={undefined}
      onAnalysisFail={undefined}  
      onAnalysisSuccess={undefined}
    />
  );
}
