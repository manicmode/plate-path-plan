import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, Target, Zap, X, Search, Mic, Lightbulb, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { VoiceRecordingButton } from '../ui/VoiceRecordingButton';
import { normalizeHealthScanImage } from '@/utils/imageNormalization';
import { useViewportUnitsFix } from '@/hooks/useViewportUnitsFix';

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
  
  // iOS viewport fix
  useViewportUnitsFix();

  // Prevent body scroll while scanner is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { 
      document.body.style.overflow = ""; 
    };
  }, []);

  // Debug log on mount
  useEffect(() => {
    console.log("scanner_mount", {
      innerHeight: window.innerHeight,
      vv: window.visualViewport?.height,
      support_dvh: CSS.supports("height","100dvh"),
    });
  }, []);

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
      // ✅ 1. Ensure video element is created and mounted
      console.log("[VIDEO INIT] videoRef =", videoRef.current);
      if (!videoRef.current) {
        console.error("[VIDEO] videoRef is null — video element not mounted");
        return;
      }

      // ✅ 3. Confirm HTTPS is enforced on mobile
      if (location.protocol !== 'https:') {
        console.warn("[SECURITY] Camera requires HTTPS — current protocol:", location.protocol);
      }

      // ✅ 4. Confirm camera permissions
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'camera' as PermissionName }).then((res) => {
          console.log("[PERMISSION] Camera permission state:", res.state);
        }).catch((err) => {
          console.log("[PERMISSION] Could not query camera permission:", err);
        });
      }

      // ✅ 2. Add logging inside getUserMedia() block
      console.log("[CAMERA] Requesting camera stream...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // ✅ 2. Stream received logging
      console.log("[CAMERA] Stream received:", mediaStream);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Video element ready for streaming
        
        console.log("[CAMERA] srcObject set, playing video");
      } else {
        console.error("[CAMERA] videoRef.current is null");
      }
    } catch (error) {
      // ✅ 2. Enhanced error logging
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

  const captureImage = async () => {
    console.log("📸 HealthScannerInterface.captureImage called!");
    
    if (!videoRef.current || !canvasRef.current) {
      console.error("❌ Missing video or canvas ref!", {
        video: !!videoRef.current,
        canvas: !!canvasRef.current
      });
      return;
    }

    console.log("🎵 Playing camera sound...");
    playCameraClickSound();
    setIsScanning(true);
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error("❌ Cannot get canvas context!");
      return;
    }

    console.log("🖼️ Drawing video to canvas...", {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const rawImageData = canvas.toDataURL('image/jpeg', 0.8);
    console.log("📸 Raw image captured:", {
      dataLength: rawImageData.length,
      dataPrefix: rawImageData.substring(0, 50)
    });

    // Normalize the image (compress, strip EXIF, ensure proper format)
    try {
      console.log("🔄 Normalizing image...");
      const normalized = await normalizeHealthScanImage(rawImageData, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.85,
        format: 'JPEG',
        stripExif: true
      });

      console.log("✅ Image normalized successfully!", {
        originalSize: normalized.originalSize,
        compressedSize: normalized.compressedSize,
        dimensions: `${normalized.width}x${normalized.height}`,
        compressionRatio: `${(normalized.compressionRatio * 100).toFixed(1)}%`,
        finalDataLength: normalized.dataUrl.length
      });

      const imageData = normalized.dataUrl;
    
      
      // Try to detect barcodes in the image first
      try {
        console.log("🔍 Checking for barcodes in image...");
        const { data: barcodeData, error } = await supabase.functions.invoke('barcode-image-detector', {
          body: { imageBase64: imageData.split(',')[1] }
        });
        
        if (error) {
          console.error("❌ Barcode detection error:", error);
        } else {
          console.log("✅ Barcode detection result:", barcodeData);
          
          // If barcode was found, proceed with it
          if (barcodeData.barcode) {
            console.log("📊 Barcode found:", barcodeData.barcode);
            
            // If we have valid product data from OpenFoodFacts API
            if (barcodeData.productData) {
              console.log("🛒 OpenFoodFacts product found:", barcodeData.productData.product_name);
            }
            
            // Send the full image but include the barcode info for processing
            onCapture(imageData + `&barcode=${barcodeData.barcode}`);
            return;
          } else {
            console.log("⚠️ No barcode found in image, proceeding with image analysis");
          }
        }
      } catch (barcodeError) {
        console.error("❌ Error during barcode detection:", barcodeError);
      }
      
      // No barcode found, proceed with standard image capture
      console.log("⏰ Proceeding with standard image analysis...");
      onCapture(imageData);
    } catch (normalizationError) {
      console.error("❌ Image normalization failed:", normalizationError);
      // Fallback to raw image if normalization fails
      console.log("🔄 Using raw image as fallback...");
      onCapture(rawImageData);
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
      <div className="scanner-root scanner-safe fixed inset-0 z-[100] bg-black grid"
           style={{ gridTemplateRows: "auto 1fr auto" }}>
        <header className="relative px-4 pb-2">
          {onCancel && (
            <button 
              onClick={onCancel}
              className="absolute left-4 top-0 translate-y-[-4px] bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-medium transition-colors"
            >
              <X className="w-4 h-4 inline mr-1" />
              Cancel
            </button>
          )}
          <h2 className="text-center text-white font-semibold text-lg">
            🧪 Health Inspector Scanner
          </h2>
          <p className="text-center text-white/70 text-sm mt-1">
            Scan a barcode or aim at a meal to inspect its health profile.
          </p>
        </header>

        <main className="relative overflow-hidden">
          {/* Camera preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Center overlay */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="w-[78%] max-w-[340px] aspect-[1.4/1] rounded-[22px] border-2 border-emerald-400 shadow-[0_0_36px_rgba(16,185,129,0.45)]">
              {/* Corner brackets */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
              
              {/* Center target */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`transition-all duration-300 ${isScanning ? 'animate-pulse' : 'animate-bounce'}`}>
                  <Target className={`w-16 h-16 transition-colors ${
                    isScanning ? 'text-red-400' : 'text-emerald-400'
                  }`} />
                </div>
              </div>
              
              {/* Scanning animation */}
              {isScanning && (
                <div className="absolute inset-0 overflow-hidden rounded-[22px]">
                  <div className="w-full h-1 bg-red-500 animate-[slide_0.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                </div>
              )}
            </div>
          </div>

          {/* Grid overlay */}
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

        <footer className="px-4 pt-3 space-y-3">
          {/* Manual Entry Button */}
          <Button
            onClick={handleManualEntry}
            variant="outline"
            className="w-full bg-blue-600/20 border-blue-400 text-blue-300 hover:bg-blue-600/30 hover:text-white transition-all duration-300"
          >
            <Keyboard className="w-5 h-5 mr-2" />
            🔢 Enter Barcode Manually
          </Button>

          {/* Main Analyze Button */}
          <Button
            onClick={captureImage}
            disabled={isScanning}
            className="w-full relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 
                     text-white font-bold py-4 text-lg border-2 border-green-400 
                     shadow-[0_0_20px_rgba(61,219,133,0.4)] hover:shadow-[0_0_30px_rgba(61,219,133,0.6)]
                     transition-all duration-300 disabled:opacity-50"
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
        </footer>
      </div>
    );
  }

  // Manual Entry View
  if (currentView === 'manual') {
    return (
      <div className="scanner-root scanner-safe fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
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
      <div className="scanner-root scanner-safe fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
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