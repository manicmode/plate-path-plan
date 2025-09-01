/**
 * Meal Capture Page - 5-step wizard implementation
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { mealCaptureEnabled } from '@/lib/featureFlags';
import { takeMealPhoto } from '../transfer';
import { debugLog, logFeatureInit, logStepTransition } from '../debug';
import { MealCaptureWizard } from './MealCaptureWizard';

export type WizardStep = 'capture' | 'classify' | 'detect' | 'review' | 'analyze';

export interface MealCaptureData {
  imageBase64?: string;
  imageUrl?: string;
  imageBlob?: Blob;
  detectedItems?: any[];
  selectedItem?: any;
  analysisResult?: any;
}

export default function MealCapturePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<WizardStep>('capture');
  const [transferData, setTransferData] = useState<MealCaptureData>({});
  
  // Check if feature is enabled
  const isEnabled = mealCaptureEnabled();
  
  React.useEffect(() => {
    logFeatureInit();
    
    if (!isEnabled) {
      debugLog('Feature disabled, redirecting to /scan');
      navigate('/scan', { replace: true });
      return;
    }
    
    // Handle transfer from modal gateway
    const params = new URLSearchParams(location.search);
    const entry = params.get('entry');
    
    if (entry === 'photo') {
      const url = sessionStorage.getItem("mc:photoUrl");
      const ts = sessionStorage.getItem("mc:ts");
      
      console.log('[MEAL][ENTRY]', { entry, hasUrl: !!url, ts });
      
      if (url) {
        setTransferData({ imageUrl: url });
        setCurrentStep('classify');
      } else {
        console.warn('[MEAL][ENTRY] Transfer URL not found, starting at capture');
        setCurrentStep('capture');
      }
      
      // Cleanup on unmount
      return () => {
        if (url) {
          try {
            URL.revokeObjectURL(url);
            sessionStorage.removeItem("mc:photoUrl");
            sessionStorage.removeItem("mc:entry");
            sessionStorage.removeItem("mc:ts");
          } catch (e) {
            console.warn('[MEAL][CLEANUP] Error revoking URL:', e);
          }
        }
      };
    } else {
      // Default to capture step
      setCurrentStep('capture');
    }
    
    debugLog('Page mounted', { step: currentStep });
  }, [isEnabled, navigate, currentStep, location.search]);
  
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
        initialData={transferData}
      />
    </div>
  );
}