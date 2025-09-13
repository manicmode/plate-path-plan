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
  const [sliderPos, setSliderPos] = useState([50]); // 0-100 position, 50 = middle
  const [percent, setPercent] = useState(100); // actual portion percentage

  // Map slider position (0-100) to portion percentage (25-200%)
  const mapPosToPercent = (pos: number): number => {
    if (pos <= 50) {
      // 0-50 maps to 25-100%
      return 25 + (pos / 50) * 75;
    } else {
      // 50-100 maps to 100-200%
      return 100 + ((pos - 50) / 50) * 100;
    }
  };

  // Map portion percentage to slider position
  const mapPercentToPos = (pct: number): number => {
    if (pct <= 100) {
      // 25-100% maps to 0-50
      return ((pct - 25) / 75) * 50;
    } else {
      // 100-200% maps to 50-100
      return 50 + ((pct - 100) / 100) * 50;
    }
  };

  // Snap to nearest 5%
  const snap5 = (val: number): number => Math.round(val / 5) * 5;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  const hasGrams = selectedFood?.grams || selectedFood?.servingSize;
  const baseCalories = selectedFood?.calories || 250;
  const calculatedCalories = Math.round((baseCalories * servings * percent) / 100);

  const handleServingChange = (delta: number) => {
    setServings(prev => Math.max(0.25, Math.min(10, prev + delta)));
  };

  const handleSliderChange = (newPos: number[]) => {
    setSliderPos(newPos);
    const newPercent = snap5(mapPosToPercent(newPos[0]));
    setPercent(newPercent);
  };

  const handleContinue = () => {
    const portion = {
      servings,
      percent: percent,
      grams: hasGrams ? Math.round((hasGrams * servings * percent) / 100) : null,
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
          <label className="portion-label">Portion size ({percent}%)</label>
          <div className="portion-slider-container">
            <Slider
              value={sliderPos}
              onValueChange={handleSliderChange}
              min={0}
              max={100}
              step={1}
              className="portion-slider"
              defaultValue={[50]}
            />
            <div className="portion-slider-ticks">
              <span className="portion-tick">25%</span>
              <span className="portion-tick portion-tick-center">100%</span>
              <span className="portion-tick">200%</span>
            </div>
          </div>
        </div>

        {/* Weight Display */}
        <div className="portion-control-group">
          {hasGrams ? (
            <div className="portion-weight">
              <span className="portion-weight-value">
                {Math.round((hasGrams * servings * percent) / 100)}g
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