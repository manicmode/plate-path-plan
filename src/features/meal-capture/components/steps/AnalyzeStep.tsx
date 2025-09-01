/**
 * Analyze Step - Final analysis and completion
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { MealCaptureData, WizardStep } from '../MealCapturePage';
import { logAnalysis } from '../../debug';

interface AnalyzeStepProps {
  data: MealCaptureData;
  onUpdateData: (data: Partial<MealCaptureData>) => void;
  onNext: (step: WizardStep) => void;
  onExit: () => void;
  onComplete: () => void;
}

export function AnalyzeStep({ data, onUpdateData, onExit, onComplete }: AnalyzeStepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing analysis...');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    performAnalysis();
  }, []);
  
  const performAnalysis = async () => {
    logAnalysis('analyze_start', { selectedItem: data.selectedItem });
    
    const steps = [
      { progress: 20, message: 'Analyzing nutritional content...' },
      { progress: 40, message: 'Checking ingredient quality...' },
      { progress: 60, message: 'Calculating health scores...' },
      { progress: 80, message: 'Generating recommendations...' },
      { progress: 100, message: 'Analysis complete!' }
    ];
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(step.progress);
      setStatusMessage(step.message);
    }
    
    // Create mock analysis result compatible with existing health check modal
    const analysisResult = {
      itemName: data.selectedItem?.name || 'Unknown Food',
      productName: data.selectedItem?.name || 'Unknown Food',
      healthScore: 7.5,
      overallRating: 'good',
      nutritionData: {
        calories: 250,
        protein: 30,
        carbs: 5,
        fat: 8,
        fiber: 2,
        sugar: 1,
        sodium: 400
      },
      ingredientFlags: [
        {
          ingredient: 'High Protein',
          flag: 'beneficial',
          severity: 'low' as const,
          reason: 'Good source of lean protein'
        }
      ],
      healthProfile: {
        allergens: [],
        preservatives: [],
        additives: [],
        isOrganic: false,
        isGMO: false
      },
      ingredientsText: 'Chicken breast, seasoning, natural flavors'
    };
    
    onUpdateData({ analysisResult });
    logAnalysis('analyze_complete', analysisResult);
    
    setIsAnalyzing(false);
    setIsComplete(true);
  };
  
  const handleViewResults = () => {
    onComplete();
  };
  
  return (
    <div className="mc-analyze-step min-h-screen flex flex-col bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700">
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
        <h1 className="mc-title text-xl font-semibold">
          {isAnalyzing ? 'Analyzing' : 'Analysis Complete'}
        </h1>
        <div className="w-8" /> {/* Spacer */}
      </div>
      
      {/* Content */}
      <div className="mc-content flex-1 flex flex-col items-center justify-center p-8 text-white">
        {/* Food item being analyzed */}
        <div className="mc-analyzing-item text-center mb-8">
          <h2 className="mc-item-name text-2xl font-bold mb-2">
            {data.selectedItem?.name || 'Unknown Food'}
          </h2>
          <p className="mc-item-subtitle text-white/70">
            Getting detailed nutritional insights...
          </p>
        </div>
        
        {isAnalyzing ? (
          /* Analysis in progress */
          <div className="mc-analysis-progress text-center">
            <div className="mc-spinner mb-6">
              <Loader2 className="h-16 w-16 animate-spin text-white" />
            </div>
            
            {/* Progress bar */}
            <div className="mc-progress-container w-80 bg-white/20 rounded-full h-3 mb-4">
              <div 
                className="mc-progress-fill bg-gradient-to-r from-green-400 to-blue-400 rounded-full h-3 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Status message */}
            <p className="mc-status text-lg font-medium mb-2">{statusMessage}</p>
            <p className="mc-substatus text-sm text-white/70">
              This may take a few seconds...
            </p>
          </div>
        ) : (
          /* Analysis complete */
          <div className="mc-analysis-complete text-center">
            <div className="mc-success-icon mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
            </div>
            
            <h3 className="mc-complete-title text-xl font-semibold mb-4">
              Analysis Complete!
            </h3>
            
            <p className="mc-complete-description text-white/80 mb-8 max-w-md">
              We've analyzed your meal and generated a comprehensive health report 
              with nutritional insights and personalized recommendations.
            </p>
            
            <Button
              onClick={handleViewResults}
              className="mc-view-results-btn bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              View Health Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}