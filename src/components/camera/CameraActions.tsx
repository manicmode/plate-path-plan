import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Mic, MicOff, Edit3, ScanBarcode, Save, Clock, Droplets, Pill, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CameraActionsProps {
  // Photo capture
  onPhotoCapture: () => void;
  isAnalyzing: boolean;
  processingStep: string;
  
  // Voice recording
  onVoiceToggle: () => void;
  isRecording: boolean;
  isVoiceProcessing: boolean;
  disabled?: boolean;
  
  // Barcode scanning
  onBarcodeCapture: () => void;
  
  // Manual entry
  onManualEntry: () => void;
  
  // Tab switching
  activeTab: 'main' | 'saved' | 'recent';
  onTabChange: (tab: 'main' | 'saved' | 'recent') => void;
}

export const CameraActions: React.FC<CameraActionsProps> = ({
  onPhotoCapture,
  isAnalyzing,
  processingStep,
  onVoiceToggle,
  isRecording,
  isVoiceProcessing,
  disabled = false,
  onBarcodeCapture,
  onManualEntry,
  activeTab,
  onTabChange
}) => {
  const navigate = useNavigate();

  if (activeTab !== 'main') {
    return null; // Tabs handle their own UI
  }

  return (
    <div className="space-y-6">
      {/* Main Action Buttons Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Photo Capture */}
        <Button
          onClick={onPhotoCapture}
          disabled={isAnalyzing}
          className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
              <span className="text-sm font-medium">
                {processingStep || 'Analyzing...'}
              </span>
            </>
          ) : (
            <>
              <Camera className="h-6 w-6" />
              <span className="text-sm font-medium">Take Photo</span>
            </>
          )}
        </Button>

        {/* Voice Recording */}
        <Button
          onClick={onVoiceToggle}
          disabled={disabled}
          className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
          size="lg"
        >
          {isRecording ? (
            <>
              <MicOff className="h-6 w-6 text-red-400" />
              <span className="text-sm font-medium">Stop Recording</span>
            </>
          ) : (isVoiceProcessing || processingStep) ? (
            <>
              <Sparkles className="h-6 w-6" />
              <span className="text-sm font-medium">Processing...</span>
            </>
          ) : (
            <>
              <Mic className="h-6 w-6" />
              <span className="text-sm font-medium">Speak to Log</span>
            </>
          )}
        </Button>

        {/* Scan Barcode */}
        <Button
          onClick={onBarcodeCapture}
          className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
          size="lg"
        >
          <ScanBarcode className="h-6 w-6" />
          <span className="text-sm font-medium">Scan Barcode</span>
        </Button>

        {/* Manual Entry */}
        <Button
          onClick={onManualEntry}
          className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
          size="lg"
        >
          <Edit3 className="h-6 w-6" />
          <span className="text-sm font-medium">Manual Entry</span>
        </Button>

        {/* Saved Logs */}
        <Button
          onClick={() => onTabChange('saved')}
          className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
          size="lg"
        >
          <Save className="h-6 w-6" />
          <span className="text-sm font-medium">Saved Logs</span>
        </Button>

        {/* Recent Logs */}
        <Button
          onClick={() => onTabChange('recent')}
          className="h-24 w-full gradient-primary flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
          size="lg"
        >
          <Clock className="h-6 w-6" />
          <span className="text-sm font-medium">Recent Logs</span>
        </Button>

        {/* Hydration Logs */}
        <Button
          onClick={() => navigate('/hydration')}
          className="h-24 w-full bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
          size="lg"
        >
          <Droplets className="h-6 w-6" />
          <span className="text-sm font-medium">Hydration Logs</span>
        </Button>

        {/* Supplement Logs */}
        <Button
          onClick={() => navigate('/supplements')}
          className="h-24 w-full bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
          size="lg"
        >
          <Pill className="h-6 w-6" />
          <span className="text-sm font-medium">Supplement Logs</span>
        </Button>
      </div>
    </div>
  );
};