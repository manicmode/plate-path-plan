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
  
  const cleanupMealTokens = useCallback(() => {
    const u = sessionStorage.getItem("mc:photoUrl");
    if (u) URL.revokeObjectURL(u);
    ["mc:photoUrl","mc:entry","mc:ts","mc:n","mc:inflight","mc:used"]
      .forEach(k => sessionStorage.removeItem(k));
  }, []);

  React.useEffect(() => {
    logFeatureInit();
    
    if (!isEnabled) {
      debugLog('Feature disabled, redirecting to /scan');
      navigate('/scan', { replace: true });
      return;
    }
    
    // Handle transfer from modal gateway - verify nonce, then clean up on exit
    const qs = new URLSearchParams(location.search);
    const entry = qs.get("entry");
    const n = qs.get("n");
    const nStore = sessionStorage.getItem("mc:n");
    const url = sessionStorage.getItem("mc:photoUrl");

    if (entry === "photo" && n && n === nStore && url) {
      // Valid handoff — clear only the inflight/rescue bits now
      sessionStorage.removeItem("mc:inflight");
      sessionStorage.removeItem("mc:used");
      
      console.log('[MEAL][ENTRY]', { entry, hasUrl: !!url, nonce: n });
      setTransferData({ imageUrl: url });
      setCurrentStep('classify');
    } else if (entry === "photo") {
      // Invalid/expired handoff — full cleanup and exit
      console.warn('[MEAL][ENTRY] Invalid handoff, redirecting to /scan');
      cleanupMealTokens();
      navigate("/scan", { replace: true });
      return;
    } else {
      // Default to capture step
      setCurrentStep('capture');
    }
    
    debugLog('Page mounted', { step: currentStep });
    
    // Cleanup tokens on unmount
    return cleanupMealTokens;
  }, [isEnabled, navigate, currentStep, location.search, cleanupMealTokens]);
  
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