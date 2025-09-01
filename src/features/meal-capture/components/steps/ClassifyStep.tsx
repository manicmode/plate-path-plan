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
  const [classification, setClassification] = useState<'meal' | 'packaged' | 'unknown' | null>(null);
  
  useEffect(() => {
    simulateClassification();
  }, []);
  
  // Show packaged product fallback for non-meal items
  const showPackagedFallback = classification === 'packaged';
  
  const handleBackToScan = () => {
    // Navigate back to scan hub for barcode/manual entry
    window.location.href = '/scan';
  };
  
  const simulateClassification = async () => {
    logAnalysis('classify_start');
    
    console.log('[MEAL][CLASSIFY]', { kind: 'analyzing' });
    
    const steps = [
      { progress: 25, message: 'Analyzing image composition...' },
      { progress: 50, message: 'Identifying food type...' },
      { progress: 75, message: 'Determining classification...' },
      { progress: 100, message: 'Classification complete!' }
    ];
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(step.progress);
      setStatusMessage(step.message);
    }
    
    // Mock classification - randomly determine meal vs packaged for demo
    // In real implementation, this would use actual image analysis
    const rand = Math.random();
    let classificationResult: 'meal' | 'packaged' | 'unknown';
    
    if (rand > 0.7) {
      classificationResult = 'packaged';
    } else if (rand > 0.1) {
      classificationResult = 'meal';
    } else {
      classificationResult = 'unknown';
    }
    
    console.log('[MEAL][CLASSIFY]', { kind: classificationResult });
    setClassification(classificationResult);
    
    if (classificationResult === 'meal') {
      // Mock meal detection result for meals
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
    }
    
    setIsProcessing(false);
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
        {(data.imageBase64 || data.imageUrl) && (
          <div className="mc-image-preview mb-8">
            <img 
              src={data.imageBase64 || data.imageUrl} 
              alt="Captured meal"
              className="mc-preview-img w-48 h-48 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}
        
        {isProcessing ? (
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
        ) : showPackagedFallback ? (
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">📦</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Packaged Product Detected</h2>
            <p className="text-white/80 mb-6">
              We couldn't detect a meal. For packaged items, please use <strong>Scan Barcode</strong> or <strong>Manual Entry</strong> for the most accurate results.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleBackToScan}
                className="mc-btn-primary bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-white/90"
              >
                Use Barcode Scanner
              </button>
              <button
                onClick={handleBackToScan}
                className="mc-btn-secondary bg-white/20 text-white px-8 py-3 rounded-full font-semibold hover:bg-white/30"
              >
                Manual Entry
              </button>
            </div>
          </div>
        ) : classification === 'meal' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Meal Detected</h2>
            <p className="text-white/80 mb-6">
              Great! We can analyze the nutritional content of this meal.
            </p>
            <button
              onClick={() => onNext('detect')}
              className="mc-btn-primary bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-white/90"
            >
              Continue Analysis
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">?</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Unable to Classify</h2>
            <p className="text-white/80 mb-6">We couldn't determine what type of food this is.</p>
            <div className="flex gap-4">
              <button
                onClick={() => onNext('detect')}
                className="mc-btn-primary bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-white/90"
              >
                Try Anyway
              </button>
              <button
                onClick={onExit}
                className="mc-btn-secondary bg-white/20 text-white px-6 py-3 rounded-full font-semibold hover:bg-white/30"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}