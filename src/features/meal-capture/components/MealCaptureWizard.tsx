/**
 * Meal Capture Wizard - 5-step flow container
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import React, { useState } from 'react';
import type { WizardStep, MealCaptureData } from './MealCapturePage';
import { CaptureStep } from './steps/CaptureStep';
import { ClassifyStep } from './steps/ClassifyStep';
import { DetectStep } from './steps/DetectStep';
import { ReviewStep } from './steps/ReviewStep';
import { AnalyzeStep } from './steps/AnalyzeStep';
import { ReportStack } from './ReportStack';
import { debugLog } from '../debug';

interface MealCaptureWizardProps {
  currentStep: WizardStep;
  onStepChange: (step: WizardStep) => void;
  onExit: () => void;
  initialData?: MealCaptureData;
}


export function MealCaptureWizard({ currentStep, onStepChange, onExit, initialData }: MealCaptureWizardProps) {
  const [wizardData, setWizardData] = useState<MealCaptureData>(initialData || {});
  const [showReportStack, setShowReportStack] = useState(false);
  
  // Memory cleanup for object URLs
  React.useEffect(() => {
    return () => {
      if (wizardData.imageUrl && wizardData.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(wizardData.imageUrl);
      }
    };
  }, [wizardData.imageUrl]);
  
  const updateData = (newData: Partial<MealCaptureData>) => {
    debugLog('Updating wizard data', { step: currentStep, newData });
    setWizardData(prev => ({ ...prev, ...newData }));
  };
  
  const handleComplete = () => {
    debugLog('Wizard completed, showing report stack');
    setShowReportStack(true);
  };
  
  const renderCurrentStep = () => {
    const commonProps = {
      data: wizardData,
      onUpdateData: updateData,
      onNext: (nextStep: WizardStep) => onStepChange(nextStep),
      onExit
    };
    
    switch (currentStep) {
      case 'capture':
        return <CaptureStep {...commonProps} />;
      case 'classify':
        return <ClassifyStep {...commonProps} />;
      case 'detect':
        return <DetectStep {...commonProps} />;
      case 'review':
        return <ReviewStep {...commonProps} />;
      case 'analyze':
        return <AnalyzeStep {...commonProps} onComplete={handleComplete} />;
      default:
        return <CaptureStep {...commonProps} />;
    }
  };
  
  return (
    <div className="mc-wizard relative">
      {/* Progress indicator */}
      <div className="mc-progress fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm">
        <div className="mc-progress-bar bg-green-400 h-1 transition-all duration-300"
             style={{ width: `${(['capture', 'classify', 'detect', 'review', 'analyze'].indexOf(currentStep) + 1) * 20}%` }} />
      </div>
      
      {/* Step content */}
      <div className="mc-step-content pt-4">
        {renderCurrentStep()}
      </div>
      
      {/* Report stack modal */}
      {showReportStack && (
        <ReportStack
          data={wizardData}
          onClose={() => {
            setShowReportStack(false);
            onExit();
          }}
        />
      )}
    </div>
  );
}