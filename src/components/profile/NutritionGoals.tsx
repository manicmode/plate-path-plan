
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Target, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

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
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [dailyTargets, setDailyTargets] = useState<any>(null);

  // Load current daily targets
  useEffect(() => {
    const loadDailyTargets = async () => {
      if (!user?.id) return;
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .maybeSingle();
      
      if (data && !error) {
        setDailyTargets(data);
      }
    };
    
    loadDailyTargets();
  }, [user?.id]);

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
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Calories</Label>
            <div className={`text-2xl font-bold text-emerald-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.calories ? Math.round(dailyTargets.calories) : (formData.targetCalories || 'Not set')}
            </div>
            {dailyTargets?.calories && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Protein (g)</Label>
            <div className={`text-2xl font-bold text-blue-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.protein ? Math.round(dailyTargets.protein) : (formData.targetProtein || 'Not set')}g
            </div>
            {dailyTargets?.protein && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Carbs (g)</Label>
            <div className={`text-2xl font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.carbs ? Math.round(dailyTargets.carbs) : (formData.targetCarbs || 'Not set')}g
            </div>
            {dailyTargets?.carbs && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Fat (g)</Label>
            <div className={`text-2xl font-bold text-yellow-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.fat ? Math.round(dailyTargets.fat) : (formData.targetFat || 'Not set')}g
            </div>
            {dailyTargets?.fat && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Fiber (g)</Label>
            <div className={`text-2xl font-bold text-orange-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.fiber ? Math.round(dailyTargets.fiber) : 'Not set'}g
            </div>
            {dailyTargets?.fiber && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Sugar (g)</Label>
            <div className={`text-2xl font-bold text-pink-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.sugar ? Math.round(dailyTargets.sugar) : 'Not set'}g
            </div>
            {dailyTargets?.sugar && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Sodium (mg)</Label>
            <div className={`text-2xl font-bold text-red-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.sodium ? Math.round(dailyTargets.sodium) : 'Not set'}mg
            </div>
            {dailyTargets?.sodium && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Sat Fat (g)</Label>
            <div className={`text-2xl font-bold text-purple-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.saturated_fat ? Math.round(dailyTargets.saturated_fat) : 'Not set'}g
            </div>
            {dailyTargets?.saturated_fat && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Hydration (glasses)</Label>
            <div className={`text-2xl font-bold text-cyan-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.hydration_ml ? Math.round(dailyTargets.hydration_ml / 240) : (formData.targetHydration || 'Not set')}
            </div>
            {dailyTargets?.hydration_ml && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Supplements</Label>
            <div className={`text-2xl font-bold text-indigo-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {dailyTargets?.supplement_count ? Math.round(dailyTargets.supplement_count) : (formData.targetSupplements || 'Not set')}
            </div>
            {dailyTargets?.supplement_count && (
              <div className="text-xs text-muted-foreground">From daily targets</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
