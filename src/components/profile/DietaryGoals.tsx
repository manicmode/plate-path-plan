
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { withFrozenScroll } from '@/utils/freezeScroll';

interface DietaryGoalsProps {
  dietaryGoals: string[];
  isEditing: boolean;
  onToggleGoal: (goalId: string) => void;
  onEditToggle: () => void;
}

const dietaryGoalOptions = [
  { id: 'weight_loss', label: 'Weight Loss' },
  { id: 'muscle_gain', label: 'Muscle Gain' },
  { id: 'maintenance', label: 'Weight Maintenance' },
  { id: 'endurance', label: 'Endurance Training' },
  { id: 'general_health', label: 'General Health' },
];

export const DietaryGoals = ({ dietaryGoals, isEditing, onToggleGoal, onEditToggle }: DietaryGoalsProps) => {
  const isMobile = useIsMobile();

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl ProfileCard" style={{ animationDelay: '300ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'} flex flex-row items-center justify-between`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Heart className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-600`} />
          <span>Dietary Goals</span>
        </CardTitle>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
withFrozenScroll(() => onEditToggle());
          }}
          className="opacity-70 hover:opacity-100"
          style={{ touchAction: 'manipulation' }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
          {dietaryGoalOptions.map(goal => (
            <Badge
              key={goal.id}
              variant={dietaryGoals.includes(goal.id) ? "default" : "outline"}
              className={`cursor-pointer ${isEditing ? 'hover:bg-green-100' : 'cursor-default'} ${isMobile ? 'text-xs px-2 py-1' : 'text-sm'}`}
              onClick={() => isEditing && onToggleGoal(goal.id)}
            >
              {goal.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
