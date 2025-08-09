import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useMealScoring } from '@/hooks/useMealScoring';

export const MealScoringTestComponent = () => {
  const { user } = useAuth();
  const { scoreMeal } = useMealScoring();
  const [testMealId, setTestMealId] = useState('');
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentMeals, setRecentMeals] = useState<any[]>([]);

  const loadRecentMeals = async () => {
    if (!user) return;
    
    if (import.meta.env.DEV) {
      console.log('[DEV][MealScoringTestComponent.loadRecentMeals] Query nutrition_logs select', {
        select: 'id, food_name, created_at',
        filters: { user_id: user.id },
        order: { created_at: 'desc' },
        limit: 5,
      });
    }
    
    const { data, error } = await supabase
      .from('nutrition_logs')
      .select('id, food_name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (import.meta.env.DEV) {
      console.log('[DEV][MealScoringTestComponent.loadRecentMeals] Result', { count: data?.length || 0, error });
    }
    
    setRecentMeals(data || []);
  };

  const testScoring = async () => {
    if (!testMealId) return;
    
    setIsLoading(true);
    try {
      const result = await scoreMeal(testMealId);
      setScoreResult(result);
    } catch (error) {
      console.error('Test scoring error:', error);
      setScoreResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const createTestMeal = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const payload = {
        user_id: user.id,
        food_name: 'Test Meal - Ultra Processed Snack',
        calories: 250,
        protein: 3,
        carbs: 35,
        fat: 12,
        fiber: 1,
        sugar: 18,
        sodium: 420,
        processing_level: 'ultra-processed',
        ingredient_analysis: {
          artificial_sweeteners: true,
          high_sodium: true,
          preservatives: true,
          flagged_ingredients: ['artificial colors', 'high fructose corn syrup']
        }
      };

      if (import.meta.env.DEV) {
        console.log('[DEV][MealScoringTestComponent.createTestMeal] nutrition_logs.insert payload', payload);
      }

      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert(payload)
        .select()
        .single();

      if (import.meta.env.DEV) {
        console.log('[DEV][MealScoringTestComponent.createTestMeal] insert result', { data, error });
      }

      if (error) throw error;
      
      setTestMealId(data.id);
      await loadRecentMeals();
      
      // Auto-test scoring
      const result = await scoreMeal(data.id);
      setScoreResult(result);
    } catch (error) {
      console.error('Test meal creation error:', error);
      setScoreResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadRecentMeals();
  }, [user]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Meal Scoring Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button onClick={createTestMeal} disabled={isLoading}>
            Create Test Meal & Score
          </Button>
          
          <div className="flex gap-2">
            <Input
              placeholder="Enter meal ID to test"
              value={testMealId}
              onChange={(e) => setTestMealId(e.target.value)}
            />
            <Button onClick={testScoring} disabled={!testMealId || isLoading}>
              Test Score
            </Button>
          </div>
        </div>

        {recentMeals.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Recent Meals:</h4>
            <div className="space-y-1">
              {recentMeals.map((meal) => (
                <div 
                  key={meal.id} 
                  className="flex justify-between items-center p-2 bg-muted rounded cursor-pointer"
                  onClick={() => setTestMealId(meal.id)}
                >
                  <span className="text-sm">{meal.food_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {meal.id.slice(0, 8)}...
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {scoreResult && (
          <div className="p-4 bg-muted rounded">
            <h4 className="font-medium mb-2">Score Result:</h4>
            {scoreResult.error ? (
              <div className="text-red-600">Error: {scoreResult.error}</div>
            ) : (
              <div className="space-y-1">
                <div>Score: <Badge variant={scoreResult.score >= 80 ? 'default' : scoreResult.score >= 50 ? 'secondary' : 'destructive'}>{scoreResult.score}</Badge></div>
                <div>Rating: {scoreResult.rating_text}</div>
                {scoreResult.penalties && (
                  <div>
                    <div className="text-sm font-medium">Penalties:</div>
                    <ul className="text-xs space-y-1">
                      {scoreResult.penalties.map((penalty, i) => (
                        <li key={i}>• {penalty}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};