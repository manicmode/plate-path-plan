/**
 * Meal Capture Page - 5-step wizard implementation
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { mealCaptureEnabled } from '../flags';
import { debugLog, logFeatureInit, logStepTransition } from '../debug';
import { MealCaptureWizard } from './MealCaptureWizard';

export type WizardStep = 'capture' | 'classify' | 'detect' | 'review' | 'analyze';

export interface MealCaptureData {
  imageBase64?: string;
  imageUrl?: string;
  detectedItems?: any[];
  selectedItem?: any;
  analysisResult?: any;
}

export default function MealCapturePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>('capture');
  
  // Check if feature is enabled
  const isEnabled = mealCaptureEnabled(window.location.search, import.meta.env);
  
  React.useEffect(() => {
    logFeatureInit();
    
    if (!isEnabled) {
      debugLog('Feature disabled, redirecting to /scan');
      navigate('/scan', { replace: true });
      return;
    }
    
    debugLog('Page mounted', { step: currentStep });
  }, [isEnabled, navigate, currentStep]);
  
  const handleStepChange = useCallback((newStep: WizardStep) => {
    logStepTransition(currentStep, newStep);
    setCurrentStep(newStep);
  }, [currentStep]);
  
  const handleExit = useCallback(() => {
    debugLog('User exited meal capture');
    navigate('/scan');
  }, [navigate]);
  
  if (!isEnabled) {
    return null; // Will redirect via useEffect
  }
  
  return (
    <div className="mc-page min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700">
      <MealCaptureWizard
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onExit={handleExit}
      />
    </div>
  );
}