import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, Target, Zap, X, Search, Mic, Lightbulb, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface HealthScannerInterfaceProps {
  onCapture: (imageData: string) => void;
  onManualEntry: () => void;
  onCancel?: () => void;
}

export const HealthScannerInterface: React.FC<HealthScannerInterfaceProps> = ({
  onCapture,
  onManualEntry,
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
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

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    playCameraClickSound();
    setIsScanning(true);
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    setTimeout(() => {
      // Simulate image recognition failure for demo
      const recognitionSuccess = Math.random() > 0.3; // 70% failure rate for demo
      if (recognitionSuccess) {
        onCapture(imageData);
      } else {
        setCurrentView('notRecognized');
        setIsScanning(false);
      }
    }, 1500);
  };

  const handleManualEntry = () => {
    setCurrentView('manual');
  };

  const handleSearchDatabase = async () => {
    if (barcodeInput.trim()) {
      // Trigger smart suggestions based on failed search
      await generateSmartSuggestions(barcodeInput);
      setShowSuggestions(true);
      // Simulate database search failure to show suggestions
      setTimeout(() => {
        console.log('Search failed - showing suggestions');
      }, 1000);
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
    // Auto-run health check for the suggestion
    setBarcodeInput(suggestion);
    onManualEntry(); // This will trigger the health check
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
      <div className="relative w-full h-full bg-black flex flex-col">
        <div className="flex-1 relative overflow-hidden">
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
        </div>

        {/* Bottom Controls */}
        <div className="p-6 bg-gradient-to-t from-black/90 to-transparent">
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

            {/* Main Analyze Button - Updated to Green */}
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
            <Button
              variant="outline"
              className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              🎤 Speak Product Name
            </Button>
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