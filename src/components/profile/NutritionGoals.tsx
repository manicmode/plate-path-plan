
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Target, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NutritionGoalsProps {
  formData: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    targetHydration: number;
    targetSupplements: number;
  };
  isEditing: boolean;
  onFormDataChange: (updates: Partial<any>) => void;
  onEditToggle: () => void;
}

export const NutritionGoals = ({ formData, isEditing, onFormDataChange, onEditToggle }: NutritionGoalsProps) => {
  const isMobile = useIsMobile();

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl" style={{ animationDelay: '200ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'} flex flex-row items-center justify-between`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600`} />
          <span>Daily Nutrition Targets</span>
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
      <CardContent className={`space-y-3 sm:space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-3 gap-4'}`}>
          <div className="space-y-2">
            <Label htmlFor="calories" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Calories</Label>
            <Input
              id="calories"
              type="number"
              value={formData.targetCalories}
              onChange={(e) => onFormDataChange({ targetCalories: Number(e.target.value) })}
              disabled={!isEditing}
              className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protein" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Protein (g)</Label>
            <Input
              id="protein"
              type="number"
              value={formData.targetProtein}
              onChange={(e) => onFormDataChange({ targetProtein: Number(e.target.value) })}
              disabled={!isEditing}
              className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carbs" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Carbs (g)</Label>
            <Input
              id="carbs"
              type="number"
              value={formData.targetCarbs}
              onChange={(e) => onFormDataChange({ targetCarbs: Number(e.target.value) })}
              disabled={!isEditing}
              className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fat" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Fat (g)</Label>
            <Input
              id="fat"
              type="number"
              value={formData.targetFat}
              onChange={(e) => onFormDataChange({ targetFat: Number(e.target.value) })}
              disabled={!isEditing}
              className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hydration" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Hydration (glasses)</Label>
            <Input
              id="hydration"
              type="number"
              value={formData.targetHydration}
              onChange={(e) => onFormDataChange({ targetHydration: Number(e.target.value) })}
              disabled={!isEditing}
              className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplements" className={`${isMobile ? 'text-sm' : 'text-base'}`}>Supplements (count)</Label>
            <Input
              id="supplements"
              type="number"
              value={formData.targetSupplements}
              onChange={(e) => onFormDataChange({ targetSupplements: Number(e.target.value) })}
              disabled={!isEditing}
              className={`glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
