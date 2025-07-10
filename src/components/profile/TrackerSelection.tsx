
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Monitor, Settings, Zap, Apple, Droplets, Pill } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TrackerSelectionProps {
  selectedTrackers: string[];
  isEditing: boolean;
  onToggleTracker: (trackerId: string) => void;
  onEditToggle: () => void;
}

const trackerPairs = [
  {
    id: 'energy',
    label: 'Energy Focus',
    icon: Zap,
    option1: { id: 'calories', label: 'Calories', description: 'Track total energy intake' },
    option2: { id: 'protein', label: 'Protein', description: 'Track muscle building nutrients' }
  },
  {
    id: 'macros',
    label: 'Macro Focus',
    icon: Apple,
    option1: { id: 'carbs', label: 'Carbs', description: 'Track energy carbohydrates' },
    option2: { id: 'fat', label: 'Fat', description: 'Track healthy fats intake' }
  },
  {
    id: 'wellness',
    label: 'Wellness Focus',
    icon: Droplets,
    option1: { id: 'hydration', label: 'Hydration', description: 'Track daily water intake' },
    option2: { id: 'supplements', label: 'Supplements', description: 'Track vitamins & supplements' }
  }
];

export const TrackerSelection = ({ selectedTrackers, isEditing, onToggleTracker, onEditToggle }: TrackerSelectionProps) => {
  const isMobile = useIsMobile();

  // Helper function to determine which tracker in a pair is selected
  const getSelectedTrackerInPair = (pair: typeof trackerPairs[0]) => {
    if (selectedTrackers.includes(pair.option1.id)) return pair.option1.id;
    if (selectedTrackers.includes(pair.option2.id)) return pair.option2.id;
    return pair.option1.id; // Default to first option
  };

  // Helper function to handle pair toggle
  const handlePairToggle = (pair: typeof trackerPairs[0], checked: boolean) => {
    if (!isEditing) return;

    const currentSelected = getSelectedTrackerInPair(pair);
    const newSelected = checked ? pair.option2.id : pair.option1.id;
    
    if (currentSelected !== newSelected) {
      // First remove the current selection, then add the new one
      onToggleTracker(currentSelected);
      onToggleTracker(newSelected);
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
        <div className="space-y-4">
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
            Choose your 3 tracker preferences for the home page display
          </p>
          
          <div className="space-y-6">
            {trackerPairs.map((pair) => {
              const IconComponent = pair.icon;
              const selectedTracker = getSelectedTrackerInPair(pair);
              const isOption2Selected = selectedTracker === pair.option2.id;
              
              return (
                <div key={pair.id} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
                    <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium`}>{pair.label}</h4>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium ${!isOption2Selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {pair.option1.label}
                          </span>
                          <div className="flex items-center space-x-3">
                            <Switch
                              checked={isOption2Selected}
                              onCheckedChange={(checked) => handlePairToggle(pair, checked)}
                              disabled={!isEditing}
                            />
                            <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium ${isOption2Selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {pair.option2.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                      {selectedTracker === pair.option1.id ? pair.option1.description : pair.option2.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
