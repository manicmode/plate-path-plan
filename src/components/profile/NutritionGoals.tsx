
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Target, Settings, Save } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { withFrozenScroll } from '@/utils/freezeScroll';

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
  const [manualTargets, setManualTargets] = useState<any>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [isLoading, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current daily targets and manual targets
  useEffect(() => {
    const loadTargets = async () => {
      if (!user?.id) return;
      
      // Load AI-generated daily targets
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .maybeSingle();
      
      if (dailyData && !dailyError) {
        setDailyTargets(dailyData);
      }

      // Load manual targets
      const { data: manualData, error: manualError } = await supabase
        .from('manual_nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (manualData && !manualError) {
        setManualTargets(manualData);
        setIsManualOverride(manualData.is_enabled);
      }
    };
    
    loadTargets();
  }, [user?.id]);

  const validateValue = (field: string, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) {
      return 'Must be a positive number';
    }
    if (field === 'calories' && num > 5000) {
      return 'Calories cannot exceed 5000';
    }
    if (field === 'protein' && num > 300) {
      return 'Protein cannot exceed 300g';
    }
    if (field === 'carbs' && num > 1000) {
      return 'Carbs cannot exceed 1000g';
    }
    if (field === 'fat' && num > 300) {
      return 'Fat cannot exceed 300g';
    }
    if (field === 'fiber' && num > 100) {
      return 'Fiber cannot exceed 100g';
    }
    if (field === 'sugar' && num > 200) {
      return 'Sugar cannot exceed 200g';
    }
    if (field === 'sodium' && num > 5000) {
      return 'Sodium cannot exceed 5000mg';
    }
    if (field === 'saturated_fat' && num > 100) {
      return 'Saturated fat cannot exceed 100g';
    }
    if (field === 'hydration_ml' && num > 8000) {
      return 'Hydration cannot exceed 8000ml';
    }
    if (field === 'supplement_count' && num > 20) {
      return 'Supplement count cannot exceed 20';
    }
    return '';
  };

  const handleInputChange = (field: string, value: string) => {
    const error = validateValue(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
    
    setManualTargets((prev: any) => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('manual_nutrition_targets')
        .upsert({
          user_id: user?.id,
          ...manualTargets,
          is_enabled: isManualOverride
        });

      if (error) throw error;
      toast.success('Manual targets saved successfully!');
    } catch (error) {
      console.error('Error saving manual targets:', error);
      toast.error('Failed to save manual targets');
    }
    setSaving(false);
  };

  const getDisplayValue = (field: string, aiValue: any, formFallback?: any) => {
    if (isManualOverride && manualTargets?.[field] !== undefined) {
      return manualTargets[field];
    }
    return aiValue || formFallback || 'Not set';
  };

  const getSourceLabel = (field: string, aiValue: any) => {
    if (isManualOverride && manualTargets?.[field] !== undefined) {
      return 'Manual override';
    }
    return aiValue ? 'From daily targets' : null;
  };

  return (
    <Card className="animate-slide-up glass-card border-0 rounded-3xl ProfileCard" style={{ animationDelay: '200ms' }}>
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'} flex flex-row items-center justify-between`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600`} />
          <span>Daily Nutrition Targets</span>
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
      <CardContent className={`space-y-3 sm:space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        {isEditing && (
          <div className="space-y-4 pb-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <Switch
                checked={isManualOverride}
                onCheckedChange={setIsManualOverride}
                id="manual-override"
              />
              <Label htmlFor="manual-override" className="text-sm font-medium">
                Customize my daily targets manually?
              </Label>
            </div>
            {isManualOverride && (
              <Button
                onClick={handleSave}
                disabled={isLoading || Object.values(errors).some(error => error)}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save Manual Targets'}</span>
              </Button>
            )}
          </div>
        )}
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-3 gap-4'}`}>
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Calories</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.calories || ''}
                  onChange={(e) => handleInputChange('calories', e.target.value)}
                  className="h-8"
                  min="0"
                  max="5000"
                />
                {errors.calories && (
                  <div className="text-xs text-red-500">{errors.calories}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-emerald-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('calories', dailyTargets?.calories, formData.targetCalories)}
                </div>
                {getSourceLabel('calories', dailyTargets?.calories) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('calories', dailyTargets?.calories)}</div>
                )}
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Protein (g)</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.protein || ''}
                  onChange={(e) => handleInputChange('protein', e.target.value)}
                  className="h-8"
                  min="0"
                  max="300"
                />
                {errors.protein && (
                  <div className="text-xs text-red-500">{errors.protein}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-blue-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('protein', dailyTargets?.protein, formData.targetProtein)}g
                </div>
                {getSourceLabel('protein', dailyTargets?.protein) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('protein', dailyTargets?.protein)}</div>
                )}
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Carbs (g)</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.carbs || ''}
                  onChange={(e) => handleInputChange('carbs', e.target.value)}
                  className="h-8"
                  min="0"
                  max="1000"
                />
                {errors.carbs && (
                  <div className="text-xs text-red-500">{errors.carbs}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('carbs', dailyTargets?.carbs, formData.targetCarbs)}g
                </div>
                {getSourceLabel('carbs', dailyTargets?.carbs) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('carbs', dailyTargets?.carbs)}</div>
                )}
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Fat (g)</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.fat || ''}
                  onChange={(e) => handleInputChange('fat', e.target.value)}
                  className="h-8"
                  min="0"
                  max="300"
                />
                {errors.fat && (
                  <div className="text-xs text-red-500">{errors.fat}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-yellow-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('fat', dailyTargets?.fat, formData.targetFat)}g
                </div>
                {getSourceLabel('fat', dailyTargets?.fat) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('fat', dailyTargets?.fat)}</div>
                )}
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Fiber (g)</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.fiber || ''}
                  onChange={(e) => handleInputChange('fiber', e.target.value)}
                  className="h-8"
                  min="0"
                  max="100"
                />
                {errors.fiber && (
                  <div className="text-xs text-red-500">{errors.fiber}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-orange-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('fiber', dailyTargets?.fiber)}g
                </div>
                {getSourceLabel('fiber', dailyTargets?.fiber) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('fiber', dailyTargets?.fiber)}</div>
                )}
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Sugar (g)</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.sugar || ''}
                  onChange={(e) => handleInputChange('sugar', e.target.value)}
                  className="h-8"
                  min="0"
                  max="200"
                />
                {errors.sugar && (
                  <div className="text-xs text-red-500">{errors.sugar}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-pink-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('sugar', dailyTargets?.sugar)}g
                </div>
                {getSourceLabel('sugar', dailyTargets?.sugar) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('sugar', dailyTargets?.sugar)}</div>
                )}
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Sodium (mg)</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.sodium || ''}
                  onChange={(e) => handleInputChange('sodium', e.target.value)}
                  className="h-8"
                  min="0"
                  max="5000"
                />
                {errors.sodium && (
                  <div className="text-xs text-red-500">{errors.sodium}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-red-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('sodium', dailyTargets?.sodium)}mg
                </div>
                {getSourceLabel('sodium', dailyTargets?.sodium) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('sodium', dailyTargets?.sodium)}</div>
                )}
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Sat Fat (g)</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.saturated_fat || ''}
                  onChange={(e) => handleInputChange('saturated_fat', e.target.value)}
                  className="h-8"
                  min="0"
                  max="100"
                />
                {errors.saturated_fat && (
                  <div className="text-xs text-red-500">{errors.saturated_fat}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-purple-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('saturated_fat', dailyTargets?.saturated_fat)}g
                </div>
                {getSourceLabel('saturated_fat', dailyTargets?.saturated_fat) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('saturated_fat', dailyTargets?.saturated_fat)}</div>
                )}
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Hydration (ml)</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.hydration_ml || ''}
                  onChange={(e) => handleInputChange('hydration_ml', e.target.value)}
                  className="h-8"
                  min="0"
                  max="8000"
                />
                {errors.hydration_ml && (
                  <div className="text-xs text-red-500">{errors.hydration_ml}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-cyan-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {isManualOverride && manualTargets?.hydration_ml 
                    ? `${manualTargets.hydration_ml}ml`
                    : dailyTargets?.hydration_ml 
                      ? `${Math.round(dailyTargets.hydration_ml / 240)} glasses`
                      : (formData.targetHydration ? `${formData.targetHydration} glasses` : 'Not set')
                  }
                </div>
                {getSourceLabel('hydration_ml', dailyTargets?.hydration_ml) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('hydration_ml', dailyTargets?.hydration_ml)}</div>
                )}
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className={`${isMobile ? 'text-sm' : 'text-base'}`}>Supplements</Label>
            {isEditing && isManualOverride ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  value={manualTargets?.supplement_count || ''}
                  onChange={(e) => handleInputChange('supplement_count', e.target.value)}
                  className="h-8"
                  min="0"
                  max="20"
                />
                {errors.supplement_count && (
                  <div className="text-xs text-red-500">{errors.supplement_count}</div>
                )}
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold text-indigo-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('supplement_count', dailyTargets?.supplement_count, formData.targetSupplements)}
                </div>
                {getSourceLabel('supplement_count', dailyTargets?.supplement_count) && (
                  <div className="text-xs text-muted-foreground">{getSourceLabel('supplement_count', dailyTargets?.supplement_count)}</div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
