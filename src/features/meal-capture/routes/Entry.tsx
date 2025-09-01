/**
 * Meal Capture Entry Route - Bulletproof token handling
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MealCaptureWizard } from '../components/MealCaptureWizard';
import type { MealCaptureData, WizardStep } from '../components/MealCapturePage';
import { takeMealPhoto } from '../photoStore';

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

    // Try query param first, then sessionStorage
    const photoToken = searchParams.get('token') || sessionStorage.getItem('mc:token');
    
    if (!photoToken) {
      console.log("[MEAL][ENTRY][MISSING_TOKEN]");
      toast.error("Photo expired. Please retake.");
      navigate("/scan", { replace: true });
      return;
    }

    // Try to get blob from memory store
    const blob = takeMealPhoto(photoToken);
    
    if (!blob) {
      console.log("[MEAL][ENTRY][MISSING_TOKEN]");
      toast.error("Photo expired. Please retake.");
      navigate("/scan", { replace: true });
      return;
    }

    try {
      // Clear the session storage token
      sessionStorage.removeItem('mc:token');
      
      // Revoke any previous blob URL if we had one
      if (wizardData.imageUrl) {
        URL.revokeObjectURL(wizardData.imageUrl);
      }
      
      // Create object URL for the wizard
      const imageUrl = URL.createObjectURL(blob);
      
      // Start the wizard with the image
      setWizardData({ 
        imageUrl,
        imageBlob: blob
      });
      setCurrentStep('classify');
      
      console.log("[MEAL][ENTRY][START]", { 
        token: photoToken, 
        source: "memory",
        size: blob.size, 
        mime: blob.type 
      });
      
    } catch (error) {
      console.error("[MEAL][ENTRY][PARSE_ERROR]", error);
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