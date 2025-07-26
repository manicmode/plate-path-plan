import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStableAuth } from '@/hooks/useStableAuth';
import { toast } from 'sonner';

interface SavedFood {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  created_at: string;
  image_url?: string;
  log_count: number;
}

interface SavedFoodsTabProps {
  onFoodSelect: (food: any) => void;
}

export const SavedFoodsTab = ({ onFoodSelect }: SavedFoodsTabProps) => {
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userReady } = useStableAuth();

  useEffect(() => {
    const fetchSavedFoods = async () => {
      if (!userReady || !user?.id) {
        console.log('User not ready or no user ID found, skipping saved foods fetch');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching saved foods for user:', user.id);
        // Get frequency data with aggregated counts
        const { data, error } = await supabase
          .from('nutrition_logs')
          .select(`
            food_name,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            sugar,
            sodium,
            image_url,
            created_at,
            id
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching saved foods:', error);
          // Only show error toast if there's a real error, not if data is empty
          if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            toast.error('Failed to load saved foods');
          }
          return;
        }

        console.log('Saved foods data retrieved:', data?.length || 0, 'items');

        // Group by food name, count frequency, and keep most recent data
        const foodMap = new Map<string, SavedFood>();
        
        data.forEach(food => {
          const normalizedName = food.food_name.toLowerCase();
          const existing = foodMap.get(normalizedName);
          
          if (existing) {
            // Increment count and keep most recent data
            existing.log_count++;
            if (new Date(food.created_at) > new Date(existing.created_at)) {
              existing.id = food.id;
              existing.calories = food.calories || 0;
              existing.protein = food.protein || 0;
              existing.carbs = food.carbs || 0;
              existing.fat = food.fat || 0;
              existing.fiber = food.fiber || 0;
              existing.sugar = food.sugar || 0;
              existing.sodium = food.sodium || 0;
              existing.created_at = food.created_at;
              existing.image_url = food.image_url;
            }
          } else {
            // Add new food with initial count
            foodMap.set(normalizedName, {
              id: food.id,
              food_name: food.food_name,
              calories: food.calories || 0,
              protein: food.protein || 0,
              carbs: food.carbs || 0,
              fat: food.fat || 0,
              fiber: food.fiber || 0,
              sugar: food.sugar || 0,
              sodium: food.sodium || 0,
              created_at: food.created_at,
              image_url: food.image_url,
              log_count: 1
            });
          }
        });

        // Convert to array and sort by frequency (descending), then by recency
        const uniqueFoods = Array.from(foodMap.values())
          .sort((a, b) => {
            if (b.log_count !== a.log_count) {
              return b.log_count - a.log_count; // Higher frequency first
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // More recent first
          })
          .slice(0, 20); // Limit to top 20

        setSavedFoods(uniqueFoods);
      } catch (error) {
        console.error('Error loading saved foods:', error);
        toast.error('Failed to load saved foods');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedFoods();
  }, [user?.id, userReady]);

  const handleRelogFood = (food: SavedFood) => {
    onFoodSelect({
      name: food.food_name,
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      fiber: food.fiber || 0,
      sugar: food.sugar || 0,
      sodium: food.sodium || 0,
      confidence: 100,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (savedFoods.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Saved Foods</h3>
        <p className="text-muted-foreground mb-4">
          Start logging foods to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4">Saved Foods</h3>
      {savedFoods.map((food) => (
        <Card key={food.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="relative">
              <Button
                onClick={() => handleRelogFood(food)}
                size="sm"
                className="absolute -top-2 -right-2 h-7 px-2 text-xs"
              >
                <Repeat className="h-3 w-3 mr-1" />
                Log Again
              </Button>
              
              <div className="pr-20">
                <h4 className="font-medium text-foreground">{food.food_name}</h4>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                  <span>{food.calories} cal</span>
                  <span>{food.protein}g protein</span>
                  <span>{food.carbs}g carbs</span>
                  <span>{food.fat}g fat</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(food.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="text-primary font-medium">
                    Logged {food.log_count}×
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
