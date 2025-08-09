
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

  const renderRow = (
    label: string,
    value: number | null | undefined,
    unit: string,
    colorClass: string
  ) => {
    if (value === null || value === undefined) return null;
    return (
      <div className="grid grid-cols-[1fr,auto] items-baseline py-2 border-b border-white/5 last:border-b-0">
        <div className="text-sm text-muted-foreground truncate">{label}</div>
        <div className="justify-self-end inline-flex items-baseline gap-1">
          <span className={`font-bold min-w-[3ch] text-right ${colorClass}`}>{value}</span>
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
      </div>
    );
  };

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
          {renderRow('Calories', targets.calories ? Math.round(targets.calories) : null, '', 'text-primary')}
          {renderRow('Protein', targets.protein ? Math.round(targets.protein) : null, 'g', 'text-blue-600')}
          {renderRow('Carbs', targets.carbs ? Math.round(targets.carbs) : null, 'g', 'text-green-600')}
          {renderRow('Fat', targets.fat ? Math.round(targets.fat) : null, 'g', 'text-yellow-600')}
          {renderRow('Fiber', targets.fiber ? Math.round(targets.fiber) : null, 'g', 'text-orange-600')}
          {renderRow('Sugar', targets.sugar ? Math.round(targets.sugar) : null, 'g', 'text-pink-600')}
          {renderRow('Sodium', targets.sodium ? Math.round(targets.sodium) : null, 'mg', 'text-red-600')}
          {renderRow('Sat Fat', targets.saturated_fat ? Math.round(targets.saturated_fat) : null, 'g', 'text-purple-600')}
          {renderRow('Hydration', targets.hydration_ml ? Math.round(targets.hydration_ml / 240) : null, 'glasses', 'text-cyan-600')}
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
