import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, Target, Zap, X, Search, Mic, Lightbulb, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { VoiceRecordingButton } from '../ui/VoiceRecordingButton';
import { normalizeHealthScanImage } from '@/utils/imageNormalization';
import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';
import { BARCODE_V2 } from '@/lib/featureFlags';

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
  const { user } = useAuth();

  useEffect(() => {
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
      console.log("[VIDEO INIT] videoRef =", videoRef.current);
      if (!videoRef.current) {
        console.error("[VIDEO] videoRef is null — video element not mounted");
        return;
      }

      // High-res back camera request
      console.log("[CAMERA] Requesting high-res back camera...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false
      });

      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log("[CAMERA] Stream received:", {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        facingMode: settings.facingMode
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log("[CAMERA] srcObject set, playing video");
      }
    } catch (error) {
      console.error("[CAMERA FAIL] getUserMedia error:", error);  
      // Fallback to basic camera
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackError) {
        console.error('Camera access completely failed:', fallbackError);
      }
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

  // Helper function to crop center ROI for barcode detection
  const cropCenterROI = (srcCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const w = srcCanvas.width, h = srcCanvas.height;
    const roiW = Math.round(w * 0.7);
    const roiH = Math.round(h * 0.4);
    const x = Math.round((w - roiW) / 2);
    const y = Math.round((h - roiH) / 2);

    const out = document.createElement('canvas');
    out.width = roiW; 
    out.height = roiH;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(srcCanvas, x, y, roiW, roiH, 0, 0, roiW, roiH);
    return out;
  };

  // Helper to convert canvas to base64 without CSP violation
  const canvasToBase64 = async (canvas: HTMLCanvasElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
      }, 'image/jpeg', 0.85);
    });
  };

  // Capture high-resolution still image
  const captureStill = async (): Promise<{ canvas: HTMLCanvasElement; captureType: 'ImageCapture' | 'VideoFrame' }> => {
    if (!videoRef.current) throw new Error('Video not ready');
    
    const video = videoRef.current;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    console.log(`📹 Video dimensions: ${videoWidth}×${videoHeight}`);
    
    // Try ImageCapture API for highest quality
    if (stream && 'ImageCapture' in window) {
      try {
        const track = stream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(track);
        
        // Get highest quality photo
        const blob = await imageCapture.takePhoto();
        const img = new Image();
        const canvas = document.createElement('canvas');
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            resolve(void 0);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });
        
        console.log(`📸 ImageCapture: ${canvas.width}×${canvas.height}`);
        return { canvas, captureType: 'ImageCapture' };
      } catch (error) {
        console.warn('ImageCapture failed, falling back to video frame:', error);
      }
    }
    
    // Fallback: capture from video element at full resolution
    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    
    console.log(`📸 VideoFrame: ${canvas.width}×${canvas.height}`);
    return { canvas, captureType: 'VideoFrame' };
  };

  const captureImage = async () => {
    console.log("📸 HealthScannerInterface.captureImage called!");
    
    if (!videoRef.current || !canvasRef.current) {
      console.error("❌ Missing video or canvas ref!", {
        video: !!videoRef.current,
        canvas: !!canvasRef.current
      });
      return;
    }

    const t0 = Date.now();
    playCameraClickSound();
    setIsScanning(true);
    
    try {
      // Capture high-res still
      const { canvas, captureType } = await captureStill();
      const captureTime = Date.now() - t0;
      
      console.log("📊 Video capture:", { 
        width: canvas.width, 
        height: canvas.height,
        captureType,
        captureTime 
      });
      
      let detectedBarcode: string | null = null;
      let barcodeTime = 0;
      let barcodeResult: any = null;
      
      // Multi-pass barcode scanning if BARCODE_V2 enabled
      if (BARCODE_V2) {
        const t1 = Date.now();
        const scanner = new MultiPassBarcodeScanner();
        barcodeResult = await scanner.scan(canvas);
        barcodeTime = Date.now() - t1;
        
        if (barcodeResult) {
          detectedBarcode = barcodeResult.text;
          console.log("🔍 barcodeScan:", {
            attempts: barcodeResult.scale ? 'multi-scale' : 'multi-pass',
            hit: true,
            pass: barcodeResult.passName,
            rotation: barcodeResult.rotation,
            scale: barcodeResult.scale,
            format: barcodeResult.format,
            checkDigit: barcodeResult.checkDigitValid,
            value: detectedBarcode
          });
        } else {
          console.log("🔍 barcodeScan:", {
            attempts: 'multi-pass',
            hit: false
          });
        }
      }
      
      // Convert to base64 using CSP-safe method
      const fullBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.85);
      });

      const fullBase64 = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(fullBlob);
      });

      const totalTime = Date.now() - t0;
      
      // Timing logs
      console.log("⏱️ Timing:", {
        t_capture_ms: captureTime,
        t_barcode_ms: barcodeTime,
        t_total_ms: totalTime
      });
      
      // Invoke function logs  
      console.log("📡 Invoking function:", {
        detectedBarcode,
        hasImage: true
      });
      
      // If barcode detected with valid check digit, short-circuit to OFF lookup
      if (detectedBarcode && (!barcodeResult.checkDigitValid || barcodeResult.checkDigitValid)) {
        console.log("🎯 Barcode path - short-circuiting to OFF lookup");
        
        // Call health processor with barcode
        const body = {
          detectedBarcode,
          imageBase64: fullBase64.split(',')[1], // Remove data URL prefix
          mode: 'scan'
        };
        
        const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
          body
        });
        
        if (!error && data && !data.fallback) {
          console.log("✅ Barcode path success:", data);
          onCapture(fullBase64 + `&barcode=${detectedBarcode}`);
          return;
        } else {
          console.log("⚠️ Barcode lookup failed or returned fallback, proceeding with image analysis");
        }
      }
      
      // No barcode or barcode lookup failed - proceed with image analysis
      onCapture(fullBase64);
      
    } catch (conversionError) {
      console.error("❌ Image processing failed:", conversionError);
      // Fallback to basic canvas capture
      const canvas = canvasRef.current!;
      const video = videoRef.current!;
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const fallbackImageData = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(fallbackImageData);
    } finally {
      setIsScanning(false);
    }
  };

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
            userId: user?.id,
            detectedBarcode: null
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
      <div className="relative flex flex-col min-h-dvh bg-black">
        {/* camera/video area */}
        <main className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
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

          {/* Header Text */}
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
        </main>

        {/* Sticky footer (always visible) */}
        <footer className="sticky bottom-0 z-40 bg-black/70 backdrop-blur-md px-4 pt-3 pb-safe">
          <ScannerActions
            onAnalyze={captureImage}
            onCancel={onCancel}
            onEnterBarcode={handleManualEntry}
            isScanning={isScanning}
          />
        </footer>
      </div>
    );
  }

  // Manual Entry View
  if (currentView === 'manual') {
    return (
      <div className="w-full h-full bg-background flex flex-col overflow-hidden">
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
            />
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearchDatabase}
            disabled={!barcodeInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg"
          >
            <Search className="w-5 h-5 mr-2" />
            Search Database
          </Button>

          {/* Voice Recognition Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Mic className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Voice Recognition</span>
            </div>
            <VoiceRecordingButton 
              onVoiceResult={(text) => {
                console.log('🎤 Voice result received in HealthScanner:', text);
                setBarcodeInput(text);
                handleSearchDatabase();
              }}
            />
          </div>

          {/* Quick Suggestions - Only show after failed search/voice input */}
          {showSuggestions && smartSuggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Quick Suggestions</span>
                {isLoadingSuggestions && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {smartSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="justify-start text-left hover:bg-muted hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    <span className="text-green-600 mr-2">🔍</span>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Image Not Recognized View
  if (currentView === 'notRecognized') {
    return (
      <div className="w-full h-full bg-background flex flex-col overflow-hidden">
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
          {/* Error Message */}
          <div className="text-center space-y-4 py-8">
            <div className="text-6xl">🤔</div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                We couldn't identify any food items or barcodes in your image.
              </h3>
              <p className="text-muted-foreground">
                Try one of the options below to continue your health analysis.
              </p>
            </div>
          </div>

          {/* Manual Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Type Barcode or Food Name
            </label>
            <Input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Enter product barcode or name..."
              className="text-lg py-3 bg-muted/50 border-2 focus:border-primary"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSearchDatabase}
              disabled={!barcodeInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
            >
              <Search className="w-5 h-5 mr-2" />
              Search Database
            </Button>

            <Button
              variant="outline"
              className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <Mic className="w-5 h-5 mr-2" />
              🎤 Use Voice Input
            </Button>
          </div>

          {/* Quick Suggestions - AI-powered and context-aware */}
          {smartSuggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Quick Suggestions</span>
                {isLoadingSuggestions && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {smartSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="justify-start text-left hover:bg-muted hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    <span className="text-green-600 mr-2">🔍</span>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Try Again Button */}
          <Button
            onClick={() => setCurrentView('scanner')}
            variant="outline"
            className="w-full border-green-400 text-green-600 hover:bg-green-50"
          >
            <Camera className="w-5 h-5 mr-2" />
            📸 Try Scanning Again
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

// ScannerActions component with swapped button order
function ScannerActions({
  onAnalyze,
  onEnterBarcode,
  onCancel,
  isScanning = false,
}: {
  onAnalyze: () => void;
  onEnterBarcode: () => void;
  onCancel?: () => void;
  isScanning?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {/* GREEN CTA FIRST (bigger hit area) */}
      <button
        onClick={onAnalyze}
        disabled={isScanning}
        className="h-14 rounded-2xl text-lg font-semibold bg-emerald-600 text-white shadow-lg active:scale-[.99] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Zap className={`w-6 h-6 ${isScanning ? 'animate-spin' : 'animate-pulse'}`} />
        {isScanning ? '🔍 SCANNING...' : '🧪 ANALYZE NOW'}
      </button>

      {/* Middle: Enter Barcode Manually (unchanged) */}
      <button
        onClick={onEnterBarcode}
        className="h-12 rounded-xl bg-zinc-800 text-zinc-100 flex items-center justify-center gap-2"
      >
        <Keyboard className="w-5 h-5" />
        ⌨️ Enter Barcode Manually
      </button>

      {/* Red cancel LAST */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="h-12 rounded-xl bg-red-600/90 text-white flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          ✖️ Cancel
        </button>
      )}
    </div>
  );
}
