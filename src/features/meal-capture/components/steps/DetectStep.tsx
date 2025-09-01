/**
 * Detect Step - Food item detection and selection
 * Revision tag: 2025-08-31T21:45Z-r1
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { MealCaptureData, WizardStep } from '../MealCapturePage';
import { debugLog } from '../../debug';

interface DetectStepProps {
  data: MealCaptureData;
  onUpdateData: (data: Partial<MealCaptureData>) => void;
  onNext: (step: WizardStep) => void;
  onExit: () => void;
}

export function DetectStep({ data, onUpdateData, onNext, onExit }: DetectStepProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const handleItemSelect = (item: any) => {
    debugLog('Item selected', { item });
    setSelectedItem(item);
    onUpdateData({ selectedItem: item });
  };
  
  const handleContinue = () => {
    if (selectedItem) {
      onNext('review');
    }
  };
  
  return (
    <div className="mc-detect-step min-h-screen flex flex-col bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700">
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
        <h1 className="mc-title text-xl font-semibold">Select Food</h1>
        <div className="w-8" /> {/* Spacer */}
      </div>
      
      {/* Content */}
      <div className="mc-content flex-1 p-4">
        {/* Image with overlays */}
        <div className="mc-image-container relative mb-6">
          {data.imageBase64 && (
            <img 
              src={data.imageBase64} 
              alt="Captured meal"
              className="mc-meal-image w-full h-64 object-cover rounded-lg"
            />
          )}
          
          {/* Detection overlays - mock bounding boxes */}
          <div className="mc-overlays absolute inset-0">
            {data.detectedItems?.map((item, index) => (
              <div
                key={item.id}
                className={`mc-detection-box absolute border-2 rounded cursor-pointer transition-all ${
                  selectedItem?.id === item.id 
                    ? 'border-green-400 bg-green-400/20' 
                    : 'border-white/60 hover:border-white'
                }`}
                style={{
                  left: `${item.boundingBox.x * 100}%`,
                  top: `${item.boundingBox.y * 100}%`,
                  width: `${item.boundingBox.width * 100}%`,
                  height: `${item.boundingBox.height * 100}%`,
                }}
                onClick={() => handleItemSelect(item)}
              >
                {selectedItem?.id === item.id && (
                  <CheckCircle2 className="mc-check-icon absolute -top-2 -right-2 h-6 w-6 text-green-400 bg-white rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Detection list */}
        <div className="mc-detection-list space-y-3">
          <h2 className="mc-list-title text-white text-lg font-semibold mb-4">
            Detected Food Items
          </h2>
          
          {data.detectedItems?.map((item) => (
            <div
              key={item.id}
              className={`mc-detection-item p-4 rounded-lg cursor-pointer transition-all ${
                selectedItem?.id === item.id 
                  ? 'bg-green-500/20 border-2 border-green-400' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              onClick={() => handleItemSelect(item)}
            >
              <div className="mc-item-content flex items-center justify-between">
                <div className="mc-item-info">
                  <h3 className="mc-item-name text-white font-medium">{item.name}</h3>
                  <p className="mc-item-confidence text-white/70 text-sm">
                    Confidence: {Math.round(item.confidence * 100)}%
                  </p>
                </div>
                
                {selectedItem?.id === item.id && (
                  <CheckCircle2 className="mc-selected-icon h-6 w-6 text-green-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Continue button */}
      <div className="mc-actions p-4">
        <Button
          onClick={handleContinue}
          disabled={!selectedItem}
          className="mc-continue-btn w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:opacity-50 text-white"
        >
          Continue with {selectedItem?.name || 'Selected Item'}
        </Button>
      </div>
    </div>
  );
}