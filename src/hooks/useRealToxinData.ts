import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

interface ToxinData {
  name: string;
  icon: string;
  current: number;
  threshold: number;
  unit: string;
  bgColor: string;
}

interface FlaggedIngredient {
  name: string;
  category: string;
  severity: string;
  count: number;
}

interface UseRealToxinDataReturn {
  todayFlaggedCount: number;
  todayFlaggedIngredients: FlaggedIngredient[];
  toxinData: ToxinData[];
  weeklyData: Array<{ date: string; count: number }>;
  monthlyData: Array<{ date: string; count: number }>;
  isLoading: boolean;
  error: string | null;
}

const TOXIN_THRESHOLDS = {
  inflammatory_foods: { name: "Inflammatory.F", icon: "🔥", threshold: 2, unit: "servings", bgColor: "bg-orange-100" },
  artificial_sweeteners: { name: "Artificial.S", icon: "🧪", threshold: 1, unit: "servings", bgColor: "bg-green-100" },
  preservatives: { name: "Preservatives", icon: "⚗️", threshold: 3, unit: "servings", bgColor: "bg-blue-100" },
  dyes: { name: "Dyes", icon: "🎨", threshold: 1, unit: "servings", bgColor: "bg-amber-100" },
  seed_oils: { name: "Seed Oils", icon: "🌻", threshold: 2, unit: "servings", bgColor: "bg-green-100" },
  gmos: { name: "GMOs", icon: "🧬", threshold: 2, unit: "servings", bgColor: "bg-purple-100" }
};

// Map flagged ingredients to toxin types
function mapIngredientToToxinType(ingredient: string): string | null {
  const lowerIngredient = ingredient.toLowerCase();
  
  if (lowerIngredient.includes('oil') && (
    lowerIngredient.includes('sunflower') || 
    lowerIngredient.includes('canola') || 
    lowerIngredient.includes('vegetable') ||
    lowerIngredient.includes('soybean') ||
    lowerIngredient.includes('corn')
  )) {
    return 'seed_oils';
  }
  
  if (lowerIngredient.includes('sugar') || 
      lowerIngredient.includes('syrup') || 
      lowerIngredient.includes('fructose')) {
    return 'inflammatory_foods';
  }
  
  if (lowerIngredient.includes('aspartame') || 
      lowerIngredient.includes('sucralose') || 
      lowerIngredient.includes('stevia') ||
      lowerIngredient.includes('artificial sweetener')) {
    return 'artificial_sweeteners';
  }
  
  if (lowerIngredient.includes('sodium') || 
      lowerIngredient.includes('preservative') || 
      lowerIngredient.includes('bht') ||
      lowerIngredient.includes('bha')) {
    return 'preservatives';
  }
  
  if (lowerIngredient.includes('red') || 
      lowerIngredient.includes('yellow') || 
      lowerIngredient.includes('blue') ||
      lowerIngredient.includes('dye') ||
      lowerIngredient.includes('color')) {
    return 'dyes';
  }
  
  if (lowerIngredient.includes('modified') || 
      lowerIngredient.includes('gmo')) {
    return 'gmos';
  }
  
  return null;
}

