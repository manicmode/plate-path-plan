import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

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
  const wheelRef = useRef<HTMLDivElement>(null);
  const [currentValue, setCurrentValue] = useState(defaultValue);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Generate values array
  const values = React.useMemo(() => {
    const vals = [];
    for (let i = min; i <= max; i += step) {
      vals.push(i);
    }
    return vals;
  }, [min, max, step]);
  
  // Haptic feedback when value changes
  const triggerHaptics = useCallback(() => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(10); // Light impact on tick
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  const triggerConfirmHaptics = useCallback(() => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25); // Medium impact on confirm
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);
  
  // Handle scroll snap to update value
  const handleScroll = useCallback(() => {
    if (!wheelRef.current) return;
    
    const container = wheelRef.current;
    const itemHeight = 40;
    const scrollTop = container.scrollTop;
    const newIndex = Math.round(scrollTop / itemHeight);
    const newValue = values[newIndex];
    
    if (newValue && newValue !== currentValue) {
      setCurrentValue(newValue);
      triggerHaptics();
    }
  }, [values, currentValue, triggerHaptics]);
  
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
      }, 150);
    };
    
    container.addEventListener('scroll', handleScrollDebounced);
    return () => {
      container.removeEventListener('scroll', handleScrollDebounced);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);
  
  // Initialize scroll position when opened - snap to nearest estimate
  useEffect(() => {
    if (open && wheelRef.current && values.length > 0) {
      const itemHeight = 40;
      const targetIndex = values.findIndex(v => v >= defaultValue) || 0;
      const scrollTop = Math.max(0, targetIndex * itemHeight);
      wheelRef.current.scrollTop = scrollTop;
      setCurrentValue(values[targetIndex] || defaultValue);
    }
  }, [open, values, defaultValue]);

  const handleConfirm = () => {
    triggerConfirmHaptics();
    onChange(currentValue);
    onClose();
  };

  // Background scroll lock effect
  useEffect(() => {
    if (!open) return;
    const { style } = document.body;
    const prev = style.overflow;
    style.overflow = 'hidden';
    return () => { style.overflow = prev; };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[101] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-[102] bg-background rounded-t-3xl border-t border-border max-h-[70vh] flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-label="Select amount (grams)"
        >
          <Dialog.Title className="sr-only">Select Amount</Dialog.Title>
          <Dialog.Description className="sr-only">Choose portion size</Dialog.Description>

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Select Amount</h3>
              <p className="text-2xl font-bold text-primary tabular-nums">
                {currentValue}{unit}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleConfirm}>
              <Check className="h-4 w-4" />
            </Button>
          </div>

          {/* Wheel */}
          <div className="flex-1 relative p-4">
            {/* Highlight band */}
            <div 
              className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-12 bg-primary/10 border-2 border-primary/20 rounded-lg pointer-events-none z-10"
            />
            
            {/* Scrollable wheel */}
            <div
              ref={wheelRef}
              className="wheel-container h-64 overflow-y-auto scrollbar-hide scroll-smooth"
              style={{
                scrollSnapType: 'y mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {/* Top spacer */}
              <div className="h-24" />
              
              {/* Values */}
              {values.map((val) => (
                <div
                  key={val}
                  className="wheel-item h-12 flex items-center justify-center text-xl font-semibold tabular-nums transition-opacity duration-200"
                  style={{
                    scrollSnapAlign: 'center',
                    opacity: isScrolling ? 0.7 : val === currentValue ? 1 : 0.5
                  }}
                >
                  {val}
                </div>
              ))}
              
              {/* Bottom spacer */}
              <div className="h-24" />
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border safe-area-padding">
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Confirm {currentValue}{unit}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};