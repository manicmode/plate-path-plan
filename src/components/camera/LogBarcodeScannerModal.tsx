import React, { useState } from 'react';
import { FF } from '@/featureFlags';
import AutoModeChip from '@/components/scanner/AutoModeChip';
import BarcodeViewport from '@/components/scanner/BarcodeViewport';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeDetected: (barcode: string) => void;
  onManualEntry: () => void;
}

export default function LogBarcodeScannerModal({ open, onOpenChange, onBarcodeDetected, onManualEntry }: Props) {
  if (typeof window === 'undefined' || !open) return null;

  const [autoOn, setAutoOn] = useState(() => FF.FEATURE_AUTO_CAPTURE && (localStorage.getItem('scanner:auto') ?? 'on') !== 'off');
  const [capturing, setCapturing] = useState(false);
  
  const toggleAuto = () => {
    const next = !autoOn; 
    setAutoOn(next);
    try { 
      localStorage.setItem('scanner:auto', next ? 'on' : 'off'); 
    } catch {}
  };

  const handleCapture = (decoded: { code: string }) => {
    setCapturing(true);
    onBarcodeDetected(decoded.code);
    // Reset capturing state after a delay
    setTimeout(() => setCapturing(false), 1200);
  };

  const handleManualCapture = () => {
    if (capturing) return;
    // @ts-ignore
    window._barcodeViewportForceCapture?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="grid h-full grid-rows-[auto_1fr_auto]">
        <header className="row-start-1 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 relative">
          <h2 className="text-white text-lg font-semibold text-center">Scan a barcode</h2>
          {FF.FEATURE_AUTO_CAPTURE && (
            <AutoModeChip 
              on={autoOn} 
              onClick={toggleAuto} 
              className="absolute left-4 top-1/2 -translate-y-1/2" 
            />
          )}
          <button 
            onClick={() => onOpenChange(false)} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 text-xl"
          >
            ✕
          </button>
          <div className="mt-2 flex h-[28px] items-center justify-center">
            <span className="px-2.5 py-1 rounded-full text-[11px] bg-emerald-400/12 text-emerald-300 border border-emerald-300/25">
              ● Ready to scan
            </span>
          </div>
        </header>

        <main className="row-start-2 grid place-items-center px-4">
          <div className="-translate-y-[clamp(8px,3vh,28px)]">
            <BarcodeViewport 
              isOpen={open} 
              autoOn={autoOn} 
              onCapture={handleCapture} 
            />
          </div>
        </main>

        <footer className="row-start-3 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button 
            onClick={handleManualCapture}
            disabled={capturing}
            className="w-full rounded-2xl py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-medium disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">📷 Scan & Log</span>
          </button>
          <button 
            onClick={onManualEntry}
            className="mt-3 mx-auto block text-white/80 underline"
          >
            Enter manually instead
          </button>
        </footer>
      </div>
    </div>
  );
}