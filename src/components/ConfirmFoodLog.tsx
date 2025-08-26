import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import { LogProduct, scaleNutrition } from '@/lib/log/mappers';

interface ConfirmFoodLogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (foodItem: any) => void;
  logProduct: LogProduct | null;
}

export const ConfirmFoodLog: React.FC<ConfirmFoodLogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  logProduct
}) => {
  const [portionPct, setPortionPct] = useState(100);

  const scaledNutrition = useMemo(() => {
    if (!logProduct) return null;
    return scaleNutrition(logProduct.nutrition, portionPct);
  }, [logProduct, portionPct]);

  const handleConfirm = () => {
    if (!logProduct || !scaledNutrition) return;
    
    console.log('[LOG] confirm_open', {
      name: logProduct.name,
      barcode: logProduct.barcode,
      hasNutrition: !!(scaledNutrition.calories || scaledNutrition.protein),
      flags: logProduct.healthFlags.length
    });

    const foodItem = {
      name: logProduct.name,
      calories: scaledNutrition.calories || 0,
      protein: scaledNutrition.protein || 0,
      carbs: scaledNutrition.carbs || 0,
      fat: scaledNutrition.fat || 0,
      fiber: scaledNutrition.fiber || 0,
      sugar: scaledNutrition.sugar || 0,
      sodium: scaledNutrition.sodium || 0,
      barcode: logProduct.barcode,
      source: 'barcode'
    };

    onConfirm(foodItem);
  };

  const handlePortionChange = (value: number[]) => {
    const newPct = value[0];
    setPortionPct(newPct);
    console.log('[LOG] portion_change', { pct: newPct });
  };

  if (!logProduct) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-background border-0 rounded-none" showCloseButton={false}>
        <div className="flex flex-col h-full">
          {/* Header with centered title */}
          <header className="flex-shrink-0 px-4 py-3 border-b bg-card">
            <div className="grid grid-cols-3 items-center">
              <span aria-hidden="true" />
              <DialogTitle className="justify-self-center text-lg font-semibold">
                Confirm Food Log
              </DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="sm" className="justify-self-end p-2">
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
          </header>

          {/* Product Info */}
          <div className="flex-shrink-0 p-4 bg-muted/20">
            <div className="flex items-center gap-3">
              {logProduct.imageUrl && (
                <img 
                  src={logProduct.imageUrl} 
                  alt={logProduct.name}
                  className="w-16 h-16 rounded-lg object-cover bg-muted"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {logProduct.brand ? `${logProduct.brand} ${logProduct.name}` : logProduct.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {logProduct.barcode} • {logProduct.healthScore !== null ? `Health Score: ${logProduct.healthScore}/10` : 'No health score'}
                </p>
              </div>
            </div>
          </div>

          {/* Portion Slider */}
          <div className="flex-shrink-0 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Portion Size</label>
                <span className="text-sm text-muted-foreground">{portionPct}%</span>
              </div>
              <Slider
                value={[portionPct]}
                onValueChange={handlePortionChange}
                max={200}
                min={25}
                step={25}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Quarter</span>
                <span>Half</span>
                <span>Full</span>
                <span>Double</span>
              </div>
            </div>
          </div>

          {/* Tabbed Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="nutrition" className="flex flex-col h-full">
              {/* Tab List */}
              <div className="flex-shrink-0 px-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                  <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                  <TabsTrigger value="health">Health Check</TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="nutrition" className="mt-0">
                  <NutritionPanel nutrition={scaledNutrition} />
                </TabsContent>

                <TabsContent value="ingredients" className="mt-0">
                  <IngredientsPanel 
                    ingredients={logProduct.ingredients}
                    additives={logProduct.additives}
                    allergens={logProduct.allergens}
                  />
                </TabsContent>

                <TabsContent value="health" className="mt-0">
                  <HealthPanel 
                    healthFlags={logProduct.healthFlags}
                    healthScore={logProduct.healthScore}
                    nova={logProduct.nova}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer Actions */}
          <footer className="flex-shrink-0 p-4 border-t bg-card">
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={portionPct === 0}
                className="flex-1"
              >
                Log Food ({scaledNutrition?.calories || 0} cal)
              </Button>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Nutrition Panel Component
const NutritionPanel: React.FC<{ nutrition: any }> = ({ nutrition }) => {
  const nutrients = [
    { label: 'Calories', value: nutrition?.calories, unit: '' },
    { label: 'Protein', value: nutrition?.protein, unit: 'g' },
    { label: 'Carbs', value: nutrition?.carbs, unit: 'g' },
    { label: 'Fat', value: nutrition?.fat, unit: 'g' },
    { label: 'Fiber', value: nutrition?.fiber, unit: 'g' },
    { label: 'Sugar', value: nutrition?.sugar, unit: 'g' },
    { label: 'Sodium', value: nutrition?.sodium, unit: 'mg' },
  ];

  const hasNutrition = nutrients.some(n => n.value !== undefined);

  if (!hasNutrition) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Nutrition information missing from source</p>
          <p className="text-sm text-muted-foreground mt-2">
            This product may not have complete nutritional data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {nutrients.map((nutrient) => (
        <Card key={nutrient.label}>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {nutrient.value !== undefined ? `${nutrient.value}${nutrient.unit}` : '—'}
              </p>
              <p className="text-sm text-muted-foreground">{nutrient.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Ingredients Panel Component
const IngredientsPanel: React.FC<{ 
  ingredients: string[]; 
  additives?: string[]; 
  allergens?: string[];
}> = ({ ingredients, additives, allergens }) => {
  const hasData = ingredients.length > 0 || (additives && additives.length > 0) || (allergens && allergens.length > 0);

  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Not provided by the manufacturer</p>
          <p className="text-sm text-muted-foreground mt-2">
            Ingredient information is not available for this product
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Additives of concern */}
      {additives && additives.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-orange-600 mb-2">Additives of concern</h3>
            <div className="flex flex-wrap gap-2">
              {additives.map((additive, index) => (
                <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-800">
                  {additive}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allergens */}
      {allergens && allergens.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-red-600 mb-2">Contains allergens</h3>
            <div className="flex flex-wrap gap-2">
              {allergens.map((allergen, index) => (
                <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                  {allergen}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingredients list */}
      {ingredients.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Ingredients</h3>
            <ul className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Health Panel Component
const HealthPanel: React.FC<{ 
  healthFlags: Array<{ type: 'danger' | 'warning' | 'good'; title: string; description?: string; icon?: string }>; 
  healthScore: number | null;
  nova?: number;
}> = ({ healthFlags, healthScore, nova }) => {
  const hasFlags = healthFlags.length > 0;
  const hasScore = healthScore !== null;

  if (!hasFlags && !hasScore) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">We don't have enough evidence to assess this item yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Check back as our database continues to grow
          </p>
        </CardContent>
      </Card>
    );
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600 bg-green-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getFlagStyle = (type: string) => {
    switch (type) {
      case 'danger':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'good':
        return 'border-green-200 bg-green-50 text-green-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Health Score */}
      {hasScore && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Health Score</h3>
              <div className={`px-3 py-1 rounded-full font-bold ${getHealthScoreColor(healthScore!)}`}>
                {healthScore}/10
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NOVA Classification */}
      {nova && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Processing Level</h3>
                <p className="text-sm text-muted-foreground">NOVA Group {nova}</p>
              </div>
              <Badge variant={nova >= 3 ? 'destructive' : 'secondary'}>
                {nova === 1 ? 'Unprocessed' : 
                 nova === 2 ? 'Minimally processed' :
                 nova === 3 ? 'Processed' : 'Ultra-processed'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Flags */}
      {hasFlags && (
        <div className="space-y-3">
          {healthFlags.map((flag, index) => (
            <Card key={index} className={`border ${getFlagStyle(flag.type)}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {flag.icon && (
                    <span className="text-lg">{flag.icon}</span>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{flag.title}</h4>
                    {flag.description && (
                      <p className="text-sm opacity-80 mt-1">{flag.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConfirmFoodLog;