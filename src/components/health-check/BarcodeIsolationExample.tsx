/**
 * DEV-ONLY EXAMPLE: How to wire barcode pipeline in isolation
 * This shows how PipelineRouter would work when flags are enabled
 * NOT USED IN PRODUCTION - just demonstrates the wiring pattern
 */

import { FF } from '@/featureFlags';
import { PipelineRouter } from './PipelineRouter';
import { analyzeBarcode } from '@/pipelines/barcodePipeline';

// Example of how a barcode scanner would be wrapped
export function BarcodeIsolationExample() {
  if (!import.meta.env.DEV) return null;
  
  const handleBarcodeDetected = async (code: string) => {
    if (FF.PIPELINE_ISOLATION && FF.BARCODE_ISOLATED) {
      console.log('[DEV] Using isolated barcode pipeline');
      const result = await analyzeBarcode({ code });
      if (result.ok) {
        console.log('[DEV] Analysis complete:', result.report);
        // Would call modal state transition here
      } else {
        // TypeScript knows result has reason property when ok is false
        console.log('[DEV] Analysis failed:', (result as { ok: false; reason: string }).reason);
        // Would show fallback or error state
      }
    } else {
      console.log('[DEV] Using legacy barcode flow');
      // Current implementation continues unchanged
    }
  };

  return (
    <div className="p-4 border-2 border-dashed border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
      <h3 className="text-sm font-mono text-yellow-800 dark:text-yellow-200">
        DEV: Barcode Pipeline Isolation Example
      </h3>
      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
        Flags: PIPELINE_ISOLATION={String(FF.PIPELINE_ISOLATION)}, BARCODE_ISOLATED={String(FF.BARCODE_ISOLATED)}
      </p>
      <div className="mt-2">
        {FF.PIPELINE_ISOLATION ? (
          <PipelineRouter mode="barcode">
            <div className="text-xs font-mono bg-green-100 dark:bg-green-900/20 p-2 rounded">
              🔒 ISOLATED: Barcode scanner would be rendered here
            </div>
          </PipelineRouter>
        ) : (
          <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
            📱 LEGACY: Current barcode scanner continues unchanged
          </div>
        )}
      </div>
      <button 
        onClick={() => handleBarcodeDetected('1234567890123')}
        className="mt-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Pipeline
      </button>
    </div>
  );
}
