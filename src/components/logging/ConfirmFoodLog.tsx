import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, X } from 'lucide-react';
import { NormalizedProduct } from '@/lib/food/types';
import { computeHealth } from '@/lib/health/computeHealth';

type Props = {
  open: boolean;
  product: NormalizedProduct | null;
  onClose: () => void;
  onConfirm: (scaled: NormalizedProduct, portionMultiplier: number) => Promise<void>;
};

const EmptyState: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-center text-muted-foreground py-8">
    {title}
  </div>
);

export const ConfirmFoodLog: React.FC<Props> = ({
  open,
  product,
  onClose,
  onConfirm
}) => {
  const [portionPct, setPortionPct] = useState(100);
  const [isLogging, setIsLogging] = useState(false);

  // Health data with client fallback
  const health = useMemo(() => {
    if (!product) return undefined;
    if (product.health?.flags?.length) return product.health;
    // fallback compute (covers any server miss)
    return computeHealth(product);
  }, [product]);

  // Scale nutrition values by portion
  const scaled = useMemo(() => {
    if (!product?.nutrition) return {};
    const factor = portionPct / 100;
    return {
      calories: product.nutrition.calories ? Math.round(product.nutrition.calories * factor) : undefined,
      protein_g: product.nutrition.protein_g ? Math.round(product.nutrition.protein_g * factor * 10) / 10 : undefined,
      carbs_g: product.nutrition.carbs_g ? Math.round(product.nutrition.carbs_g * factor * 10) / 10 : undefined,
      fat_g: product.nutrition.fat_g ? Math.round(product.nutrition.fat_g * factor * 10) / 10 : undefined,
      sugar_g: product.nutrition.sugar_g ? Math.round(product.nutrition.sugar_g * factor * 10) / 10 : undefined,
      fiber_g: product.nutrition.fiber_g ? Math.round(product.nutrition.fiber_g * factor * 10) / 10 : undefined,
      sodium_mg: product.nutrition.sodium_mg ? Math.round(product.nutrition.sodium_mg * factor) : undefined,
    };
  }, [product, portionPct]);

  if (!product) return null;

  const handleConfirm = async () => {
    setIsLogging(true);
    console.log('[LOG] portion_change', { pct: portionPct });
    
    try {
      const scaledProduct: NormalizedProduct = {
        ...product,
        nutrition: { ...product.nutrition, ...scaled }
      };
      await onConfirm(scaledProduct, portionPct / 100);
    } catch (error) {
      console.error('Failed to log food:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const renderNutritionValue = (value?: number, unit = 'g') => {
    return value !== undefined ? `${value}${unit}` : '—';
  };

  const getHealthScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-500';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getFlagColor = (level: string) => {
    switch (level) {
      case 'danger': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ok': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const hasList = !!product?.ingredients?.length;
  const hasText = !!product?.ingredients_text;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="flex-1 text-center">
            {product.brand && <span className="text-muted-foreground">{product.brand} </span>}
            {product.name}
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Portion Slider */}
        <div className="flex-shrink-0 p-4 border-b">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Portion Size</span>
              <span className="text-sm text-muted-foreground">{portionPct}%</span>
            </div>
            <Slider
              value={[portionPct]}
              onValueChange={(value) => setPortionPct(value[0])}
              min={25}
              max={200}
              step={25}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>25%</span>
              <span>50%</span>
              <span>100%</span>
              <span>150%</span>
              <span>200%</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="nutrition" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="health">Health Check</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="nutrition" className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {renderNutritionValue(scaled.calories, '')}
                      </div>
                      <div className="text-sm text-muted-foreground">Calories</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {renderNutritionValue(scaled.protein_g)}
                      </div>
                      <div className="text-sm text-muted-foreground">Protein</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {renderNutritionValue(scaled.carbs_g)}
                      </div>
                      <div className="text-sm text-muted-foreground">Carbs</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {renderNutritionValue(scaled.fat_g)}
                      </div>
                      <div className="text-sm text-muted-foreground">Fat</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {renderNutritionValue(scaled.fiber_g)}
                      </div>
                      <div className="text-sm text-muted-foreground">Fiber</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-pink-600">
                        {renderNutritionValue(scaled.sugar_g)}
                      </div>
                      <div className="text-sm text-muted-foreground">Sugar</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="col-span-2">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {renderNutritionValue(scaled.sodium_mg, 'mg')}
                      </div>
                      <div className="text-sm text-muted-foreground">Sodium</div>
                    </CardContent>
                  </Card>
                </div>
                
                {!Object.values(scaled).some(v => v !== undefined) && (
                  <EmptyState title="Nutrition missing from source" />
                )}
              </TabsContent>

              <TabsContent value="ingredients" className="space-y-4 p-4">
                {product.additives && product.additives.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-amber-700">Additives of Concern</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {product.additives.map((additive, index) => (
                          <Badge key={index} variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                            {additive}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ingredients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!hasList && !hasText ? (
                      <EmptyState title="No ingredients information available" />
                    ) : hasList ? (
                      <ul className="space-y-1">
                        {product.ingredients.map((ingredient, index) => (
                          <li key={index} className="text-sm flex items-start">
                            <span className="mr-2">•</span>
                            <span>{ingredient}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{product.ingredients_text}</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="health" className="space-y-4 p-4">
                {health?.score !== undefined && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getHealthScoreColor(health.score)}`}>
                          {health.score}
                        </div>
                        <div>
                          <div className="font-medium">Health Score</div>
                          <div className="text-sm text-muted-foreground">
                            {health.score >= 80 ? 'Excellent' : 
                             health.score >= 60 ? 'Moderate' : 'Poor'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {health?.flags && health.flags.length > 0 ? (
                  <div className="space-y-3">
                    {health.flags.map((flag, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getFlagColor(flag.level)}`}>
                            {flag.label}
                          </div>
                          {flag.details && (
                            <p className="text-sm text-muted-foreground mt-2">{flag.details}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={
                    health?.score === undefined ? 
                      "Data unavailable" :
                      "No specific health concerns identified"
                  } />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLogging} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {isLogging ? 'Logging...' : 'Log Food'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};