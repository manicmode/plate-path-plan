/**
 * Capture Step - Photo capture interface
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, ArrowLeft, RotateCw } from 'lucide-react';
import type { MealCaptureData, WizardStep } from '../MealCapturePage';
import { logCapture } from '../../debug';

interface CaptureStepProps {
  data: MealCaptureData;
  onUpdateData: (data: Partial<MealCaptureData>) => void;
  onNext: (step: WizardStep) => void;
  onExit: () => void;
}

export function CaptureStep({ data, onUpdateData, onNext, onExit }: CaptureStepProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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
      console.error('Failed to start camera:', error);
    }
  };
  
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };
  
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    logCapture('photo');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      onUpdateData({ imageBase64 });
      stopCamera();
      onNext('classify');
    }
    
    setIsCapturing(false);
  };
  
  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);
  
  return (
    <div className="mc-capture-step min-h-screen flex flex-col">
      {/* Header */}
      <div className="mc-header flex items-center justify-between p-4 text-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="mc-exit-btn text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="mc-title text-xl font-semibold">Capture Meal</h1>
        <div className="w-8" /> {/* Spacer */}
      </div>
      
      {/* Camera view */}
      <div className="mc-camera-container flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="mc-video w-full h-full object-cover"
        />
        
        {/* Camera overlay */}
        <div className="mc-overlay absolute inset-0 flex items-center justify-center">
          <div className="mc-frame border-2 border-white/50 rounded-lg w-72 h-72 relative">
            <div className="mc-corner absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="mc-corner absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="mc-corner absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="mc-corner absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="mc-controls p-6 flex items-center justify-center">
        <Button
          onClick={capturePhoto}
          disabled={isCapturing || !stream}
          className="mc-capture-btn w-20 h-20 rounded-full bg-white text-rose-600 hover:bg-white/90 disabled:opacity-50"
        >
          <Camera className="h-8 w-8" />
        </Button>
      </div>
      
      {/* Instructions */}
      <div className="mc-instructions text-center text-white/80 pb-6 px-4">
        <p className="mc-instruction-text">Position your meal within the frame and tap to capture</p>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}