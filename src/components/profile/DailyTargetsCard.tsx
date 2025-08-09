
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
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasError, setHasError] = useState(false);
  const loadingRef = useRef(false);

  // Top-level helpers and data binding for profile targets
  const t = profile ?? {};

  const asNumber = (v: unknown) => {
    if (v === null || v === undefined) return null;
    const n = typeof v === "string" ? Number(v) : (v as number);
    return Number.isFinite(n) ? n : null;
  };

  const items = [
    { key: "calories",  label: "Calories",      value: asNumber(t.targetCalories),    unit: "",         color: "text-emerald-400" },
    { key: "protein",   label: "Protein (g)",   value: asNumber(t.targetProtein),     unit: "",         color: "text-sky-400" },
    { key: "carbs",     label: "Carbs (g)",     value: asNumber(t.targetCarbs),       unit: "",         color: "text-green-400" },
    { key: "fat",       label: "Fat (g)",       value: asNumber(t.targetFat),         unit: "",         color: "text-amber-400" },
    { key: "fiber",     label: "Fiber (g)",     value: asNumber(t.targetFiber),       unit: "",         color: "text-orange-400" },

    { key: "sugar",     label: "Sugar (g)",     value: asNumber(t.targetSugar),       unit: "",         color: "text-rose-400" },
    { key: "sodium",    label: "Sodium (mg)",   value: asNumber(t.targetSodium),      unit: "",         color: "text-red-400" },
    { key: "satFat",    label: "Sat Fat (g)",   value: asNumber(t.targetSatFat),      unit: "",         color: "text-violet-400" },
    { key: "hydration", label: "Hydration",     value: asNumber(t.targetHydration),   unit: "glasses",  color: "text-cyan-400" },
    { key: "supps",     label: "Supplements",   value: asNumber(t.targetSupplements), unit: "",         color: "text-indigo-400" },
  ];

  const colA = items.slice(0, 5);
  const colB = items.slice(5);

  const fmt = (v: number | null) => (v === null ? "Not set" : Intl.NumberFormat().format(v));

  // Dev-only log (remove after verifying)
  if (process.env.NODE_ENV !== "production") {
    console.log("[DailyTargetsCard] profile targets", {
      targetCalories: t.targetCalories,
      targetProtein: t.targetProtein,
      targetCarbs: t.targetCarbs,
      targetFat: t.targetFat,
      targetFiber: t.targetFiber,
      targetSugar: t.targetSugar,
      targetSodium: t.targetSodium,
      targetSatFat: t.targetSatFat,
      targetHydration: t.targetHydration,
      targetSupplements: t.targetSupplements,
    });
  }

  const loadTargets = async () => {
    if (!user?.id || loadingRef.current) return;
    
    loadingRef.current = true;
    setIsLoading(true);
    setHasError(false);
    
    try {
      // Load user profile with target fields
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setHasProfile(!!profileData?.onboarding_completed);
      setProfile(profileData || null);

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
      if (!todayTargets && profileData?.onboarding_completed) {
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
      <CardContent className="p-4 md:p-5">
        <div className="mt-3 grid grid-cols-2 gap-x-10 gap-y-2">
          {[colA, colB].map((col, ci) => (
            <ul key={ci} className="space-y-1">
              {col.map(({ key, label, value, unit, color }) => (
                <li key={key} className="flex items-center justify-between h-6">
                  <span className="text-[13px] leading-[1.1] text-white/80 whitespace-nowrap truncate pr-3">
                    {label}
                  </span>
                  <span className="inline-flex items-baseline gap-1 tabular-nums">
                    <span className={`font-semibold ${color} text-[15px] leading-[1.1] min-w-[3ch] text-right`}>
                      {fmt(value)}
                    </span>
                    <span className="text-white/60 text-[12px] leading-[1.1]">
                      {value === null || !unit ? '' : unit}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center mt-2">
          Last calculated: {new Date(targets.calculated_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
