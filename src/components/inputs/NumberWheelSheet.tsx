import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface NumberWheelSheetProps {
  open: boolean;
  defaultValue: number;
  onChange: (value: number) => void;
  onClose: () => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const NumberWheelSheet: React.FC<NumberWheelSheetProps> = ({
  open,
  defaultValue,
  onChange,
  onClose,
  min = 10,
  max = 500,
  step = 5,
  unit = 'g'
}) => {
  const [value, setValue] = useState(defaultValue);
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const hasInitialized = useRef(false);
  
  // Generate values array
  const values = React.useMemo(() => {
    const vals = [];
    for (let i = min; i <= max; i += step) {
      vals.push(i);
    }
    return vals;
  }, [min, max, step]);
  
  // Find nearest index for a value
  const findNearestIndex = useCallback((targetValue: number) => {
    let nearestIndex = 0;
    let minDiff = Math.abs(values[0] - targetValue);
    
    for (let i = 1; i < values.length; i++) {
      const diff = Math.abs(values[i] - targetValue);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    }
    
    return nearestIndex;
  }, [values]);
  
  // Haptic feedback functions
  const triggerLightHaptics = useCallback(() => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(10); // Light impact
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);
  
  const triggerMediumHaptics = useCallback(() => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25); // Medium impact
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);
  
  // Initialize scroll position when sheet opens  
  useEffect(() => {
    if (open && wheelRef.current && !hasInitialized.current) {
      const itemHeight = 50;
      const targetIndex = findNearestIndex(defaultValue);
      const scrollTop = targetIndex * itemHeight;
      
      // Set initial value and position before animation
      setValue(values[targetIndex]);
      wheelRef.current.scrollTop = scrollTop;
      hasInitialized.current = true;
      
      setTimeout(() => {
        if (wheelRef.current) {
          wheelRef.current.scrollTop = scrollTop;
        }
      }, 100);
    } else if (!open) {
      hasInitialized.current = false;
      setValue(defaultValue); // Reset to initialValue when closed
    }
  }, [open, defaultValue, values, findNearestIndex]);
  
  // Handle scroll to update value
  const handleScroll = useCallback(() => {
    if (!wheelRef.current) return;
    
    const container = wheelRef.current;
    const itemHeight = 50;
    const scrollTop = container.scrollTop;
    const newIndex = Math.round(scrollTop / itemHeight);
    const newValue = values[newIndex];
    
    if (newValue && newValue !== value) {
      setValue(newValue);
      triggerLightHaptics();
    }
  }, [values, value, triggerLightHaptics]);
  
  // Debounced scroll handler
  useEffect(() => {
    const container = wheelRef.current;
    if (!container) return;
    
    const handleScrollDebounced = () => {
      setIsScrolling(true);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        handleScroll();
      }, 100);
    };
    
    container.addEventListener('scroll', handleScrollDebounced, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScrollDebounced);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);
  
  // Handle quick adjustments
  const handleQuickAdjust = (delta: number) => {
    const newValue = Math.max(min, Math.min(max, value + delta));
    if (newValue !== value) {
      setValue(newValue);
      triggerLightHaptics();
      
      // Update scroll position
      if (wheelRef.current) {
        const targetIndex = findNearestIndex(newValue);
        const itemHeight = 50;
        wheelRef.current.scrollTop = targetIndex * itemHeight;
      }
    }
  };
  
  const handleConfirm = () => {
    triggerMediumHaptics();
    onChange(value);
    onClose();
  };
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleQuickAdjust(-step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleQuickAdjust(step);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  }, [open, onClose, step, handleQuickAdjust]);
  
  // Keyboard support
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[105] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 bottom-0 z-[106] w-full max-w-md -translate-x-1/2 rounded-t-2xl bg-background p-0 shadow-xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-labelledby="wheel-title"
          aria-label="Select amount (grams)"
        >
          <div className="p-6">
            <Dialog.Title id="wheel-title" className="sr-only">
              Select Amount
            </Dialog.Title>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Select Amount</h3>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Current value display */}
            <div className="text-center mb-6">
              <div className="text-3xl font-bold tabular-nums" aria-live="polite">
                {value}<span className="text-xl text-muted-foreground ml-1">{unit}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {value} grams selected
              </div>
            </div>
            
            {/* Quick adjustment buttons */}
            <div className="flex justify-center gap-2 mb-4">
              {[-25, -10, +10, +25].map((delta) => (
                <button
                  key={delta}
                  onClick={() => handleQuickAdjust(delta)}
                  className="px-3 py-1 text-sm bg-muted rounded-md text-muted-foreground hover:bg-muted-foreground hover:text-background transition-colors"
                  type="button"
                >
                  {delta > 0 ? '+' : ''}{delta}
                </button>
              ))}
            </div>
            
            {/* Wheel container */}
            <div className="relative mb-6">
              {/* Highlight band */}
              <div 
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-primary/10 border-2 border-primary/20 rounded-lg pointer-events-none z-10"
              />
              
              {/* Scrollable wheel */}
              <div
                ref={wheelRef}
                className="h-48 overflow-y-auto scrollbar-hide"
                style={{
                  scrollSnapType: 'y mandatory',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {/* Top spacer */}
                <div className="h-24" />
                
                {/* Values */}
                {values.map((val, index) => {
                  const isSelected = val === value;
                  return (
                    <div
                      key={val}
                      className={`h-12 flex items-center justify-center text-xl tabular-nums transition-all duration-200 ${
                        isSelected 
                          ? 'font-bold text-foreground' 
                          : 'text-muted-foreground font-normal'
                      }`}
                      style={{
                        scrollSnapAlign: 'center',
                        opacity: isScrolling ? 0.7 : 1
                      }}
                    >
                      {val}
                    </div>
                  );
                })}
                
                {/* Bottom spacer */}
                <div className="h-24" />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Confirm
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};