import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
}

interface SavedFoodsTabProps {
  onFoodSelect: (food: any) => void;
}

export const SavedFoodsTab = ({ onFoodSelect }: SavedFoodsTabProps) => {
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSavedFoods = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching saved foods:', error);
          toast.error('Failed to load saved foods');
          return;
        }

        // Group by food name and keep most recent
        const uniqueFoods = data.reduce((acc: SavedFood[], food) => {
          const existing = acc.find(f => f.food_name.toLowerCase() === food.food_name.toLowerCase());
          if (!existing) {
            acc.push(food);
          }
          return acc;
        }, []);

        setSavedFoods(uniqueFoods);
      } catch (error) {
        console.error('Error loading saved foods:', error);
        toast.error('Failed to load saved foods');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedFoods();
  }, [user?.id]);

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
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{food.food_name}</h4>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                  <span>{food.calories} cal</span>
                  <span>{food.protein}g protein</span>
                  <span>{food.carbs}g carbs</span>
                  <span>{food.fat}g fat</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(food.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <Button
                onClick={() => handleRelogFood(food)}
                size="sm"
                className="ml-4"
              >
                <Repeat className="h-4 w-4 mr-1" />
                Log Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
