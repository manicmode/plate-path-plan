import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Edit3, Utensils } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FinalMealItem {
  id: string;
  name: string;
  portion: string;
  calories?: number;
}

interface FinalMealSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  onLogMeal: () => void;
  onEditItem: (itemId: string) => void;
  items: FinalMealItem[];
}

export const FinalMealSummary: React.FC<FinalMealSummaryProps> = ({
  isOpen,
  onClose,
  onLogMeal,
  onEditItem,
  items
}) => {
  const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
              <Utensils className="h-6 w-6 text-emerald-500" />
              Ready to Log Your Meal
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Review your meal items below. Tap any item to edit it before logging.
            </p>
          </DialogHeader>

          {/* Summary Stats */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-white/70 text-gray-800">
                  {items.length} items
                </Badge>
                {totalCalories > 0 && (
                  <Badge variant="default" className="bg-emerald-500">
                    {totalCalories} cal
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
            {items.map((item, index) => (
              <Card 
                key={item.id} 
                className="border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-200 cursor-pointer"
                onClick={() => onEditItem(item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {item.name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.portion}
                            {item.calories && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-500 font-medium">
                                — {item.calories} cal
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Edit3 className="h-4 w-4 text-gray-400 hover:text-emerald-500 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            
            <Button
              onClick={onLogMeal}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Log Entire Meal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};