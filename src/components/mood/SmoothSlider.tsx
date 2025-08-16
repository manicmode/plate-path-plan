import React, { memo, useState, useCallback, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { selectionStart, selectionChanged, selectionEnd } from '@/lib/haptics';

interface SmoothSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  label?: string;
  showValue?: boolean;
}

export const SmoothSlider = memo<SmoothSliderProps>(({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  className,
  label,
  showValue = true
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const lastIndexRef = useRef<number>(-1);

  const handleValueChange = useCallback((values: number[]) => {
    const newValue = values[0];
    setLocalValue(newValue);
    
    if (!isDragging) {
      setIsDragging(true);
      selectionStart();
    }
    
    // Trigger haptic feedback when crossing discrete steps
    const currentIndex = Math.round((newValue - min) / step);
    if (currentIndex !== lastIndexRef.current) {
      selectionChanged();
      lastIndexRef.current = currentIndex;
    }
  }, [isDragging, min, step]);

  const handleValueCommit = useCallback((values: number[]) => {
    const newValue = values[0];
    setLocalValue(newValue);
    onChange(newValue);
    setIsDragging(false);
    
    // End haptic feedback sequence
    selectionEnd();
    lastIndexRef.current = -1;
  }, [onChange]);

  const displayValue = isDragging ? localValue : value;

  return (
    <div className={cn("space-y-3", className)}>
      {showValue && (
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">
            {displayValue}/{max}
          </p>
          {label && (
            <p className="text-sm text-muted-foreground mt-1">
              {label}
            </p>
          )}
        </div>
      )}
      <Slider
        value={[displayValue]}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        min={min}
        max={max}
        step={step}
        className="mood-slider w-full"
      />
    </div>
  );
});

SmoothSlider.displayName = 'SmoothSlider';