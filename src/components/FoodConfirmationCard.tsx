import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogHeader, DialogClose } from '@/components/ui/dialog';
import AccessibleDialogContent from '@/components/a11y/AccessibleDialogContent';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Edit, Edit3, Trash2, AlertTriangle, Info, CheckCircle, X, MinusCircle, FileText, Plus, ChevronDown, ChevronUp, Award, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FoodEditScreen from './FoodEditScreen';
import { ReminderToggle } from './reminder/ReminderToggle';
import { ManualIngredientEntry } from './camera/ManualIngredientEntry';
import { useIngredientAlert } from '@/hooks/useIngredientAlert';
import { useSmartCoachIntegration } from '@/hooks/useSmartCoachIntegration';
import { useSound } from '@/hooks/useSound';
import { SoundGate } from '@/lib/soundGate';
import { supabase } from '@/integrations/supabase/client';
import { detectFlags } from '@/lib/health/flagger';
import type { NutritionThresholds } from '@/lib/health/flagRules';
import { useNutritionStore } from '@/stores/nutritionStore';

// Fallback emoji component
const FallbackEmoji: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
    <span className="text-2xl">🍽️</span>
  </div>
);

interface FoodItem {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  image?: string;
  imageUrl?: string;
  barcode?: string;
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  source?: string;
  confidence?: number;
  allergens?: string[];
  additives?: string[];
  categories?: string[];
  _provider?: string;
  basePer100?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  } | null;
  portionGrams?: number | null;
  factor?: number;
  grams?: number;
  nutrition?: {
    perGram?: Partial<Record<'calories'|'protein'|'carbs'|'fat'|'sugar'|'fiber'|'sodium', number>>;
  };
}

interface FoodConfirmationCardProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (foodItem: FoodItem) => void;
  onSkip?: () => void;
  onCancelAll?: () => void;
  foodItem: FoodItem | null;
  showSkip?: boolean;
  currentIndex?: number;
  totalItems?: number;
  isProcessingFood?: boolean;
  onVoiceAnalyzingComplete?: () => void;
}

// Empty fallbacks that don't change the hook count
const EMPTY_PG: Record<string, number> = Object.freeze({});
const EMPTY_ITEM: FoodItem = Object.freeze({ 
  id: '__nil__', 
  name: 'Unknown Item',
  calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0,
  portionGrams: 100,
  grams: 0, 
  nutrition: { perGram: EMPTY_PG },
  image: undefined,
  imageUrl: undefined,
  basePer100: null,
  factor: 1,
  barcode: undefined,
  ingredientsText: undefined,
  ingredientsAvailable: false,
  source: undefined
});

const CONFIRM_FIX_REV = "2025-08-31T15:43Z-r11";

