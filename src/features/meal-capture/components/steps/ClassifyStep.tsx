/**
 * Classify Step - Image classification processing
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { MealCaptureData, WizardStep } from '../MealCapturePage';
import { logAnalysis } from '../../debug';

interface ClassifyStepProps {
  data: MealCaptureData;
  onUpdateData: (data: Partial<MealCaptureData>) => void;
  onNext: (step: WizardStep) => void;
  onExit: () => void;
}

export function ClassifyStep({ data, onUpdateData, onNext, onExit }: ClassifyStepProps) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Analyzing image...');
  
  useEffect(() => {
    simulateClassification();
  }, []);
  
  const simulateClassification = async () => {
    logAnalysis('classify_start');
    
    const steps = [
      { progress: 25, message: 'Analyzing image composition...' },
      { progress: 50, message: 'Identifying food items...' },
      { progress: 75, message: 'Processing nutritional data...' },
      { progress: 100, message: 'Classification complete!' }
    ];
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(step.progress);
      setStatusMessage(step.message);
    }
    
    // Mock classification result
    const mockResult = {
      detectedItems: [
        {
          id: '1',
          name: 'Grilled Chicken Breast',
          confidence: 0.92,
          boundingBox: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 }
        },
        {
          id: '2', 
          name: 'Mixed Vegetables',
          confidence: 0.87,
          boundingBox: { x: 0.5, y: 0.3, width: 0.3, height: 0.4 }
        }
      ]
    };
    
    onUpdateData(mockResult);
    logAnalysis('classify_complete', mockResult);
    
    setTimeout(() => {
      setIsProcessing(false);
      onNext('detect');
    }, 500);
  };
  
  return (
    <div className="mc-classify-step min-h-screen flex flex-col bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700">
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
        <h1 className="mc-title text-xl font-semibold">Classifying</h1>
        <div className="w-8" /> {/* Spacer */}
      </div>
      
      {/* Content */}
      <div className="mc-content flex-1 flex flex-col items-center justify-center p-8 text-white">
        {/* Preview image */}
        {data.imageBase64 && (
          <div className="mc-image-preview mb-8">
            <img 
              src={data.imageBase64} 
              alt="Captured meal"
              className="mc-preview-img w-48 h-48 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}
        
        {/* Processing indicator */}
        <div className="mc-processing text-center">
          <div className="mc-spinner mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
          
          {/* Progress bar */}
          <div className="mc-progress-container w-64 bg-white/20 rounded-full h-2 mb-4">
            <div 
              className="mc-progress-fill bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Status message */}
          <p className="mc-status text-lg font-medium">{statusMessage}</p>
          <p className="mc-substatus text-sm text-white/70 mt-2">
            Using AI to identify your meal components
          </p>
        </div>
      </div>
    </div>
  );
}