export const useRealToxinData = (): UseRealToxinDataReturn => {
  const { user } = useAuth();
  const [todayFlaggedCount, setTodayFlaggedCount] = useState(0);
  const [todayFlaggedIngredients, setTodayFlaggedIngredients] = useState<FlaggedIngredient[]>([]);
  const [toxinData, setToxinData] = useState<ToxinData[]>([]);
  const [weeklyData, setWeeklyData] = useState<Array<{ date: string; count: number }>>([]);
  const [monthlyData, setMonthlyData] = useState<Array<{ date: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchToxinData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Get last 30 days of data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // Fetch toxin detections from toxin_detections table
        const { data: toxinDetections, error: toxinError } = await supabase
          .from('toxin_detections')
          .select('toxin_type, serving_count, created_at')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgoStr)
          .order('created_at', { ascending: false });

        // Don't return error if toxin_detections is empty - we'll use ingredient_analysis fallback
        if (toxinError) {
          console.warn('Toxin detections fetch error:', toxinError.message);
        }

        // Fetch nutrition logs with ingredient analysis
        const { data: nutritionLogs, error: nutritionError } = await supabase
          .from('nutrition_logs')
          .select('ingredient_analysis, created_at')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgoStr)
          .order('created_at', { ascending: false });

        if (nutritionError) {
          setError(nutritionError.message);
          return;
        }

        // Process today's toxin detections
        const todayDetections = toxinDetections?.filter(detection => 
          new Date(detection.created_at).toDateString() === today.toDateString()
        ) || [];

        // Aggregate today's toxin data by type
        const todayToxinData: { [key: string]: number } = {};
        todayDetections.forEach(detection => {
          if (!todayToxinData[detection.toxin_type]) {
            todayToxinData[detection.toxin_type] = 0;
          }
          todayToxinData[detection.toxin_type] += Number(detection.serving_count);
        });

        // FALLBACK: If toxin_detections table is empty, extract toxin data from ingredient_analysis
        if (todayDetections.length === 0) {
          const todayNutritionLogs = nutritionLogs?.filter(log => 
            new Date(log.created_at).toDateString() === today.toDateString()
          ) || [];

          todayNutritionLogs.forEach(log => {
            if (log.ingredient_analysis) {
              try {
                const analysis = typeof log.ingredient_analysis === 'string' 
                  ? JSON.parse(log.ingredient_analysis) 
                  : log.ingredient_analysis;
                
                // Map flagged ingredients to toxin types
                if (analysis.flagged_ingredients && Array.isArray(analysis.flagged_ingredients)) {
                  analysis.flagged_ingredients.forEach((ingredient: string) => {
                    const toxinType = mapIngredientToToxinType(ingredient);
                    if (toxinType) {
                      if (!todayToxinData[toxinType]) {
                        todayToxinData[toxinType] = 0;
                      }
                      todayToxinData[toxinType] += 0.5; // Each flagged ingredient = 0.5 serving
                    }
                  });
                }
              } catch (e) {
                console.warn('Failed to parse ingredient analysis:', e);
              }
            }
          });
        }

        // Process today's flagged ingredients from nutrition logs
        const todayNutritionLogs = nutritionLogs?.filter(log => 
          new Date(log.created_at).toDateString() === today.toDateString()
        ) || [];

        const flaggedIngredientsMap: { [key: string]: FlaggedIngredient } = {};
        let totalFlaggedCount = 0;

        todayNutritionLogs.forEach(log => {
          if (log.ingredient_analysis) {
            try {
              const analysis = typeof log.ingredient_analysis === 'string' 
                ? JSON.parse(log.ingredient_analysis) 
                : log.ingredient_analysis;
              
              if (analysis.flagged_ingredients && Array.isArray(analysis.flagged_ingredients)) {
                analysis.flagged_ingredients.forEach((ingredient: string) => {
                  totalFlaggedCount++;
                  if (flaggedIngredientsMap[ingredient]) {
                    flaggedIngredientsMap[ingredient].count++;
                  } else {
                    flaggedIngredientsMap[ingredient] = {
                      name: ingredient,
                      category: 'additive',
                      severity: 'medium',
                      count: 1
                    };
                  }
                });
              }
            } catch (e) {
              console.warn('Failed to parse ingredient analysis:', e);
            }
          }
        });

        setTodayFlaggedCount(totalFlaggedCount);
        setTodayFlaggedIngredients(Object.values(flaggedIngredientsMap));

        // Convert to ToxinData format for display
        const toxinArray: ToxinData[] = Object.entries(TOXIN_THRESHOLDS).map(([key, config]) => ({
          name: config.name,
          icon: config.icon,
          current: todayToxinData[key] || 0,
          threshold: config.threshold,
          unit: config.unit,
          bgColor: config.bgColor
        }));

        setToxinData(toxinArray);

        // Process weekly data (last 7 days)
        const weeklyToxinData: Array<{ date: string; count: number }> = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          // Count toxin detections for this day
          const dayDetections = toxinDetections?.filter(detection => 
            new Date(detection.created_at).toDateString() === date.toDateString()
          ) || [];
          
          // Count flagged ingredients for this day
          const dayNutritionLogs = nutritionLogs?.filter(log => 
            new Date(log.created_at).toDateString() === date.toDateString()
          ) || [];
          
          let dayFlaggedCount = 0;
          dayNutritionLogs.forEach(log => {
            if (log.ingredient_analysis) {
              try {
                const analysis = typeof log.ingredient_analysis === 'string' 
                  ? JSON.parse(log.ingredient_analysis) 
                  : log.ingredient_analysis;
                
                if (analysis.flagged_ingredients && Array.isArray(analysis.flagged_ingredients)) {
                  dayFlaggedCount += analysis.flagged_ingredients.length;
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          });
          
          const totalDayToxins = dayDetections.reduce((sum, det) => sum + Number(det.serving_count), 0);
          const totalCount = totalDayToxins + dayFlaggedCount;
          
          const dayName = i === 0 ? 'Today' : 
                         i === 1 ? 'Yesterday' :
                         date.toLocaleDateString('en-US', { weekday: 'short' });
          
          weeklyToxinData.push({
            date: dayName,
            count: totalCount
          });
        }
        setWeeklyData(weeklyToxinData);

        // Process monthly data (last 4 weeks)
        const monthlyToxinData: Array<{ date: string; count: number }> = [];
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() - (i * 7));
          
          const weekDetections = toxinDetections?.filter(detection => {
            const detDate = new Date(detection.created_at);
            return detDate >= weekStart && detDate <= weekEnd;
          }) || [];
          
          const weekNutritionLogs = nutritionLogs?.filter(log => {
            const logDate = new Date(log.created_at);
            return logDate >= weekStart && logDate <= weekEnd;
          }) || [];
          
          let weekFlaggedCount = 0;
          weekNutritionLogs.forEach(log => {
            if (log.ingredient_analysis) {
              try {
                const analysis = typeof log.ingredient_analysis === 'string' 
                  ? JSON.parse(log.ingredient_analysis) 
                  : log.ingredient_analysis;
                
                if (analysis.flagged_ingredients && Array.isArray(analysis.flagged_ingredients)) {
                  weekFlaggedCount += analysis.flagged_ingredients.length;
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          });
          
          const totalWeekToxins = weekDetections.reduce((sum, det) => sum + Number(det.serving_count), 0);
          const avgCount = (totalWeekToxins + weekFlaggedCount) / 7; // Average per day for the week
          
          monthlyToxinData.push({
            date: i === 0 ? 'This Week' : `Week ${4 - i}`,
            count: Math.round(avgCount * 10) / 10 // Round to 1 decimal place
          });
        }
        setMonthlyData(monthlyToxinData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch toxin data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchToxinData();
  }, [user?.id]);

  return {
    todayFlaggedCount,
    todayFlaggedIngredients,
    toxinData,
    weeklyData,
    monthlyData,
    isLoading,
    error
  };
};