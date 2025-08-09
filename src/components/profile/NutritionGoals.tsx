
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
import { withStabilizedViewport } from '@/utils/scrollStabilizer';

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
withStabilizedViewport(() => onEditToggle());
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
        <div className="flex flex-col">
          {/* Calories */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Calories</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.calories || ''}
                  onChange={(e) => handleInputChange('calories', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="5000"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold text-emerald-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  {getDisplayValue('calories', dailyTargets?.calories, formData.targetCalories)}
                </span>
              </div>
            )}
          </div>
          {errors.calories && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.calories}</div>
          )}

          {/* Protein */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Protein</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.protein || ''}
                  onChange={(e) => handleInputChange('protein', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="300"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold text-blue-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{getDisplayValue('protein', dailyTargets?.protein, formData.targetProtein)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            )}
          </div>
          {errors.protein && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.protein}</div>
          )}

          {/* Carbs */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Carbs</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.carbs || ''}
                  onChange={(e) => handleInputChange('carbs', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="1000"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold text-green-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{getDisplayValue('carbs', dailyTargets?.carbs, formData.targetCarbs)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            )}
          </div>
          {errors.carbs && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.carbs}</div>
          )}

          {/* Fat */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Fat</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.fat || ''}
                  onChange={(e) => handleInputChange('fat', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="300"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold text-yellow-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{getDisplayValue('fat', dailyTargets?.fat, formData.targetFat)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            )}
          </div>
          {errors.fat && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.fat}</div>
          )}

          {/* Fiber */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Fiber</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.fiber || ''}
                  onChange={(e) => handleInputChange('fiber', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="100"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold text-orange-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{getDisplayValue('fiber', dailyTargets?.fiber)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            )}
          </div>
          {errors.fiber && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.fiber}</div>
          )}

          {/* Sugar */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Sugar</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.sugar || ''}
                  onChange={(e) => handleInputChange('sugar', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="200"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold text-pink-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{getDisplayValue('sugar', dailyTargets?.sugar)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            )}
          </div>
          {errors.sugar && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.sugar}</div>
          )}

          {/* Sodium */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Sodium</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.sodium || ''}
                  onChange={(e) => handleInputChange('sodium', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="5000"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold text-red-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{getDisplayValue('sodium', dailyTargets?.sodium)}</span>
                <span className="text-xs text-muted-foreground">mg</span>
              </div>
            )}
          </div>
          {errors.sodium && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.sodium}</div>
          )}

          {/* Sat Fat */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Sat Fat</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.saturated_fat || ''}
                  onChange={(e) => handleInputChange('saturated_fat', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="100"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold text-purple-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{getDisplayValue('saturated_fat', dailyTargets?.saturated_fat)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            )}
          </div>
          {errors.saturated_fat && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.saturated_fat}</div>
          )}

          {/* Hydration */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Hydration</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.hydration_ml || ''}
                  onChange={(e) => handleInputChange('hydration_ml', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="8000"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                {isManualOverride && manualTargets?.hydration_ml ? (
                  <>
                    <span className={`text-2xl font-bold text-cyan-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{manualTargets.hydration_ml}</span>
                    <span className="text-xs text-muted-foreground">ml</span>
                  </>
                ) : dailyTargets?.hydration_ml ? (
                  <>
                    <span className={`text-2xl font-bold text-cyan-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{Math.round(dailyTargets.hydration_ml / 240)}</span>
                    <span className="text-xs text-muted-foreground">glasses</span>
                  </>
                ) : (
                  <>
                    <span className={`text-2xl font-bold text-cyan-600 min-w-[3ch] md:min-w-[4ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{formData.targetHydration || 'Not set'}</span>
                    <span className="text-xs text-muted-foreground">glasses</span>
                  </>
                )}
              </div>
            )}
          </div>
          {errors.hydration_ml && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.hydration_ml}</div>
          )}

          {/* Supplements */}
          <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
            <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Supplements</div>
            {isEditing && isManualOverride ? (
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  value={manualTargets?.supplement_count || ''}
                  onChange={(e) => handleInputChange('supplement_count', e.target.value)}
                  className="h-8 w-24 text-right"
                  min="0"
                  max="20"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-bold text-indigo-600 min-w-[2ch] text-right ${isMobile ? 'text-lg' : 'text-2xl'}`}>{getDisplayValue('supplement_count', dailyTargets?.supplement_count, formData.targetSupplements)}</span>
              </div>
            )}
          </div>
          {errors.supplement_count && (
            <div className="col-span-2 text-xs text-red-500 mt-1">{errors.supplement_count}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
