import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Repeat, Barcode } from 'lucide-react';
import { useRecentBarcodes } from '@/hooks/useRecentBarcodes';
import { useBarcodeHistory } from '@/hooks/useBarcodeHistory';
import { useNutrition } from '@/contexts/NutritionContext';

interface RecentFoodsTabProps {
  onFoodSelect: (food: any) => void;
  onBarcodeSelect: (barcode: string) => void;
}

export const RecentFoodsTab = ({ onFoodSelect, onBarcodeSelect }: RecentFoodsTabProps) => {
  const { recentBarcodes } = useRecentBarcodes();
  const { barcodeHistory } = useBarcodeHistory();
  const { currentDay } = useNutrition();

  const todaysFoods = currentDay.foods.slice(0, 10); // Show last 10 foods from today
  const recentBarcodesLimited = recentBarcodes.slice(0, 5); // Show last 5 barcodes

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

  if (todaysFoods.length === 0 && recentBarcodesLimited.length === 0) {
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
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
      )}

      {/* Recent Barcodes */}
      {recentBarcodesLimited.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Recent Scanned Products</h3>
          {recentBarcodesLimited.map((barcodeItem, index) => (
            <Card key={`${barcodeItem.barcode}-${index}`} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
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
                  <Button
                    onClick={() => handleRelogBarcode(barcodeItem)}
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
      )}
    </div>
  );
};