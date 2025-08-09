
import { useState, useEffect, useRef } from 'react';
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
  const [hasError, setHasError] = useState(false);
  const loadingRef = useRef(false);

  const loadTargets = async () => {
    if (!user?.id || loadingRef.current) return;
    
    loadingRef.current = true;
    setIsLoading(true);
    setHasError(false);
    
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
        setHasError(true);
        return;
      }

      setTargets(todayTargets);

      // If no targets exist and user has completed profile, try to generate them
      if (!todayTargets && profile?.onboarding_completed) {
        console.log('No targets found for completed profile, attempting to generate...');
        try {
          await ensureUserHasTargets();
          // Reload after generation attempt
          const { data: newTargets } = await supabase
            .from('daily_nutrition_targets')
            .select('*')
            .eq('user_id', user.id)
            .eq('target_date', today)
            .maybeSingle();
          setTargets(newTargets);
        } catch (generateError) {
          console.error('Error generating targets:', generateError);
          setHasError(true);
        }
      }
    } catch (error) {
      console.error('Error in loadTargets:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    loadTargets();
  }, [user?.id]);

  const handleRegenerateTargets = async () => {
    if (isGenerating || loadingRef.current) return;
    
    try {
      setHasError(false);
      await generateDailyTargets();
      await loadTargets(); // Reload after regeneration
    } catch (error) {
      console.error('Error regenerating targets:', error);
      setHasError(true);
      toast.error('Failed to regenerate targets. Please try again.');
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

  if (hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Daily Nutrition Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>Unable to load daily targets. Please try again.</span>
          </div>
          <Button 
            onClick={handleRegenerateTargets} 
            disabled={isGenerating}
            className="w-full"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
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
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1">
          {targets.calories && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Calories</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-primary min-w-[3ch] md:min-w-[4ch] text-right">{Math.round(targets.calories)}</span>
              </div>
            </div>
          )}

          {targets.protein && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Protein</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-blue-600 min-w-[3ch] md:min-w-[4ch] text-right">{Math.round(targets.protein)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            </div>
          )}

          {targets.carbs && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Carbs</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-green-600 min-w-[3ch] md:min-w-[4ch] text-right">{Math.round(targets.carbs)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            </div>
          )}

          {targets.fat && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Fat</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-yellow-600 min-w-[3ch] md:min-w-[4ch] text-right">{Math.round(targets.fat)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            </div>
          )}

          {targets.fiber && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Fiber</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-orange-600 min-w-[3ch] md:min-w-[4ch] text-right">{Math.round(targets.fiber)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            </div>
          )}

          {targets.sugar && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Sugar</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-pink-600 min-w-[3ch] md:min-w-[4ch] text-right">{Math.round(targets.sugar)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            </div>
          )}

          {targets.sodium && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Sodium</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-red-600 min-w-[3ch] md:min-w-[4ch] text-right">{Math.round(targets.sodium)}</span>
                <span className="text-xs text-muted-foreground">mg</span>
              </div>
            </div>
          )}

          {targets.saturated_fat && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Sat Fat</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-purple-600 min-w-[3ch] md:min-w-[4ch] text-right">{Math.round(targets.saturated_fat)}</span>
                <span className="text-xs text-muted-foreground">g</span>
              </div>
            </div>
          )}

          {targets.hydration_ml && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Hydration</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-cyan-600 min-w-[3ch] md:min-w-[4ch] text-right">{Math.round(targets.hydration_ml / 240)}</span>
                <span className="text-xs text-muted-foreground">glasses</span>
              </div>
            </div>
          )}

          {targets.supplement_count && (
            <div className="grid grid-cols-[1fr_auto] items-center py-1.5 border-t first:border-t-0 border-border/50">
              <div className="truncate whitespace-nowrap text-sm text-muted-foreground">Supplements</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold min-w-[2ch] text-right">{targets.supplement_count}</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Last calculated: {new Date(targets.calculated_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
