import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, CheckCircle, Sparkles, Info, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface DetectedFood {
  name: string;
  confidence: number;
  sources: string[];
  calories?: number;
  portion?: string;
  isEstimate?: boolean;
}

interface MultiAIFoodDetectionProps {
  detectedFoods: DetectedFood[];
  isLoading: boolean;
  onConfirm: (selectedFoods: DetectedFood[]) => void;
  onCancel: () => void;
  onAddManually: () => void;
  onAddToResults: (food: DetectedFood) => void;
}

export const MultiAIFoodDetection = ({ 
  detectedFoods, 
  isLoading, 
  onConfirm, 
  onCancel,
  onAddManually,
  onAddToResults 
}: MultiAIFoodDetectionProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleSelection = (foodName: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(foodName)) {
      newSelection.delete(foodName);
    } else {
      newSelection.add(foodName);
    }
    setSelectedItems(newSelection);
  };

  const handleConfirm = () => {
    const selectedFoods = detectedFoods.filter(food => selectedItems.has(food.name));
    if (selectedFoods.length === 0) {
      toast.error('Please select at least one food item');
      return;
    }
    onConfirm(selectedFoods);
  };

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'google': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'caloriemama': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'gpt': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'claude': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex flex-col items-center gap-3 text-center">
            <Sparkles className="h-6 w-6 animate-pulse text-primary" />
            <div>
              <div className="text-lg font-bold text-foreground">
                Your plate decoded by the world's smartest food vision system.
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-normal">
                Powered by GPT-Vision — trained on trillions of food examples to understand meals, ingredients, and health impact instantly.
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center text-muted-foreground">
              Analyzing your food with advanced AI vision...
            </div>
            <div className="flex justify-center">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">GPT Vision</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Detected Food Items ({detectedFoods.length})
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select the food items you want to log. Items are ranked by confidence level.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {detectedFoods.map((food, index) => (
            <div
              key={`${food.name}-${index}`}
              className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                selectedItems.has(food.name)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => toggleSelection(food.name)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedItems.has(food.name)}
                  onChange={() => toggleSelection(food.name)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{food.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {food.calories ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              Estimated: {food.calories} kcal
                            </span>
                            {food.portion && (
                              <span className="text-xs text-muted-foreground">
                                per {food.portion}
                              </span>
                            )}
                            {food.isEstimate && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Estimate only</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              Estimated: ~100 kcal
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Estimate only</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(Math.min(food.confidence * 100, 100))}% confidence
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        GPT Vision
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {food.sources.map((source) => (
                      <Badge
                        key={source}
                        variant="secondary"
                        className={`text-xs ${getSourceColor(source)}`}
                      >
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {detectedFoods.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No food items detected with sufficient confidence.</p>
            <p className="text-sm mt-2">Try taking a clearer photo or use manual entry.</p>
          </div>
        )}

        {detectedFoods.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              onClick={onAddManually}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Can't find what you're looking for? Add it manually.
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button 
            onClick={handleConfirm} 
            disabled={selectedItems.size === 0 || detectedFoods.length === 0}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Log Selected Items ({selectedItems.size})
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};