/**
 * Review Step - Review selected item and confirm
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit3, CheckCircle } from 'lucide-react';
import type { MealCaptureData, WizardStep } from '../MealCapturePage';
import { debugLog } from '../../debug';

interface ReviewStepProps {
  data: MealCaptureData;
  onUpdateData: (data: Partial<MealCaptureData>) => void;
  onNext: (step: WizardStep) => void;
  onExit: () => void;
}

export function ReviewStep({ data, onUpdateData, onNext, onExit }: ReviewStepProps) {
  const handleConfirm = () => {
    const selectedCount = data.selectedItems?.length || 0;
    console.log('[MEAL][REVIEW]', { selected: selectedCount });
    debugLog('Review confirmed', { selectedItem: data.selectedItem });
    onNext('analyze');
  };
  
  const handleEdit = () => {
    debugLog('Edit requested');
    onNext('detect');
  };
  
  return (
    <div className="mc-review-step min-h-screen flex flex-col bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700">
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
        <h1 className="mc-title text-xl font-semibold">Review Selection</h1>
        <div className="w-8" /> {/* Spacer */}
      </div>
      
      {/* Content */}
      <div className="mc-content flex-1 p-4">
        {/* Selected item preview */}
        <div className="mc-preview-card bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="mc-item-header flex items-start justify-between mb-4">
            <div className="mc-item-info">
              <h2 className="mc-item-name text-white text-2xl font-bold mb-2">
                {data.selectedItem?.name || 'Unknown Food'}
              </h2>
              <p className="mc-item-confidence text-green-300 font-medium">
                {Math.round((data.selectedItem?.confidence || 0) * 100)}% Match Confidence
              </p>
            </div>
            
            <Button
              onClick={handleEdit}
              variant="outline"
              size="sm"
              className="mc-edit-btn bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          
          {/* Mock nutrition preview */}
          <div className="mc-nutrition-preview">
            <h3 className="mc-nutrition-title text-white/90 font-semibold mb-3">
              Estimated Nutrition (per serving)
            </h3>
            
            <div className="mc-nutrition-grid grid grid-cols-2 gap-4">
              <div className="mc-nutrition-item text-center">
                <div className="mc-nutrition-value text-white text-xl font-bold">~250</div>
                <div className="mc-nutrition-label text-white/70 text-sm">Calories</div>
              </div>
              <div className="mc-nutrition-item text-center">
                <div className="mc-nutrition-value text-white text-xl font-bold">~30g</div>
                <div className="mc-nutrition-label text-white/70 text-sm">Protein</div>
              </div>
              <div className="mc-nutrition-item text-center">
                <div className="mc-nutrition-value text-white text-xl font-bold">~5g</div>
                <div className="mc-nutrition-label text-white/70 text-sm">Carbs</div>
              </div>
              <div className="mc-nutrition-item text-center">
                <div className="mc-nutrition-value text-white text-xl font-bold">~8g</div>
                <div className="mc-nutrition-label text-white/70 text-sm">Fat</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Image preview */}
        {data.imageBase64 && (
          <div className="mc-image-preview mb-6">
            <img 
              src={data.imageBase64} 
              alt="Captured meal"
              className="mc-preview-img w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}
        
        {/* Confirmation note */}
        <div className="mc-confirmation-note bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 mb-6">
          <p className="mc-note-text text-blue-200 text-sm">
            We'll analyze this food for detailed nutritional information and health insights.
            You can make adjustments in the next step.
          </p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="mc-actions p-4 space-y-3">
        <Button
          onClick={handleConfirm}
          className="mc-confirm-btn w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Analyze This Food
        </Button>
        
        <Button
          onClick={handleEdit}
          variant="outline"
          className="mc-back-btn w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          Go Back and Change Selection
        </Button>
      </div>
    </div>
  );
}