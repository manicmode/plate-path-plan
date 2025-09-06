import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrackerKey, TRACKER_REGISTRY, getEligibleTrackers } from '@/lib/trackers/trackerRegistry';
import { cn } from '@/lib/utils';

interface TrackerQuickSwapProps {
  anchorRef?: React.RefObject<HTMLElement>;
  pressedIndex: 0 | 1 | 2;
  visibleKeys: TrackerKey[];
  onPick: (key: TrackerKey) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function TrackerQuickSwap({ 
  anchorRef, 
  pressedIndex, 
  visibleKeys, 
  onPick, 
  onClose, 
  isOpen 
}: TrackerQuickSwapProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const eligibleTrackers = getEligibleTrackers(visibleKeys);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const buttons = popoverRef.current?.querySelectorAll('[data-option-button]');
        if (!buttons?.length) return;

        const currentIndex = Array.from(buttons).findIndex(btn => btn === document.activeElement);
        let newIndex;
        
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, buttons.length - 1);
        } else {
          newIndex = currentIndex < 0 ? buttons.length - 1 : Math.max(currentIndex - 1, 0);
        }

        (buttons[newIndex] as HTMLElement).focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Auto focus first option
    setTimeout(() => {
      const firstButton = popoverRef.current?.querySelector('[data-option-button]') as HTMLElement;
      firstButton?.focus();
    }, 120);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Popover */}
      <Card 
        ref={popoverRef}
        className={cn(
          "relative bg-card border shadow-2xl rounded-2xl",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          "w-full max-w-xs"
        )}
      >
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm text-card-foreground">
              Quick-swap tracker {pressedIndex + 1}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select a tracker to replace the current one
            </p>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {eligibleTrackers.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No other trackers available
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {eligibleTrackers.map((trackerKey) => {
                  const tracker = TRACKER_REGISTRY[trackerKey];
                  
                  return (
                    <button
                      key={trackerKey}
                      data-option-button
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg",
                        "text-left transition-all duration-150",
                        "hover:bg-muted hover:scale-[1.02]",
                        "focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        "active:scale-[0.98]"
                      )}
                      onClick={() => {
                        onPick(trackerKey);
                        onClose();
                      }}
                    >
                      <span className="text-lg">{tracker.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-card-foreground">
                          {tracker.label}
                        </span>
                      </div>
                      {tracker.icon}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}