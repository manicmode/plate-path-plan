
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Monitor, Settings, RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { withStabilizedViewport } from '@/utils/scrollStabilizer';
import { getHomeTrackers, setHomeTrackers, HomeTrackers } from '@/store/userPrefs';
import { TrackerKey } from '@/lib/trackers/trackerRegistry';

interface TrackerSelectionProps {
  isEditing: boolean;
  onEditToggle: () => void;
}

const trackerOptions = [
  { id: 'calories' as TrackerKey, label: 'Calories' },
  { id: 'protein' as TrackerKey, label: 'Protein' },
  { id: 'carbs' as TrackerKey, label: 'Carbs' },
  { id: 'fat' as TrackerKey, label: 'Fat' },
  { id: 'hydration' as TrackerKey, label: 'Hydration' },
  { id: 'supplements' as TrackerKey, label: 'Supplements' },
  { id: 'fiber' as TrackerKey, label: 'Fiber' },
  { id: 'micronutrients' as TrackerKey, label: 'Micronutrients' },
];

// Diagnostics flag
const DIAG_ENABLED = import.meta.env.VITE_TRACKER_QUICKSWAP_DIAG === 'true';

export const TrackerSelection = ({ isEditing, onEditToggle }: TrackerSelectionProps) => {
  const isMobile = useIsMobile();
  const [homeTrackers, setLocalHomeTrackers] = useState<HomeTrackers>(getHomeTrackers());
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // Subscribe to home tracker changes
  useEffect(() => {
    const onChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackers: HomeTrackers }>;
      if (customEvent.detail?.trackers) {
        setLocalHomeTrackers(customEvent.detail.trackers);
        if (DIAG_ENABLED) {
          console.debug('[ProfileDisplay] homeTrackerChanged event', customEvent.detail.trackers);
        }
      }
    };
    
    window.addEventListener('homeTrackerChanged', onChange);
    return () => window.removeEventListener('homeTrackerChanged', onChange);
  }, []);

  // Refresh state from canonical source on mount and edit toggle
  useEffect(() => {
    const current = getHomeTrackers();
    setLocalHomeTrackers(current);
    if (DIAG_ENABLED) {
      console.debug('[ProfileDisplay] render', current);
    }
  }, [isEditing]);

  const handleTrackerClick = useCallback(async (trackerId: TrackerKey) => {
    if (!isEditing) return;
    
    const isSelected = homeTrackers.includes(trackerId);
    
    if (isSelected) {
      // Show tooltip for already selected
      toast('Already selected on Home — use Replace to pick another');
      return;
    }

    // If not selected, show replace menu
    setReplacingIndex(null); // Will show "Replace which?" popover
  }, [isEditing, homeTrackers]);

  const handleReplace = useCallback(async (oldIndex: number, newKey: TrackerKey) => {
    try {
      const newTrackers = [...homeTrackers] as HomeTrackers;
      newTrackers[oldIndex] = newKey;
      
      if (DIAG_ENABLED) {
        console.debug('[ProfileDisplay] setHomeTrackers', newTrackers);
      }
      
      await setHomeTrackers(newTrackers);
      setReplacingIndex(null);
      
      toast('Tracker updated! Changes reflected on Home page.');
    } catch (error) {
      console.error('Failed to update tracker:', error);
      toast(error instanceof Error ? error.message : 'Failed to update tracker');
    }
  }, [homeTrackers]);

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl ProfileCard" style={{ animationDelay: '350ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'} flex flex-row items-center justify-between`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Monitor className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
          <span>Home Page Display</span>
        </CardTitle>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            withStabilizedViewport(() => onEditToggle());
          }}
          className="opacity-70 hover:opacity-100"
          style={{ touchAction: 'manipulation' }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className="space-y-3">
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300`}>
            Choose which 3 trackers appear on your home page (3/3 selected)
          </p>
          <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
            {trackerOptions.map(tracker => {
              const isSelected = homeTrackers.includes(tracker.id);
              
              return (
                <Popover key={tracker.id}>
                  <PopoverTrigger asChild>
                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer relative ${
                        isEditing ? 'hover:bg-green-100 hover:scale-105' : 'cursor-default'
                      } ${
                        isMobile ? 'text-xs px-2 py-1' : 'text-sm'
                      } transition-all duration-200`}
                      onClick={() => handleTrackerClick(tracker.id)}
                    >
                      {tracker.label}
                      {isSelected && (
                        <span className="ml-1 text-xs opacity-80">✓</span>
                      )}
                    </Badge>
                  </PopoverTrigger>
                  {isEditing && !isSelected && (
                    <PopoverContent className="w-56 p-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Replace which tracker?</p>
                        <div className="grid gap-1">
                          {homeTrackers.map((currentTracker, index) => {
                            const currentOption = trackerOptions.find(opt => opt.id === currentTracker);
                            return (
                              <Button
                                key={index}
                                variant="ghost"
                                size="sm"
                                className="justify-start h-8"
                                onClick={() => handleReplace(index, tracker.id)}
                              >
                                <RefreshCw className="h-3 w-3 mr-2" />
                                Replace {currentOption?.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
          {isEditing && (
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mt-2`}>
              • Click any unselected tracker to replace one of your current selections
              • Changes sync instantly with your Home page
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
