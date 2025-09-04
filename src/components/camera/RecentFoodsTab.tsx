import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Repeat, Barcode, Zap, Package } from 'lucide-react';
import { useRecentBarcodes } from '@/hooks/useRecentBarcodes';
import { useBarcodeHistory } from '@/hooks/useBarcodeHistory';
import { useNutrition } from '@/contexts/NutritionContext';
import { MealScoreDisplay } from '@/components/MealScoreDisplay';
import { useState, useEffect } from 'react';
import { listMealSets, type MealSet } from '@/lib/mealSets';
import { toast } from 'sonner';
import { createFoodLogsBatch } from '@/api/nutritionLogs';
import { useAuth } from '@/contexts/auth';

interface RecentFoodsTabProps {
  onFoodSelect: (food: any) => void;
  onBarcodeSelect: (barcode: string) => void;
}

export const RecentFoodsTab = ({ onFoodSelect, onBarcodeSelect }: RecentFoodsTabProps) => {
  const { recentBarcodes } = useRecentBarcodes();
  const { barcodeHistory } = useBarcodeHistory();
  const { currentDay } = useNutrition();
  const { user } = useAuth();
  
  const [recentMealSets, setRecentMealSets] = useState<MealSet[]>([]);
  const [loadingMealSets, setLoadingMealSets] = useState(true);

  const todaysFoods = currentDay.foods.slice(0, 10); // Show last 10 foods from today
  const recentBarcodesLimited = recentBarcodes.slice(0, 5); // Show last 5 barcodes

  // Load recent meal sets
  useEffect(() => {
    const loadMealSets = async () => {
      try {
        setLoadingMealSets(true);
        const sets = await listMealSets(5, 0); // Get last 5 meal sets
        setRecentMealSets(sets);
      } catch (error) {
        console.error('Failed to load meal sets:', error);
      } finally {
        setLoadingMealSets(false);
      }
    };

    loadMealSets();
  }, []);

  // Calculate total nutrition for a meal set
  const calculateMealSetNutrition = (mealSet: MealSet) => {
    return mealSet.items.reduce((total, item) => {
      // Rough estimation based on grams (similar to what's done in SavedLogs.tsx)
      const itemCalories = Math.round(item.grams * 2);
      const itemProtein = Math.round(item.grams * 0.2);
      const itemCarbs = Math.round(item.grams * 0.3);
      const itemFat = Math.round(item.grams * 0.1);
      
      return {
        calories: total.calories + itemCalories,
        protein: total.protein + itemProtein,
        carbs: total.carbs + itemCarbs,
        fat: total.fat + itemFat,
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // One-click log entire meal set
  const handleQuickLogMealSet = async (mealSet: MealSet) => {
    if (!user?.id) {
      toast.error('Authentication required');
      return;
    }

    try {
      const logItems = mealSet.items.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams,
        source: 'meal_set',
        // Add basic nutritional estimates
        calories: Math.round(item.grams * 2),
        protein: Math.round(item.grams * 0.2),
        carbs: Math.round(item.grams * 0.3),
        fat: Math.round(item.grams * 0.1),
        fiber: Math.round(item.grams * 0.05),
        sugar: Math.round(item.grams * 0.1),
        sodium: Math.round(item.grams * 0.01)
      }));

      await createFoodLogsBatch(logItems, user.id);
      toast.success(`"${mealSet.name}" logged ✓`);
    } catch (error) {
      console.error('Failed to log meal set:', error);
      toast.error('Failed to log meal set');
    }
  };

  const handleRelogFood = (food: any) => {
    onFoodSelect({
      name: food.name,
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

  const handleRelogBarcode = (barcodeItem: any) => {
    onFoodSelect({
      name: barcodeItem.productName,
      calories: barcodeItem.nutrition.calories || 0,
      protein: barcodeItem.nutrition.protein || 0,
      carbs: barcodeItem.nutrition.carbs || 0,
      fat: barcodeItem.nutrition.fat || 0,
      fiber: barcodeItem.nutrition.fiber || 0,
      sugar: barcodeItem.nutrition.sugar || 0,
      sodium: barcodeItem.nutrition.sodium || 0,
      confidence: 100,
    });
  };

  if (todaysFoods.length === 0 && recentBarcodesLimited.length === 0 && recentMealSets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Recent Foods</h3>
        <p className="text-muted-foreground mb-4">
          Start logging foods to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Foods */}
      {todaysFoods.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Today's Foods</h3>
          {todaysFoods.map((food) => (
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
                    <h4 className="font-medium text-foreground">{food.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>{food.calories} cal</span>
                      <span>{food.protein}g protein</span>
                      <span>{food.carbs}g carbs</span>
                      <span>{food.fat}g fat</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{food.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {/* Meal Score Display - Only show if we have database ID */}
                    {food.databaseId && (
                      <div className="mt-2">
                        <MealScoreDisplay mealId={food.databaseId} className="text-xs" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Barcodes */}
      {recentBarcodesLimited.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Recent Scanned Products</h3>
          {recentBarcodesLimited.map((barcodeItem, index) => (
            <Card key={`${barcodeItem.barcode}-${index}`} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="relative">
                  <Button
                    onClick={() => handleRelogBarcode(barcodeItem)}
                    size="sm"
                    className="absolute -top-2 -right-2 h-7 px-2 text-xs"
                  >
                    <Repeat className="h-3 w-3 mr-1" />
                    Log Again
                  </Button>
                  
                  <div className="pr-20">
                    <div className="flex items-center space-x-2">
                      <Barcode className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium text-foreground">{barcodeItem.productName}</h4>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>{barcodeItem.nutrition.calories} cal</span>
                      <span>{barcodeItem.nutrition.protein}g protein</span>
                      <span>{barcodeItem.nutrition.carbs}g carbs</span>
                      <span>{barcodeItem.nutrition.fat}g fat</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{barcodeItem.timestamp.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Meal Sets */}
      {recentMealSets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Recent Meal Sets</h3>
          {recentMealSets.map((mealSet) => {
            const nutrition = calculateMealSetNutrition(mealSet);
            const itemsPreview = mealSet.items.slice(0, 3).map(item => item.name).join(', ');
            const hasMoreItems = mealSet.items.length > 3;
            
            return (
              <Card key={mealSet.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="relative">
                    <Button
                      onClick={() => handleQuickLogMealSet(mealSet)}
                      size="sm"
                      className="absolute -top-2 -right-2 h-7 px-2 text-xs"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Log All
                    </Button>
                    
                    <div className="pr-20">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium text-foreground">
                          {mealSet.name} <span className="text-muted-foreground text-sm">(SET)</span>
                        </h4>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span>{nutrition.calories} cal</span>
                        <span>{nutrition.protein}g protein</span>
                        <span>{nutrition.carbs}g carbs</span>
                        <span>{nutrition.fat}g fat</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {itemsPreview}{hasMoreItems ? ` +${mealSet.items.length - 3} more` : ''}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(mealSet.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};