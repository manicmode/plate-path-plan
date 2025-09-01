/**
 * Meal Capture Entry Route - Bulletproof token handling
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MealCaptureWizard } from '../components/MealCaptureWizard';
import type { MealCaptureData, WizardStep } from '../components/MealCapturePage';

export default function MealCaptureEntry() {
  const navigate = useNavigate(); 
  const [searchParams] = useSearchParams();
  const ranRef = useRef(false);
  
  const [wizardData, setWizardData] = React.useState<MealCaptureData>({});
  const [currentStep, setCurrentStep] = React.useState<WizardStep>('capture');

  // Single-run guard (React StrictMode safe)
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const photoToken = searchParams.get('photoToken');
    
    if (!photoToken) {
      console.log("[MEAL][ENTRY][MISSING_TOKEN]");
      toast.error("Photo expired. Please retake.");
      navigate("/scan", { replace: true });
      return;
    }

    const tokenKey = `mc:entry:${photoToken}`;
    const payloadStr = sessionStorage.getItem(tokenKey);
    
    if (!payloadStr) {
      console.log("[MEAL][ENTRY][MISSING_TOKEN]");
      toast.error("Photo expired. Please retake.");
      navigate("/scan", { replace: true });
      return;
    }

    try {
      const payload = JSON.parse(payloadStr);
      
      // Immediately consume the token
      sessionStorage.removeItem(tokenKey);
      
      // Revoke any previous blob URL if we had one
      if (wizardData.imageUrl) {
        URL.revokeObjectURL(wizardData.imageUrl);
      }
      
      // Start the wizard with the image
      setWizardData({ 
        imageUrl: payload.blobUrl,
        imageBlob: null // Will be fetched when needed
      });
      setCurrentStep('classify');
      
      console.log("[MEAL][ENTRY][START]", { 
        token: photoToken, 
        size: payload.size, 
        mime: payload.mime 
      });
      
    } catch (error) {
      console.error("[MEAL][ENTRY][PARSE_ERROR]", error);
      sessionStorage.removeItem(tokenKey);
      toast.error("Photo expired. Please retake.");
      navigate("/scan", { replace: true });
    }
  }, [searchParams, navigate, wizardData.imageUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear inflight lock if any
      sessionStorage.removeItem("mc:handoff:inflight");
      
      // Revoke blob URL if we have one
      if (wizardData.imageUrl) {
        URL.revokeObjectURL(wizardData.imageUrl);
      }
    };
  }, [wizardData.imageUrl]);

  const handleStepChange = (newStep: WizardStep) => {
    setCurrentStep(newStep);
  };

  const handleExit = () => {
    navigate('/scan');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700">
      <MealCaptureWizard
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onExit={handleExit}
        initialData={wizardData}
      />
    </div>
  );
}