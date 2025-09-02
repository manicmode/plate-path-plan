import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface NumberWheelProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
}

export const NumberWheel: React.FC<NumberWheelProps> = ({
  value,
  onChange,
  min = 10,
  max = 500,
  step = 5,
  unit = 'g',
  className = ''
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastValueRef = useRef(value);
  
  // Check if user prefers fine pointer (desktop/laptop)
  const isDesktop = window.matchMedia('(pointer: fine)').matches;
  
  // Generate values array
  const values = React.useMemo(() => {
    const vals = [];
    for (let i = min; i <= max; i += step) {
      vals.push(i);
    }
    return vals;
  }, [min, max, step]);
  
  // Find current value index
  const currentIndex = values.findIndex(v => v >= value) || 0;
  
  // Haptic feedback when value changes
  const triggerHaptics = useCallback(() => {
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
  
  // Handle scroll snap to update value
  const handleScroll = useCallback(() => {
    if (!wheelRef.current) return;
    
    const container = wheelRef.current;
    const itemHeight = 40; // Height of each item
    const scrollTop = container.scrollTop;
    const newIndex = Math.round(scrollTop / itemHeight);
    const newValue = values[newIndex];
    
    if (newValue && newValue !== lastValueRef.current) {
      lastValueRef.current = newValue;
      onChange(newValue);
      triggerHaptics();
    }
  }, [values, onChange, triggerHaptics]);
  
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
  
  // Initialize scroll position
  useEffect(() => {
    if (wheelRef.current && values.length > 0) {
      const itemHeight = 40;
      const targetIndex = values.findIndex(v => v >= value);
      const scrollTop = targetIndex * itemHeight;
      wheelRef.current.scrollTop = scrollTop;
    }
  }, [values, value]);
  
  // Desktop fallback - show regular input
  if (isDesktop) {
    return (
      <div className={className}>
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value) || min;
            const clampedValue = Math.max(min, Math.min(max, newValue));
            onChange(clampedValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              onChange(Math.min(max, value + step));
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              onChange(Math.max(min, value - step));
            }
          }}
          min={min}
          max={max}
          step={step}
          className="text-center"
        />
        <span className="text-sm text-muted-foreground ml-2">{unit}</span>
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      {/* Value display */}
      <div className="text-center mb-2">
        <span className="text-lg font-semibold tabular-nums" aria-live="polite">
          {value}{unit} selected
        </span>
      </div>
      
      {/* Quick adjustment buttons */}
      <div className="flex justify-center gap-1 mb-2">
        {[-25, -10, +10, +25].map((delta) => (
          <button
            key={delta}
            onClick={() => {
              const newValue = Math.max(min, Math.min(max, value + delta));
              onChange(newValue);
              triggerHaptics();
            }}
            className="px-2 py-1 text-xs bg-muted rounded text-muted-foreground hover:bg-muted-foreground hover:text-background transition-colors"
          >
            {delta > 0 ? '+' : ''}{delta}
          </button>
        ))}
      </div>
      
      {/* Wheel container */}
      <div className="relative">
        {/* Highlight band */}
        <div 
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-primary/10 border-2 border-primary/20 rounded-lg pointer-events-none z-10"
        />
        
        {/* Scrollable wheel */}
        <div
          ref={wheelRef}
          className="wheel-container h-40 overflow-y-auto scrollbar-hide scroll-smooth"
          style={{
            scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {/* Top spacer */}
          <div className="h-16" />
          
          {/* Values */}
          {values.map((val, index) => (
            <div
              key={val}
              className="wheel-item h-10 flex items-center justify-center text-lg tabular-nums transition-opacity duration-200"
              style={{
                scrollSnapAlign: 'center',
                opacity: isScrolling ? 0.7 : 1
              }}
            >
              {val}
            </div>
          ))}
          
          {/* Bottom spacer */}
          <div className="h-16" />
        </div>
      </div>
    </div>
  );
};