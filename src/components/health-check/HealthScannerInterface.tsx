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
import { enhancedBarcodeDecode } from '@/lib/barcode/enhancedDecoder';
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
    // Check if debug is enabled
    const debugEnabled = process.env.NEXT_PUBLIC_SCAN_DEBUG === '1' || 
                        new URLSearchParams(window.location.search).get('scan_debug') === '1' ||
                        localStorage.getItem('SCAN_DEBUG') === '1';
    setIsDebugEnabled(debugEnabled);
    
    if (currentView === 'scanner') {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
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
      console.log("[HS] camera_init");
      if (!videoRef.current) {
        console.error("[VIDEO] videoRef is null — video element not mounted");
        return;
      }

      if (location.protocol !== 'https:') {
        console.warn("[SECURITY] Camera requires HTTPS — current protocol:", location.protocol);
      }

      if (navigator.permissions) {
        navigator.permissions.query({ name: 'camera' as PermissionName }).then((res) => {
          console.log("[PERMISSION] Camera permission state:", res.state);
        }).catch((err) => {
          console.log("[PERMISSION] Could not query camera permission:", err);
        });
      }

      console.log("[CAMERA] Requesting camera stream...");
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

      console.log("[CAMERA] Stream received:", mediaStream);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log("[CAMERA] srcObject set, playing video");
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

      if (!videoRef.current || !canvasRef.current) {
        console.error("❌ Missing video or canvas ref!");
        return;
      }

      playCameraClickSound();
      setIsScanning(true);
      
      // 1) CAPTURE FULL-RES FRAME (from video; do NOT compress yet)
      const video = videoRef.current;
      const w = video.videoWidth;
      const h = video.videoHeight;
      const frame = document.createElement('canvas');
      frame.width = w; 
      frame.height = h;
      const fx = frame.getContext('2d')!;
      fx.imageSmoothingEnabled = false;
      fx.drawImage(video, 0, 0, w, h);

      // 2) CROP ROI FROM VIDEO PIXELS (center ~70% x 40%)
      const roi = document.createElement('canvas');
      const roiW = Math.round(w * 0.70);
      const roiH = Math.round(h * 0.40);
      const roiX = Math.round((w - roiW) / 2);
      const roiY = Math.round((h - roiH) / 2);
      roi.width = roiW; 
      roi.height = roiH;
      const rx = roi.getContext('2d')!;
      rx.imageSmoothingEnabled = false;
      rx.drawImage(frame, roiX, roiY, roiW, roiH, 0, 0, roiW, roiH);

      // 3) BARCODE PASS (budget ~1500ms) — BEFORE ANY NORMALIZATION
      console.time('[HS] barcode_ms');
      const dec = await enhancedBarcodeDecode({ sourceCanvas: roi, timeoutMs: 1600 });
      console.timeEnd('[HS] barcode_ms');
      console.log('[HS] barcode_result', {
        success: dec?.success ?? false,
        code: dec?.normalized?.upca ?? dec?.normalized?.ean13 ?? dec?.code ?? null,
        format: dec?.format ?? null,
        checksumOk: dec?.checksumOk ?? null,
        attempts: dec?.attempts?.length ?? 0
      });

      const code =
        dec?.normalized?.upca    // prefer UPC-A 12-digit
        ?? dec?.normalized?.ean13
        ?? dec?.code
        ?? null;

      // TEMP hotfix: if code is 12/13 digits numeric, try OFF even if checksumOk === false
      const looksLikeUPCOrEAN = !!code && /^[0-9]{12,13}$/.test(code);

      if (looksLikeUPCOrEAN) {
        console.log('[HS] off_fetch_start', { code });
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body: { mode: 'barcode', barcode: code, source: 'health' }
        });
        console.log('[HS] off_result', { status: error ? 'error' : 'ok', hit: !!data?.productName });

        if (!error && data) {
          // Show the normal fun loading -> report (NO GPT on this path)
          if (isDebugEnabled) {
            finalizeScanReport({
              success: true,
              code,
              normalizedAs: dec.normalized?.upca ?? dec.normalized?.ean13,
              checkDigitOk: dec.checksumOk || false,
              willScore: true,
              willFallback: false,
              totalMs: dec.ms,
              offLookup: { status: 'hit', ms: dec.ms }
            });
          }
          
          // Create normalized image data for the rest of the pipeline
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d')!;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          onCapture(imageData + `&barcode=${code}`);
          return;
        }
      }

      // 4) ONLY IF NO BARCODE: now run existing normalization/OCR path
      return runGenericImagePath(frame);

    } catch (e) {
      console.error('[HS] analyze_error', e);
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