const FoodConfirmationCard: React.FC<FoodConfirmationCardProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onSkip,
  onCancelAll,
  foodItem: _foodItem,
  showSkip = false,
  currentIndex,
  totalItems,
  isProcessingFood = false,
  onVoiceAnalyzingComplete
}) => {
  // State hooks MUST come first - never conditional
  const [portionPercentage, setPortionPercentage] = useState([100]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEvaluatingQuality, setIsEvaluatingQuality] = useState(false);
  const [mealQuality, setMealQuality] = useState<any>(null);
  const [ingredientFlags, setIngredientFlags] = useState<any[]>([]);
  const [currentFoodItemInternal, setCurrentFoodItemInternal] = useState<FoodItem | null>(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [showIngredientEntry, setShowIngredientEntry] = useState(false);
  const [isProcessingIngredients, setIsProcessingIngredients] = useState(false);
  const { toast } = useToast();

  // NEVER short-circuit before hooks; normalize props first
  const item = _foodItem ?? EMPTY_ITEM;
  const id = item.id ?? '__nil__';

  // Selector must be stable across renders
  const selectPerGram = useCallback(
    (s: any) => s.byId?.[id]?.perGram,
    [id]
  );

  // Always call the store hook – even for the __nil__ id
  const storePerGram = useNutritionStore(selectPerGram);

  // Prefer store; fallback to props; always defined
  const perGram = storePerGram ?? item.nutrition?.perGram ?? EMPTY_PG;

  const grams = (item.portionGrams ?? 100) * (portionPercentage[0] / 100);

  const macros = useMemo(() => {
    const v = (k: keyof typeof perGram) => (perGram[k] ?? 0) * grams;
    return {
      calories: Math.round(v('calories')),
      protein: Math.round(v('protein') * 10) / 10,
      carbs: Math.round(v('carbs') * 10) / 10,
      fat: Math.round(v('fat') * 10) / 10,
      sugar: Math.round(v('sugar') * 10) / 10,
      fiber: Math.round(v('fiber') * 10) / 10,
      sodium: Math.round(v('sodium')),
    };
  }, [perGram, grams]);

  // From here down you can branch/render however you like
  const hasNutrition = Object.keys(perGram).length > 0;

  // Dev probe (safe)
  if (process.env.NODE_ENV === 'development') {
    const pgSum = Object.values(perGram).reduce((a: number, b: any) => a + (+b || 0), 0);
    console.log('[SST][CARD_BIND]', { id, pgSum, fromStore: !!storePerGram });
  }

  // Now safe to check if we should render anything
  if (!isOpen || id === '__nil__') {
    return null;
  }

  // Helper for scaling
  function scale(val: number, f: number) { return Math.round(val * f * 10) / 10; }

  // Calculate effective nutrients - use macros from store first, then basePer100, then fallback
  const base = item.basePer100;
  const gramsFactor = item.factor ?? 1;
  const sliderFraction = portionPercentage[0] / 100;

  const effective = hasNutrition ? macros : (base
    ? {
        calories: Math.round((base.calories || 0) * gramsFactor * sliderFraction),
        protein: scale(base.protein_g || 0, gramsFactor * sliderFraction),
        carbs:   scale(base.carbs_g   || 0, gramsFactor * sliderFraction),
        fat:     scale(base.fat_g     || 0, gramsFactor * sliderFraction),
        fiber:   scale(base.fiber_g   || 0, gramsFactor * sliderFraction),
        sugar:   scale(base.sugar_g   || 0, gramsFactor * sliderFraction),
        sodium:  Math.round((base.sodium_mg || 0) * gramsFactor * sliderFraction),
      }
    : {
        calories: Math.round(item.calories * sliderFraction),
        protein: Math.round(item.protein * sliderFraction * 10) / 10,
        carbs: Math.round(item.carbs * sliderFraction * 10) / 10,
        fat: Math.round(item.fat * sliderFraction * 10) / 10,
        fiber: Math.round(item.fiber * sliderFraction * 10) / 10,
        sugar: Math.round(item.sugar * sliderFraction * 10) / 10,
        sodium: Math.round(item.sodium * sliderFraction),
      });

  const adjustedFood = {
    ...item,
    ...effective,
  };

  const currentFoodItem = adjustedFood;

  // Set up the internal state
  useEffect(() => {
    setCurrentFoodItemInternal(currentFoodItem);
  }, [currentFoodItem]);

  // Voice analyzing complete callback
  useEffect(() => {
    if (isOpen && currentFoodItem) {
      const timer = setTimeout(() => {
        onVoiceAnalyzingComplete?.();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentFoodItem, onVoiceAnalyzingComplete]);

  const getHealthScore = (food: FoodItem) => {
    let score = 70;
    if (food.fiber > 5) score += 10;
    if (food.protein > 15) score += 5;
    if (food.sodium < 300) score += 10;
    if (food.sugar < 10) score += 5;
    if (food.sodium > 800) score -= 15;
    if (food.sugar > 20) score -= 10;
    if (food.calories > 500) score -= 5;
    return Math.max(0, Math.min(100, score));
  };

  const getHealthBadge = (score: number) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default', bgColor: 'bg-green-500', emoji: '🟢' };
    if (score >= 50) return { label: 'Moderate', variant: 'secondary', bgColor: 'bg-yellow-500', emoji: '🟡' };
    return { label: 'Poor', variant: 'destructive', bgColor: 'bg-red-500', emoji: '🔴' };
  };

  const getHealthFlags = (food: FoodItem) => {
    const ingredientsText = food.ingredientsText || '';
    const nutritionThresholds: NutritionThresholds = {
      sodium_mg_100g: food.sodium,
      sugar_g_100g: food.sugar,
      satfat_g_100g: food.fat * 0.3,
      fiber_g_100g: food.fiber,
      protein_g_100g: food.protein,
    };

    const flags = detectFlags(ingredientsText, nutritionThresholds);
    
    return flags.map(flag => ({
      emoji: flag.severity === 'good' ? '✅' : flag.severity === 'warning' ? '⚠️' : '🚫',
      label: flag.label,
      positive: flag.severity === 'good',
      description: flag.description
    }));
  };

  const healthScore = getHealthScore(currentFoodItem);
  const healthBadge = getHealthBadge(healthScore);
  const healthFlags = getHealthFlags(currentFoodItem);

  const handleConfirm = async () => {
    if (!currentFoodItem) return;
    
    setIsConfirming(true);
    
    try {
      const finalFood = {
        ...currentFoodItem,
        portionGrams: Math.round((currentFoodItem.portionGrams || 100) * (portionPercentage[0] / 100)),
        factor: portionPercentage[0] / 100
      };

      await onConfirm(finalFood);
    } catch (error) {
      console.error('Error confirming food:', error);
      toast({
        title: "Error",
        description: "Failed to confirm food item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AccessibleDialogContent 
        title={currentFoodItem.name}
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentFoodItem.image || currentFoodItem.imageUrl ? (
                  <img 
                    src={currentFoodItem.image || currentFoodItem.imageUrl} 
                    alt={currentFoodItem.name}
                    className="w-16 h-16 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <FallbackEmoji className="w-16 h-16 rounded-lg" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {currentFoodItem.name}
                </h2>
                {currentIndex !== undefined && totalItems !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Item {currentIndex + 1} of {totalItems}
                  </p>
                )}
              </div>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="p-6">
          <Tabs defaultValue="nutrition" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            </TabsList>

            <TabsContent value="nutrition" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="text-sm font-medium mb-3 block">
                        Portion Size: {portionPercentage[0]}%
                      </label>
                      <Slider
                        value={portionPercentage}
                        onValueChange={setPortionPercentage}
                        max={200}
                        min={25}
                        step={25}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>25%</span>
                        <span>100%</span>
                        <span>200%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{effective.calories}</div>
                        <div className="text-sm text-muted-foreground">Calories</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{effective.protein}g</div>
                        <div className="text-sm text-muted-foreground">Protein</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{effective.carbs}g</div>
                        <div className="text-sm text-muted-foreground">Carbs</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{effective.fat}g</div>
                        <div className="text-sm text-muted-foreground">Fat</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span>Fiber:</span>
                        <span className="font-medium">{effective.fiber}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sugar:</span>
                        <span className="font-medium">{effective.sugar}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sodium:</span>
                        <span className="font-medium">{effective.sodium}mg</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={healthBadge.variant as any} className="text-sm">
                        {healthBadge.emoji} {healthBadge.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Health Score: {healthScore}/100
                      </span>
                    </div>

                    {healthFlags.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Health Insights</h4>
                        <div className="space-y-1">
                          {healthFlags.map((flag, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span>{flag.emoji}</span>
                              <span className={flag.positive ? 'text-green-600' : 'text-amber-600'}>
                                {flag.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ingredients" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Ingredients</h4>
                      {currentFoodItem.barcode && (
                        <Badge variant="outline" className="text-xs">
                          Barcode: {currentFoodItem.barcode}
                        </Badge>
                      )}
                    </div>
                    
                    {currentFoodItem.ingredientsAvailable && currentFoodItem.ingredientsText ? (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {currentFoodItem.ingredientsText}
                      </p>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground mb-4">
                          No ingredients information available
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowIngredientEntry(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Ingredients
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-6">
            <Button 
              onClick={handleConfirm}
              disabled={isConfirming}
              className="flex-1"
            >
              {isConfirming ? "Confirming..." : "Confirm & Log"}
            </Button>
            
            {showSkip && (
              <Button 
                variant="outline" 
                onClick={onSkip}
                className="flex-1"
              >
                Don't Log
              </Button>
            )}
            
            {onCancelAll && (
              <Button 
                variant="ghost" 
                onClick={onCancelAll}
                className="px-4"
              >
                Cancel All
              </Button>
            )}
          </div>

          {currentFoodItem.source && (
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Nutrition data from: {currentFoodItem.source}
              </p>
            </div>
          )}
        </div>

        {showIngredientEntry && (
          <ManualIngredientEntry
            isOpen={showIngredientEntry}
            onClose={() => setShowIngredientEntry(false)}
            onIngredientsSubmit={(ingredients) => {
              setCurrentFoodItemInternal(prev => prev ? {
                ...prev,
                ingredientsText: ingredients,
                ingredientsAvailable: true
              } : null);
              setShowIngredientEntry(false);
            }}
            productName={currentFoodItem.name}
          />
        )}
      </AccessibleDialogContent>
    </Dialog>
  );
};

export default FoodConfirmationCard;