import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { MANUAL_FX } from '@/config/flags';

interface PortionPickerProps {
  selectedFood: any;
  onCancel: () => void;
  onContinue: (food: any, portion: any) => void;
  isLoading?: boolean;
}

export function PortionPicker({ selectedFood, onCancel, onContinue, isLoading }: PortionPickerProps) {
  const [servings, setServings] = useState(1.0);
  const [percent, setPercent] = useState([100]);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  const hasGrams = selectedFood?.grams || selectedFood?.servingSize;
  const baseCalories = selectedFood?.calories || 250;
  const calculatedCalories = Math.round((baseCalories * servings * percent[0]) / 100);

  const handleServingChange = (delta: number) => {
    setServings(prev => Math.max(0.25, Math.min(10, prev + delta)));
  };

  const handleContinue = () => {
    const portion = {
      servings,
      percent: percent[0],
      grams: hasGrams ? Math.round((hasGrams * servings * percent[0]) / 100) : null,
      calories: calculatedCalories
    };
    onContinue(selectedFood, portion);
  };

  return (
    <motion.div
      initial={fxEnabled ? { opacity: 0, y: 12 } : undefined}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: fxEnabled ? 0.14 : 0, ease: [0.22, 1, 0.36, 1] }}
      className="portion-picker-container"
    >
      {/* Section Header */}
      <div className="portion-header">
        <h3 className="portion-title">Choose portion</h3>
        <p className="portion-subtitle">
          {selectedFood.name}
          {selectedFood.brand && (
            <span className="portion-brand"> • {selectedFood.brand}</span>
          )}
        </p>
      </div>

      {/* Controls */}
      <div className="portion-controls">
        {/* Serving Count */}
        <div className="portion-control-group">
          <label className="portion-label">Serving count</label>
          <div className="portion-stepper">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleServingChange(-0.25)}
              className="portion-stepper-btn"
              disabled={servings <= 0.25}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="portion-stepper-value">
              {servings.toFixed(1)} serving{servings !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleServingChange(0.25)}
              className="portion-stepper-btn"
              disabled={servings >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Portion Size Slider */}
        <div className="portion-control-group">
          <label className="portion-label">Portion size</label>
          <div className="portion-slider-container">
            <Slider
              value={percent}
              onValueChange={setPercent}
              min={25}
              max={200}
              step={5}
              className="portion-slider"
            />
            <div className="portion-slider-ticks">
              <span className="portion-tick">25%</span>
              <span className="portion-tick">100%</span>
              <span className="portion-tick">200%</span>
            </div>
          </div>
        </div>

        {/* Weight Display */}
        <div className="portion-control-group">
          {hasGrams ? (
            <div className="portion-weight">
              <span className="portion-weight-value">
                {Math.round((hasGrams * servings * percent[0]) / 100)}g
              </span>
            </div>
          ) : (
            <div className="portion-weight-unavailable">
              Weight information not available for this item
            </div>
          )}
        </div>

        {/* Calorie Preview */}
        <div className="portion-preview">
          Preview: {calculatedCalories} calories
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="portion-footer">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="portion-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isLoading}
          className="portion-continue-btn"
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
}