
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface TrackerSelectionProps {
  selectedTrackers: string[];
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
];

export const TrackerSelection = ({ selectedTrackers, isEditing, onToggleTracker, onEditToggle }: TrackerSelectionProps) => {
  const isMobile = useIsMobile();

  const handleToggleTracker = (trackerId: string) => {
    if (!isEditing) return;
    
    const isSelected = selectedTrackers.includes(trackerId);
    console.log('Toggling tracker:', trackerId, 'currently selected:', isSelected);
    
    if (isSelected) {
      // Remove tracker (but ensure at least 1 remains)
      if (selectedTrackers.length > 1) {
        onToggleTracker(trackerId);
        console.log('Removed tracker:', trackerId);
      } else {
        toast.error('You must have at least 1 tracker selected');
      }
    } else {
      // Add tracker if less than 3 selected
      if (selectedTrackers.length < 3) {
        onToggleTracker(trackerId);
        console.log('Added tracker:', trackerId);
      } else {
        toast.error('You can only select 3 trackers');
      }
    }
  };

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '350ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'} flex flex-row items-center justify-between`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Monitor className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
          <span>Home Page Display</span>
        </CardTitle>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={onEditToggle}
          className="opacity-70 hover:opacity-100"
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
            {trackerOptions.map(tracker => (
              <Badge
                key={tracker.id}
                variant={selectedTrackers.includes(tracker.id) ? "default" : "outline"}
                className={`cursor-pointer ${isEditing ? 'hover:bg-green-100' : 'cursor-default'} ${isMobile ? 'text-xs px-2 py-1' : 'text-sm'}`}
                onClick={() => handleToggleTracker(tracker.id)}
              >
                {tracker.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
