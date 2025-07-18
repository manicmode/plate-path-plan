import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useDailyTargetsGeneration } from '@/hooks/useDailyTargetsGeneration';
import { toast } from 'sonner';

interface DailyTarget {
  id: string;
  target_date: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  saturated_fat: number | null;
  hydration_ml: number | null;
  supplement_count: number | null;
  calculated_at: string;
}

export const DailyTargetsCard = () => {
  const { user } = useAuth();
  const { generateDailyTargets, ensureUserHasTargets, isGenerating } = useDailyTargetsGeneration();
  const [targets, setTargets] = useState<DailyTarget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  const loadTargets = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Check user profile completion
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed, age, gender, weight, activity_level')
        .eq('user_id', user.id)
        .maybeSingle();

      setHasProfile(!!profile?.onboarding_completed);

      // Get today's targets
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTargets, error } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading targets:', error);
        return;
      }

      setTargets(todayTargets);

      // If no targets exist and user has completed profile, try to generate them
      if (!todayTargets && profile?.onboarding_completed) {
        console.log('No targets found for completed profile, attempting to generate...');
        await ensureUserHasTargets();
        // Reload after generation attempt
        const { data: newTargets } = await supabase
          .from('daily_nutrition_targets')
          .select('*')
          .eq('user_id', user.id)
          .eq('target_date', today)
          .maybeSingle();
        setTargets(newTargets);
      }
    } catch (error) {
      console.error('Error in loadTargets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTargets();
  }, [user?.id]);

  const handleRegenerateTargets = async () => {
    try {
      await generateDailyTargets();
      await loadTargets(); // Reload after regeneration
    } catch (error) {
      console.error('Error regenerating targets:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading daily targets...</span>
        </CardContent>
      </Card>
    );
  }

  if (!hasProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Daily Nutrition Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>Complete your profile setup to get personalized daily nutrition targets</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!targets) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Daily Nutrition Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>No daily targets found. Generate your personalized targets now!</span>
          </div>
          <Button 
            onClick={handleRegenerateTargets} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Targets...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Generate Daily Targets
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Daily Nutrition Targets
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRegenerateTargets}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {targets.calories && (
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(targets.calories)}</div>
              <div className="text-sm text-muted-foreground">Calories</div>
            </div>
          )}
          {targets.protein && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round(targets.protein)}g</div>
              <div className="text-sm text-muted-foreground">Protein</div>
            </div>
          )}
          {targets.carbs && (
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round(targets.carbs)}g</div>
              <div className="text-sm text-muted-foreground">Carbs</div>
            </div>
          )}
          {targets.fat && (
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{Math.round(targets.fat)}g</div>
              <div className="text-sm text-muted-foreground">Fat</div>
            </div>
          )}
          {targets.fiber && (
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{Math.round(targets.fiber)}g</div>
              <div className="text-sm text-muted-foreground">Fiber</div>
            </div>
          )}
          {targets.sugar && (
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">{Math.round(targets.sugar)}g</div>
              <div className="text-sm text-muted-foreground">Sugar</div>
            </div>
          )}
          {targets.sodium && (
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{Math.round(targets.sodium)}mg</div>
              <div className="text-sm text-muted-foreground">Sodium</div>
            </div>
          )}
          {targets.saturated_fat && (
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(targets.saturated_fat)}g</div>
              <div className="text-sm text-muted-foreground">Sat Fat</div>
            </div>
          )}
          {targets.hydration_ml && (
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">{Math.round(targets.hydration_ml / 240)}</div>
              <div className="text-sm text-muted-foreground">Glasses H₂O</div>
            </div>
          )}
        </div>
        
        {targets.supplement_count && (
          <div className="pt-2 border-t">
            <Badge variant="secondary" className="w-full justify-center">
              {targets.supplement_count} Supplements Recommended
            </Badge>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground text-center">
          Last calculated: {new Date(targets.calculated_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};