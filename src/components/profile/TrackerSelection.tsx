
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { getAutoFilledTrackers, isAutoFilledTracker } from '@/lib/trackerUtils';
import { withStabilizedViewport } from '@/utils/scrollStabilizer';

interface TrackerSelectionProps {
  selectedTrackers: string[];
  userSelectedTrackers: string[]; // Trackers explicitly selected by user
  isEditing: boolean;
  onToggleTracker: (trackerId: string) => void;
  onEditToggle: () => void;
}

const trackerOptions = [
  { id: 'calories', label: 'Calories' },
  { id: 'protein', label: 'Protein' },
  { id: 'carbs', label: 'Carbs' },
  { id: 'fat', label: 'Fat' },
  { id: 'hydration', label: 'Hydration' },
  { id: 'supplements', label: 'Supplements' },
  { id: 'fiber', label: 'Fiber' },
  { id: 'micronutrients', label: 'Micronutrients' },
];

export const TrackerSelection = ({ selectedTrackers, userSelectedTrackers, isEditing, onToggleTracker, onEditToggle }: TrackerSelectionProps) => {
  const isMobile = useIsMobile();

  const handleToggleTracker = (trackerId: string) => {
    if (!isEditing) return;
    
    const isUserSelected = userSelectedTrackers.includes(trackerId);
    
    
    if (isUserSelected) {
      // Remove tracker - auto-fill will handle ensuring 3 total
      onToggleTracker(trackerId);
      
    } else {
      // Add tracker - auto-fill will handle max 3 limit
      onToggleTracker(trackerId);
      
    }
  };

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
            Choose which 3 trackers appear on your home page ({selectedTrackers.length}/3 selected)
          </p>
          <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
            {trackerOptions.map(tracker => {
              const isSelected = selectedTrackers.includes(tracker.id);
              const isUserSelected = userSelectedTrackers.includes(tracker.id);
              const isAutoFilled = isSelected && !isUserSelected;
              
              return (
                <Badge
                  key={tracker.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer relative ${
                    isEditing ? 'hover:bg-green-100' : 'cursor-default'
                  } ${
                    isMobile ? 'text-xs px-2 py-1' : 'text-sm'
                  } ${
                    isAutoFilled ? 'opacity-70 ring-1 ring-muted-foreground' : ''
                  }`}
                  onClick={() => handleToggleTracker(tracker.id)}
                >
                  {tracker.label}
                  {isAutoFilled && (
                    <span className="ml-1 text-xs opacity-60">•</span>
                  )}
                </Badge>
              );
            })}
          </div>
          {isEditing && (
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mt-2`}>
              • Auto-filled trackers shown with lower opacity. They'll be replaced when you select others.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
