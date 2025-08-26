import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, Target, Zap, X, Search, Mic, Lightbulb, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { VoiceRecordingButton } from '../ui/VoiceRecordingButton';
import { normalizeHealthScanImage } from '@/utils/imageNormalization';
import { useViewportUnitsFix } from '@/hooks/useViewportUnitsFix';
import { copyDebugToClipboard, startScanReport, finalizeScanReport } from '@/lib/barcode/diagnostics';
import { enhancedBarcodeDecode, chooseBarcode } from '@/lib/barcode/enhancedDecoder';
import { decodeTestImage, runBarcodeTests } from '@/lib/barcode/testHarness';
import { cropReticleROIFromVideo } from '@/lib/barcode/roiUtils';

interface HealthScannerInterfaceProps {
  onCapture: (imageData: string) => void;
  onManualEntry: () => void;
  onManualSearch?: (query: string, type: 'text' | 'voice') => void;
  onCancel?: () => void;
}

export const HealthScannerInterface: React.FC<HealthScannerInterfaceProps> = ({
  onCapture,
  onManualEntry,
  onManualSearch,
  onCancel
}) => {
  useViewportUnitsFix(); // Add viewport fix hook
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentView, setCurrentView] = useState<'scanner' | 'manual' | 'notRecognized'>('scanner');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDebugCopy, setShowDebugCopy] = useState(false);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Disable debug by default for performance
    const debugEnabled = false;
    setIsDebugEnabled(debugEnabled);
    
    if (currentView === 'scanner') {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'manual' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [currentView]);

  const startCamera = async () => {
    try {
      if (isDebugEnabled) console.log("[HS] camera_init");
      if (!videoRef.current) {
        console.error("[VIDEO] videoRef is null — video element not mounted");
        return;
      }

      if (isDebugEnabled && location.protocol !== 'https:') {
        console.warn("[SECURITY] Camera requires HTTPS — current protocol:", location.protocol);
      }
      // Enhanced camera constraints for barcode detection
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: 'continuous'
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (isDebugEnabled) console.log("[CAMERA] Stream received:", mediaStream);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        if (isDebugEnabled) console.log("[CAMERA] srcObject set, playing video");
      } else {
        console.error("[CAMERA] videoRef.current is null");
      }
    } catch (error) {
      console.error("[CAMERA FAIL] getUserMedia error:", error);
      console.error('Error accessing camera:', error);
    }
  };

  const playCameraClickSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Camera click sound not available');
    }
  };

  const analyzeNow = async () => {
    try {
      console.log('[HS] analyze_start');
      console.time('[HS] analyze_total');

      if (!videoRef.current || !canvasRef.current) {
        console.error("❌ Missing video or canvas ref!");
        return;
      }

      playCameraClickSound();
      setIsScanning(true);
      
      // A) CAPTURE FULL-RES FRAME (from video; do NOT compress yet)
      const video = videoRef.current;
      await video.play(); // Ensure dimensions are available on iOS
      
      const vw = video.videoWidth, vh = video.videoHeight;
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = vw; 
      frameCanvas.height = vh;
      const fx = frameCanvas.getContext('2d')!;
      fx.imageSmoothingEnabled = false;
      fx.drawImage(video, 0, 0, vw, vh);

      // B) CROP ROI FROM VIDEO PIXELS (center ~70% x 40%)
      const roiW = Math.round(vw * 0.70);
      const roiH = Math.round(vh * 0.40);
      const x = Math.round((vw - roiW) / 2);
      const y = Math.round((vh - roiH) / 2);

      console.log('[HS] roi', {
        vw: video.videoWidth, vh: video.videoHeight,
        roiW, roiH, x, y
      });

      // If ROI too small, fall back to full frame
      let roiCanvas: HTMLCanvasElement;
      if (roiW < 320 || roiH < 200) {
        roiCanvas = frameCanvas;
      } else {
        roiCanvas = document.createElement('canvas');
        roiCanvas.width = roiW; 
        roiCanvas.height = roiH;
        const rx = roiCanvas.getContext('2d', { willReadFrequently: true })!;
        rx.imageSmoothingEnabled = false;
        rx.drawImage(frameCanvas, x, y, roiW, roiH, 0, 0, roiW, roiH);
      }

      // C) BARCODE FIRST (budget ~2500ms) — BEFORE ANY NORMALIZATION
      console.time('[HS] decode');
      const t0 = performance.now();
      const dec = await enhancedBarcodeDecode({ canvas: roiCanvas, budgetMs: 2500 });
      console.timeEnd('[HS] decode');
      const chosen = chooseBarcode(dec);
      console.log('[HS] barcode_ms:', Math.round(performance.now() - t0));
      console.log('[HS] barcode_result:', {
        raw: chosen?.raw ?? null,
        type: chosen?.type ?? null,
        checksumOk: chosen?.checksumOk ?? null,
        reason: dec?.reason ?? null
      });

      // D) OFF lookup even if checksumOk === false, as long as 8/12/13/14 digits present
      let off: any = null;
      if (chosen?.raw && /^[0-9]{8,14}$/.test(chosen.raw)) {
        console.log('[HS] off_fetch_start', { code: chosen.raw });
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body: { mode: 'barcode', barcode: chosen.raw, source: 'health' }
        });
        off = error ? { status: 'error', product: null } : { status: 200, product: data };
        console.log('[HS] off_result', { status: error ? 'error' : 200, hit: !!data });
        
        if (!error && data) {
          // Push ScanReport for forensics
          if (typeof window !== 'undefined') {
            (window as any).__HS_LAST_REPORTS = (window as any).__HS_LAST_REPORTS ?? [];
            (window as any).__HS_LAST_REPORTS.unshift({
              reqId: Date.now().toString(36),
              device: { dpr: window.devicePixelRatio, videoW: vw, videoH: vh },
              capture: { frameW: frameCanvas.width, frameH: frameCanvas.height, roiW: roiCanvas.width, roiH: roiCanvas.height },
              attempts: dec.attempts,
              final: { 
                success: true, 
                code: chosen.raw, 
                checksumOk: chosen.checksumOk, 
                off: { status: 200, hit: true }, 
                reason: dec.reason, 
                totalMs: performance.now() - t0
              }
            });
          }
          
          // Create normalized image data for the rest of the pipeline
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d')!;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          const totalMs = Math.round(performance.now() - t0);
          console.log('[HS] analyze_total:', totalMs);
          console.timeEnd('[HS] analyze_total');
          onCapture(imageData + `&barcode=${chosen.raw}`);
          return;
        }
      }

      // E) ONLY NOW normalize/OCR fallback
      try {
        const blob = await new Promise<Blob>((resolve, reject) => {
          frameCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('toBlob returned null'));
          }, 'image/jpeg', 0.90);
        });
        
        console.log('[HS] normalized_blob', { type: blob.type, size: blob.size });
        
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const normalized = await normalizeHealthScanImage(file, {
          maxWidth: Math.max(vw, 1920),
          maxHeight: Math.max(vh, 1080),
          quality: 0.9,
          format: 'JPEG',
          stripExif: true
        });

        const totalMs = Math.round(performance.now() - t0);
        console.log('[HS] analyze_total:', totalMs);
        console.timeEnd('[HS] analyze_total');
        onCapture(normalized.dataUrl);
      } catch (err) {
        console.warn('[HS] normalize_error', String(err));
        // Continue with manual fallback UI
        const totalMs = Math.round(performance.now() - t0);
        console.log('[HS] analyze_total:', totalMs);
        console.timeEnd('[HS] analyze_total');
        setCurrentView('notRecognized');
      }

    } catch (e) {
      console.error('[HS] analyze_error', e);
      console.timeEnd('[HS] analyze_total');
      // Fall back to generic path
      return runGenericImagePath();
    } finally {
      setIsScanning(false);
    }
  };

  const runGenericImagePath = async (frame?: HTMLCanvasElement) => {
    try {
      // Create blob from canvas for CSP safety
      const canvas = frame || canvasRef.current!;
      const video = videoRef.current!;
      
      if (!frame) {
        const ctx = canvas.getContext('2d')!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
      }
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob from canvas'));
        }, 'image/jpeg', 0.9);
      });
      
      // Normalize for image analysis
      const fileBlob = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const normalized = await normalizeHealthScanImage(fileBlob, {
        maxWidth: Math.max(video.videoWidth, 1920),
        maxHeight: Math.max(video.videoHeight, 1080),
        quality: 0.9,
        format: 'JPEG',
        stripExif: true
      });

      if (isDebugEnabled) {
        finalizeScanReport({
          success: false,
          willScore: false,
          willFallback: true,
          totalMs: Date.now() - Date.now()
        });
      }
      
      onCapture(normalized.dataUrl);
    } catch (error) {
      console.error("❌ Generic image path failed:", error);
      // Final fallback to raw image
      const canvas = canvasRef.current!;
      const rawImageData = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(rawImageData);
    }
  };

  // Alias for backward compatibility
  const captureImage = analyzeNow;

  const handleManualEntry = () => {
    setCurrentView('manual');
  };

  const handleSearchDatabase = async () => {
    if (barcodeInput.trim()) {
      console.log('🔍 Searching database for:', barcodeInput);
      
      // If we have the onManualSearch prop, use it (preferred)
      if (onManualSearch) {
        onManualSearch(barcodeInput.trim(), 'text');
        return;
      }
      
      // Fallback: try to call the health-check-processor directly
      try {
        const { data, error } = await supabase.functions.invoke('health-check-processor', {
          body: {
            inputType: 'text',
            data: barcodeInput.trim(),
            userId: user?.id
          }
        });
        
        console.log('✅ Search result:', data);
        
        if (error) {
          console.error('❌ Search error:', error);
          // Generate suggestions on error
          await generateSmartSuggestions(barcodeInput);
          setShowSuggestions(true);
          return;
        }
        
        // If successful, switch to fallback to show results
        if (data) {
          onManualEntry();
        }
      } catch (error) {
        console.error('❌ Error calling health-check-processor:', error);
        // Fallback to generating suggestions
        await generateSmartSuggestions(barcodeInput);
        setShowSuggestions(true);
      }
    }
  };

  const generateSmartSuggestions = async (userInput: string = '') => {
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-smart-suggestions', {
        body: { 
          userInput: userInput.trim(),
          userId: user?.id 
        }
      });

      if (error) throw error;
      
      if (data && data.suggestions) {
        setSmartSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      // Fallback to default suggestions
      setSmartSuggestions([
        "Coca Cola 12oz Can",
        "Lay's Classic Potato Chips", 
        "Organic Bananas",
        "Vitamin D3 1000 IU",
        "Greek Yogurt - Plain"
      ]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Use the manual search if available, otherwise fall back to manual entry
    if (onManualSearch) {
      onManualSearch(suggestion, 'text');
    } else {
      setBarcodeInput(suggestion);
      onManualEntry(); // This will trigger the health check
    }
  };

  // Load suggestions when view changes to notRecognized (scan failed)
  useEffect(() => {
    if (currentView === 'notRecognized') {
      generateSmartSuggestions();
      setShowSuggestions(true);
    }
  }, [currentView]);

  // Scanner View
  if (currentView === 'scanner') {
    return (
      <div className="scanner-root" style={{
        height: '100dvh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        overflow: 'hidden',
        background: 'black'
      }}>
        {/* Header */}
        <div className="scanner-header" style={{ gridRow: 1, position: 'relative', zIndex: 10 }}>
          <div className="absolute top-8 left-4 right-4 text-center">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 border border-green-400/30">
              <h2 className="text-white text-lg font-bold mb-2">
                🔬 Health Inspector Scanner
              </h2>
              <p className="text-green-300 text-sm animate-pulse">
                Scan a food barcode or aim your camera at a meal to inspect its health profile!
              </p>
            </div>
          </div>
        </div>

        {/* Video Container */}
        <div className="scanner-video-wrap" style={{
          gridRow: 2,
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scanning Overlay with constrained frame */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="scan-frame" style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              maxHeight: 'calc(100% - 180px - env(safe-area-inset-bottom))',
              maxWidth: 'calc(100% - 40px)'
            }}>
              <div className={`w-64 h-64 border-4 border-green-400 rounded-3xl transition-all duration-500 ${
                isScanning ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'shadow-[0_0_30px_rgba(34,197,94,0.4)]'
              }`}>
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`transition-all duration-300 ${isScanning ? 'animate-pulse' : 'animate-bounce'}`}>
                    <Target className={`w-16 h-16 transition-colors ${
                      isScanning ? 'text-red-400' : 'text-green-400'
                    }`} />
                  </div>
                </div>
                
                {isScanning && (
                  <div className="absolute inset-0 overflow-hidden rounded-3xl">
                    <div className="w-full h-1 bg-red-500 animate-[slide_0.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid Overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="w-full h-full" style={{
              backgroundImage: `
                linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px'
            }}></div>
          </div>

          {/* Debug Overlay - Only visible when NEXT_PUBLIC_SCAN_DEBUG==='1' */}
          {process.env.NEXT_PUBLIC_SCAN_DEBUG === '1' && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const success = await copyDebugToClipboard();
                  if (success) {
                    console.log('[HS_DEBUG] Scan report copied to clipboard');
                  }
                }}
                className="bg-black/80 border-yellow-400 text-yellow-300 text-xs px-2 py-1"
              >
                Copy Debug
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  console.log('[HS_DEBUG] Running test harness...');
                  await runBarcodeTests();
                }}
                className="bg-black/80 border-blue-400 text-blue-300 text-xs px-2 py-1"
              >
                Test Harness
              </Button>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="scanner-footer" style={{
          gridRow: 3,
          position: 'sticky',
          bottom: 0,
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          paddingTop: '12px',
          paddingLeft: '16px',
          paddingRight: '16px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="flex flex-col space-y-4">
            {/* Cancel Button */}
            {onCancel && (
              <div className="flex justify-center">
                <Button
                  onClick={onCancel}
                  className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border-2 border-red-500 transition-all duration-300"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </Button>
              </div>
            )}

            {/* Manual Entry Button */}
            <Button
              onClick={handleManualEntry}
              variant="outline"
              className="bg-blue-600/20 border-blue-400 text-blue-300 hover:bg-blue-600/30 hover:text-white transition-all duration-300"
            >
              <Keyboard className="w-5 h-5 mr-2" />
              🔢 Enter Barcode Manually
            </Button>

            {/* Main Analyze Button */}
            <Button
              onClick={captureImage}
              disabled={isScanning}
              className="relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 
                       text-white font-bold py-4 text-lg border-2 border-green-400 
                       shadow-[0_0_20px_rgba(61,219,133,0.4)] hover:shadow-[0_0_30px_rgba(61,219,133,0.6)]
                       transition-all duration-300 disabled:opacity-50"
              style={{ backgroundColor: isScanning ? '#22c55e' : '#3ddb85' }}
            >
              <div className="flex items-center justify-center">
                <Zap className={`w-6 h-6 mr-3 ${isScanning ? 'animate-spin' : 'animate-pulse'}`} />
                {isScanning ? '🔍 SCANNING...' : '🚨 ANALYZE NOW'}
              </div>
              {!isScanning && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                             animate-[shimmer_2s_ease-in-out_infinite] rounded-lg"></div>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Manual Entry View
  if (currentView === 'manual') {
    return (
      <div className="scanner-root" style={{
        height: '100dvh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        overflow: 'hidden',
        background: 'hsl(var(--background))'
      }}>
        <div className="p-6 border-b bg-card">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('scanner')}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold text-foreground">Manual Entry</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Barcode Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Enter Barcode or Product Name
            </label>
            <Input
              ref={barcodeInputRef}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or type product name..."
              className="text-lg py-3 bg-muted/50 border-2 focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && barcodeInput.trim()) {
                  handleSearchDatabase();
                }
              }}
            />
          </div>

          {/* Search Button */}
          <Button 
            onClick={handleSearchDatabase}
            className="w-full py-3 text-lg font-semibold bg-primary hover:bg-primary/90"
            disabled={!barcodeInput.trim()}
          >
            <Search className="w-5 h-5 mr-2" />
            Search Database
          </Button>

          {/* Voice Input - Temporarily disabled */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Voice input temporarily unavailable
            </label>
            
            <Button
              variant="outline"
              disabled
              className="w-full py-3 text-lg font-semibold opacity-50"
            >
              <Mic className="w-5 h-5 mr-2" />
              Voice Input (Coming Soon)
            </Button>
          </div>

          {/* Smart Suggestions */}
          {(showSuggestions || smartSuggestions.length > 0) && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground flex items-center">
                <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                Smart Suggestions
              </label>
              
              {isLoadingSuggestions ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Generating suggestions...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {smartSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left p-3 h-auto bg-muted/50 hover:bg-muted border-muted-foreground/20"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                        <span className="text-sm">{suggestion}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not Recognized View
  return (
    <div className="scanner-root" style={{
      height: 'calc(var(--vh, 1vh) * 100)',
      minHeight: '100dvh',
      display: 'grid',
      gridTemplateRows: 'auto 1fr auto',
      overflow: 'hidden',
      background: 'hsl(var(--background))'
    }}>
      <div className="p-6 border-b bg-card">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentView('scanner')}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">Image Not Recognized</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">🤔</div>
          <h3 className="text-lg font-semibold text-foreground">
            We couldn't identify this product
          </h3>
          <p className="text-muted-foreground">
            Try one of these options to help us find the right information:
          </p>
        </div>

        {/* Manual Input Option */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            Type the product name or barcode
          </label>
          <Input
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="E.g., Coca-Cola Classic or 049000028904"
            className="text-lg py-3 bg-muted/50 border-2 focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && barcodeInput.trim()) {
                handleSearchDatabase();
              }
            }}
          />
        </div>

        <Button 
          onClick={handleSearchDatabase}
          className="w-full py-3 text-lg font-semibold bg-primary hover:bg-primary/90"
          disabled={!barcodeInput.trim()}
        >
          <Search className="w-5 h-5 mr-2" />
          Search Database
        </Button>

        {/* Smart Suggestions */}
        {(showSuggestions || smartSuggestions.length > 0) && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center">
              <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
              Popular Products
            </label>
            
            {isLoadingSuggestions ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading suggestions...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {smartSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start text-left p-3 h-auto bg-muted/50 hover:bg-muted border-muted-foreground/20"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 pt-4">
          <Button
            onClick={() => setCurrentView('scanner')}
            variant="outline"
            className="w-full py-3 text-lg font-semibold border-2"
          >
            <Camera className="w-5 h-5 mr-2" />
            Try Scanning Again
          </Button>
          
          <Button
            onClick={async () => {
              await generateSmartSuggestions();
              setShowSuggestions(true);
            }}
            variant="secondary"
            className="w-full py-3 text-lg font-semibold"
            disabled={isLoadingSuggestions}
          >
            <Lightbulb className="w-5 h-5 mr-2" />
            {isLoadingSuggestions ? 'Loading...' : 'Show Popular Items'}
          </Button>
        </div>
      </div>
    </div>
  );
};