import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Edit, Edit3, Trash2, AlertTriangle, Info, CheckCircle, X, MinusCircle, FileText, Plus, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FoodEditScreen from './FoodEditScreen';
import { ReminderToggle } from './reminder/ReminderToggle';
import { ManualIngredientEntry } from './camera/ManualIngredientEntry';
import { useIngredientAlert } from '@/hooks/useIngredientAlert';
import { useSmartCoachIntegration } from '@/hooks/useSmartCoachIntegration';
import { useSound } from '@/hooks/useSound';
import { supabase } from '@/integrations/supabase/client';

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
  barcode?: string;
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  source?: string; // Nutrition data source (gpt-individual, gpt-fallback, generic-fallback)
  confidence?: number; // Confidence score for the nutrition estimation
}

interface FoodConfirmationCardProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (foodItem: FoodItem) => void;
  onSkip?: () => void; // Skip functionality (now "Don't Log")
  foodItem: FoodItem | null;
  showSkip?: boolean; // Whether to show "Don't Log" button
  currentIndex?: number; // Current item index for multi-item flow
  totalItems?: number; // Total items for multi-item flow
  isProcessingFood?: boolean; // Whether the parent is processing the food item
  onVoiceAnalyzingComplete?: () => void; // Callback to hide voice analyzing overlay
}

const FoodConfirmationCard: React.FC<FoodConfirmationCardProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onSkip,
  foodItem,
  showSkip = false,
  currentIndex,
  totalItems,
  isProcessingFood = false,
  onVoiceAnalyzingComplete
}) => {
  const [portionPercentage, setPortionPercentage] = useState([100]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentFoodItem, setCurrentFoodItem] = useState<FoodItem | null>(foodItem);
  const [isChecked, setIsChecked] = useState(false);
  const [showManualIngredientEntry, setShowManualIngredientEntry] = useState(false);
  const [manualIngredients, setManualIngredients] = useState('');
  const [qualityData, setQualityData] = useState<any>(null);
  const [isEvaluatingQuality, setIsEvaluatingQuality] = useState(false);
  const [showQualityDetails, setShowQualityDetails] = useState(false);
  const { toast } = useToast();
  const { checkIngredients, flaggedIngredients, isLoading: isCheckingIngredients } = useIngredientAlert();
  const { triggerCoachResponseForIngredients } = useSmartCoachIntegration();
  const { playFoodLogConfirm } = useSound();

  // Check if this is an unknown product that needs manual entry
  const isUnknownProduct = (currentFoodItem as any)?.isUnknownProduct;
  const hasBarcode = !!(currentFoodItem as any)?.barcode;

  // Update currentFoodItem when foodItem prop changes
  React.useEffect(() => {
    // Clear current food item first to prevent showing old data
    if (foodItem !== currentFoodItem) {
      setCurrentFoodItem(null);
      
      // Brief delay to ensure clean transition in multi-item flow
      const timer = setTimeout(() => {
        setCurrentFoodItem(foodItem);
        setIsChecked(false); // Reset checkbox when new food item is loaded
        setManualIngredients(''); // Reset manual ingredients
        
        // Auto-check ingredients if available
        if (foodItem?.ingredientsText && foodItem.ingredientsText.length > 0) {
          checkIngredients(foodItem.ingredientsText);
        }
      }, 100); // 100ms delay for smooth transition
      
      return () => clearTimeout(timer);
    } else {
      setCurrentFoodItem(foodItem);
      setIsChecked(false);
      setManualIngredients('');
      
      if (foodItem?.ingredientsText && foodItem.ingredientsText.length > 0) {
        checkIngredients(foodItem.ingredientsText);
      }
    }
  }, [foodItem, currentFoodItem, checkIngredients]);

  // Trigger coach response when flagged ingredients are detected
  React.useEffect(() => {
    if (flaggedIngredients.length > 0 && currentFoodItem) {
      // Mock coach message callback for demo
      const handleCoachMessage = (message: any) => {
        console.log('Coach response triggered for flagged ingredients:', message);
      };
      
      triggerCoachResponseForIngredients(flaggedIngredients, handleCoachMessage);
    }
  }, [flaggedIngredients, currentFoodItem, triggerCoachResponseForIngredients]);

  // Hide voice analyzing overlay when confirmation modal is fully mounted and open
  React.useEffect(() => {
    if (isOpen && currentFoodItem && onVoiceAnalyzingComplete) {
      // Small delay to ensure the modal is fully rendered before hiding the overlay
      const timer = setTimeout(() => {
        onVoiceAnalyzingComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentFoodItem, onVoiceAnalyzingComplete]);

  const portionMultiplier = portionPercentage[0] / 100;
  
  const adjustedFood = {
    ...currentFoodItem,
    calories: Math.round(currentFoodItem.calories * portionMultiplier),
    protein: Math.round(currentFoodItem.protein * portionMultiplier * 10) / 10,
    carbs: Math.round(currentFoodItem.carbs * portionMultiplier * 10) / 10,
    fat: Math.round(currentFoodItem.fat * portionMultiplier * 10) / 10,
    fiber: Math.round(currentFoodItem.fiber * portionMultiplier * 10) / 10,
    sugar: Math.round(currentFoodItem.sugar * portionMultiplier * 10) / 10,
    sodium: Math.round(currentFoodItem.sodium * portionMultiplier),
  };

  const getHealthScore = (food: FoodItem) => {
    let score = 70; // Base score
    
    // Positive factors
    if (food.fiber > 5) score += 10; // High fiber
    if (food.protein > 15) score += 5; // Good protein
    if (food.sodium < 300) score += 10; // Low sodium
    if (food.sugar < 10) score += 5; // Low sugar
    
    // Negative factors
    if (food.sodium > 800) score -= 15; // High sodium
    if (food.sugar > 20) score -= 10; // High sugar
    if (food.calories > 500) score -= 5; // High calorie
    
    return Math.max(0, Math.min(100, score));
  };

  const getHealthBadge = (score: number) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default', bgColor: 'bg-green-500', emoji: '🟢' };
    if (score >= 50) return { label: 'Moderate', variant: 'secondary', bgColor: 'bg-yellow-500', emoji: '🟡' };
    return { label: 'Poor', variant: 'destructive', bgColor: 'bg-red-500', emoji: '🔴' };
  };

  const getHealthFlags = (food: FoodItem) => {
    const flags = [];
    
    if (food.fiber > 5) flags.push({ emoji: '🥦', label: 'High Fiber', positive: true });
    if (food.sodium > 800) flags.push({ emoji: '🧂', label: 'High Sodium', positive: false });
    if (food.sugar > 15) flags.push({ emoji: '🍯', label: 'High Sugar', positive: false });
    if (food.protein > 20) flags.push({ emoji: '🥩', label: 'High Protein', positive: true });
    
    // Mock some additional flags for demo
    if (food.name.toLowerCase().includes('organic')) flags.push({ emoji: '🌱', label: 'Organic', positive: true });
    if (food.name.toLowerCase().includes('processed')) flags.push({ emoji: '🥼', label: 'Processed', positive: false });
    
    return flags;
  };

  // Meal Quality Evaluation Functions
  const evaluateMealQuality = async (nutritionLogId: string) => {
    if (!nutritionLogId) return;
    
    setIsEvaluatingQuality(true);
    try {
      console.log('Evaluating meal quality for nutrition log:', nutritionLogId);
      
      const { data, error } = await supabase.functions.invoke('evaluate-meal-quality', {
        body: { nutrition_log_id: nutritionLogId }
      });

      if (error) {
        console.error('Error evaluating meal quality:', error);
        return;
      }

      console.log('Meal quality evaluation result:', data);
      setQualityData(data);
      
      // Show toast if score is particularly good or concerning
      if (data.quality_score >= 85) {
        toast({
          title: "🌟 Excellent Food Choice!",
          description: `Quality score: ${data.quality_score}/100 - ${data.quality_verdict}`,
          duration: 4000,
        });
      } else if (data.quality_score < 50) {
        toast({
          title: "⚠️ Consider Healthier Options",
          description: `Quality score: ${data.quality_score}/100 - Consider the flagged ingredients`,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Failed to evaluate meal quality:', error);
    } finally {
      setIsEvaluatingQuality(false);
    }
  };

  const getProcessingLevelBadge = (level: string) => {
    switch (level) {
      case 'whole':
        return { label: 'Whole Food', color: 'bg-green-500', textColor: 'text-white' };
      case 'minimally_processed':
        return { label: 'Minimally Processed', color: 'bg-green-400', textColor: 'text-white' };
      case 'processed':
        return { label: 'Processed', color: 'bg-yellow-500', textColor: 'text-white' };
      case 'ultra_processed':
        return { label: 'Ultra-Processed', color: 'bg-red-500', textColor: 'text-white' };
      default:
        return { label: 'Unknown', color: 'bg-gray-400', textColor: 'text-white' };
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleConfirm = async () => {
    // Prevent double-processing
    if (isConfirming || isProcessingFood) {
      console.log('⚠️ Already processing, ignoring duplicate confirm request');
      return;
    }
    
    setIsConfirming(true);
    
    try {
      console.log('🍽️ Starting food confirmation process');
      
      // Add 10-second timeout wrapper around onConfirm
      const confirmPromise = new Promise<void>((resolve, reject) => {
        try {
          onConfirm(adjustedFood);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('CONFIRM_TIMEOUT: Food logging took too long (10s limit)'));
        }, 10000);
      });
      
      // Race the confirm call with timeout
      await Promise.race([confirmPromise, timeoutPromise]);
      
      // Success animation delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Play food log confirmation sound
      console.log('🔊 Attempting to play food log confirmation sound');
      playFoodLogConfirm().catch(error => {
        console.warn('🔊 Food log sound failed:', error);
      });
      
      // Evaluate meal quality after logging
      // Note: We need the nutrition_log_id, which should be returned from onConfirm
      // For now, we'll simulate this - in a real implementation, onConfirm should return the created log ID
      setTimeout(async () => {
        // This is a temporary solution - in production, onConfirm should return the nutrition log ID
        try {
          const { data: recentLogs, error } = await supabase
            .from('nutrition_logs')
            .select('id')
            .eq('food_name', adjustedFood.name)
            .order('created_at', { ascending: false })
            .limit(1);

          if (recentLogs && recentLogs.length > 0) {
            await evaluateMealQuality(recentLogs[0].id);
          }
        } catch (error) {
          console.error('Failed to find recent nutrition log for quality evaluation:', error);
        }
      }, 1000);
      
      // Show success toast with animation
      toast({
        title: `✅ ${adjustedFood.name} logged successfully`,
        description: `${adjustedFood.calories} calories added to your nutrition log.`,
        duration: 3000,
      });
      
      // Don't call onClose() for multi-item flows to prevent jumping to home
      if (!totalItems || totalItems <= 1) {
        onClose();
      }
      
    } catch (error) {
      console.error('❌ Food confirmation failed:', error);
      
      // Handle timeout errors
      if (error.message?.includes('CONFIRM_TIMEOUT')) {
        toast({
          title: "⏰ Logging Timeout",
          description: "Food logging took too long. Please try again.",
          duration: 4000,
        });
      } else {
        toast({
          title: "❌ Logging Failed",
          description: "Failed to log food item. Please try again.",
          duration: 4000,
        });
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleEditSave = (updatedFood: FoodItem, logTime: Date, note: string) => {
    setCurrentFoodItem(updatedFood);
    toast({
      title: "Changes Saved",
      description: "Food details updated successfully.",
    });
  };

  const handleManualIngredientSubmit = async (ingredientsText: string) => {
    setManualIngredients(ingredientsText);
    
    // Update the current food item with manual ingredients
    if (currentFoodItem) {
      setCurrentFoodItem({
        ...currentFoodItem,
        ingredientsText,
        ingredientsAvailable: true
      });
    }
    
    // Check the manually entered ingredients
    await checkIngredients(ingredientsText);
    
    setShowManualIngredientEntry(false);
    toast({
      title: "Ingredients Added",
      description: "Successfully checked for harmful ingredients.",
    });
  };

  const isFromBarcode = currentFoodItem?.barcode ? true : false;
  const hasIngredients = currentFoodItem?.ingredientsAvailable && 
    (currentFoodItem?.ingredientsText?.length || 0) > 0;
  const needsManualIngredients = isFromBarcode && !hasIngredients;

  const healthScore = getHealthScore(currentFoodItem);
  const healthBadge = getHealthBadge(healthScore);
  const healthFlags = getHealthFlags(currentFoodItem);

  const getPortionLabel = (percentage: number) => {
    if (percentage === 0) return 'None';
    if (percentage === 25) return 'Quarter';
    if (percentage === 50) return 'Half';
    if (percentage === 75) return 'Three-quarters';
    if (percentage === 100) return 'Full portion';
    return `${percentage}%`;
  };

  // Show loading state during transition in multi-item flow
  if (!currentFoodItem && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={totalItems && totalItems > 1 ? undefined : onClose}>
        <DialogContent 
          showCloseButton={false}
          className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden"
        >
          <div className="p-6 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full mb-4">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Loading next item...
              </p>
              {totalItems > 1 && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Item {((currentIndex ?? 0) + 1)} of {totalItems}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={totalItems && totalItems > 1 ? undefined : onClose}>
        <DialogContent 
          showCloseButton={false}
          className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden"
        >
          <div className="p-6">
            {/* Unknown Product Alert */}
            {isUnknownProduct && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                      Product Not Found
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                      Barcode {hasBarcode ? `${(currentFoodItem as any).barcode}` : ''} was not found in our database. Please add the product details manually.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setIsEditOpen(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Add Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowManualIngredientEntry(true)}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Add Ingredients
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogHeader className="text-center mb-4 relative">
              {/* Edit Button - Top Right Only */}
              <div className="absolute -top-2 -right-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 px-2 text-xs border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>

              {/* Save/Confirm button with visual feedback */}
              <button
                onClick={() => setIsChecked(!isChecked)}
                className={`absolute -top-2.5 -left-2.5 w-10 h-10 rounded-full border-2 transition-all duration-300 flex items-center justify-center hover:scale-105 ${
                  isChecked 
                    ? 'bg-green-500 border-green-500 text-white shadow-lg transform scale-110' 
                    : 'bg-emerald-50 border-emerald-300 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-800/30'
                }`}
              >
                <span className="text-lg">
                  {isChecked ? '✅' : '💾'}
                </span>
              </button>
              
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {totalItems > 1 && (
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                    Item {((currentIndex ?? 0) + 1)} of {totalItems}
                  </div>
                )}
                Confirm Food Log
              </DialogTitle>
            </DialogHeader>

            {/* Food Item Display */}
            <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
              {currentFoodItem.image ? (
                <img 
                  src={currentFoodItem.image} 
                  alt={currentFoodItem.name}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  {currentFoodItem.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {adjustedFood.calories} calories
                </p>
              </div>
            </div>

            {/* Portion Size Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Portion Size
                </label>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {getPortionLabel(portionPercentage[0])}
                </span>
              </div>
              <Slider
                value={portionPercentage}
                onValueChange={setPortionPercentage}
                max={100}
                min={0}
                step={25}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Manual Ingredient Entry Alert for Barcode Items */}
            {needsManualIngredients && (
              <div className="mb-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                        No ingredients detected
                      </h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                        We found nutrition info but no ingredients list. Add ingredients manually to check for harmful additives, allergens, and other concerning ingredients.
                      </p>
                      <Button
                        onClick={() => setShowManualIngredientEntry(true)}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ingredients
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ingredient Status for Barcode Items */}
            {isFromBarcode && hasIngredients && (
              <div className="mb-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Ingredients detected and analyzed
                    </span>
                    {flaggedIngredients.length > 0 && (
                      <Badge variant="destructive" className="text-xs ml-2">
                        {flaggedIngredients.length} flagged
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs for Nutrition and Health */}
            <Tabs defaultValue="nutrition" className="mb-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <TabsTrigger value="nutrition" className="rounded-lg">Nutrition</TabsTrigger>
                <TabsTrigger value="health" className="rounded-lg">Health Check</TabsTrigger>
                <TabsTrigger value="ingredients" className="rounded-lg">Ingredients</TabsTrigger>
              </TabsList>
              
              <TabsContent value="nutrition" className="space-y-3 mt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <div className="text-lg">🥩</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {adjustedFood.protein}g
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Protein</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <div className="text-lg">🍞</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {adjustedFood.carbs}g
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Carbs</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div className="text-lg">🧈</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {adjustedFood.fat}g
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Fat</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Fiber</span>
                    <span className="font-medium">{adjustedFood.fiber}g</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Sugar</span>
                    <span className="font-medium">{adjustedFood.sugar}g</span>
                  </div>
                </div>

                {/* Debug Info - Nutrition Source */}
                {currentFoodItem.source && (
                  <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                      📊 Nutrition source: <span className="font-mono text-blue-600 dark:text-blue-400">{currentFoodItem.source}</span>
                      {currentFoodItem.confidence && (
                        <span className="ml-2">• Confidence: {currentFoodItem.confidence}%</span>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="health" className="space-y-4 mt-4">
                {/* Meal Quality Section */}
                {qualityData ? (
                  <div className="space-y-4">
                    {/* Quality Score Display */}
                    <div className="text-center">
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center justify-center gap-3 mb-3">
                          <Award className="h-6 w-6 text-purple-600" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Meal Quality Analysis
                          </h3>
                        </div>
                        
                        {/* Score Circle and Verdict */}
                        <div className="flex items-center justify-center gap-4">
                          <div className="relative w-20 h-20">
                            <Progress 
                              value={qualityData.quality_score} 
                              className="w-20 h-20 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`text-xl font-bold ${getQualityScoreColor(qualityData.quality_score)}`}>
                                {qualityData.quality_score}
                              </span>
                            </div>
                          </div>
                          <div className="text-center">
                            <Badge 
                              className={`text-sm font-medium px-3 py-1 ${
                                qualityData.quality_verdict === 'Excellent' ? 'bg-green-500 text-white' :
                                qualityData.quality_verdict === 'Good' ? 'bg-blue-500 text-white' :
                                qualityData.quality_verdict === 'Moderate' ? 'bg-yellow-500 text-white' :
                                'bg-red-500 text-white'
                              }`}
                            >
                              {qualityData.quality_verdict}
                            </Badge>
                            {qualityData.processing_level && (
                              <div className="mt-2">
                                <Badge 
                                  className={`text-xs ${getProcessingLevelBadge(qualityData.processing_level).color} ${getProcessingLevelBadge(qualityData.processing_level).textColor}`}
                                >
                                  {getProcessingLevelBadge(qualityData.processing_level).label}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quality Reasons - Expandable */}
                    {qualityData.quality_reasons && qualityData.quality_reasons.length > 0 && (
                      <Collapsible open={showQualityDetails} onOpenChange={setShowQualityDetails}>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-between"
                          >
                            <span>Quality Analysis Details</span>
                            {showQualityDetails ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-3">
                          {qualityData.quality_reasons.map((reason: string, index: number) => (
                            <div 
                              key={index}
                              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                                reason.includes('High') && (reason.includes('protein') || reason.includes('fiber')) ||
                                reason.includes('Excellent') || reason.includes('Good') || reason.includes('Whole food')
                                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                                  : reason.includes('Low') || reason.includes('Contains') || reason.includes('High sodium') || reason.includes('High sugar')
                                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
                              }`}
                            >
                              <span className="text-base">
                                {reason.includes('High') && (reason.includes('protein') || reason.includes('fiber')) ||
                                 reason.includes('Excellent') || reason.includes('Good') || reason.includes('Whole food') ? '✅' :
                                 reason.includes('Low') || reason.includes('Contains') || reason.includes('High sodium') || reason.includes('High sugar') ? '⚠️' : 'ℹ️'}
                              </span>
                              <span className="font-medium">{reason}</span>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Loading or Initial State */}
                    {isEvaluatingQuality ? (
                      <div className="text-center py-6">
                        <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Analyzing meal quality...
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Fallback to original health score display */}
                        <div className="text-center">
                          <Badge className={`${healthBadge.bgColor} text-white font-medium px-4 py-2 text-sm rounded-full inline-flex items-center space-x-2`}>
                            <span>{healthBadge.emoji}</span>
                            <span>{healthBadge.label}</span>
                            <span className="text-xs">({healthScore}/100)</span>
                          </Badge>
                        </div>
                        
                        {/* Health Flags - Improved Layout */}
                        <div className="space-y-2">
                          {healthFlags.length > 0 ? (
                            healthFlags.map((flag, index) => (
                              <div 
                                key={index}
                                className={`flex items-center space-x-3 p-3 rounded-lg ${
                                  flag.positive 
                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                    : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                                }`}
                              >
                                <span className="text-lg">{flag.emoji}</span>
                                <span className={`text-sm font-medium ${
                                  flag.positive ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'
                                }`}>
                                  {flag.label}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                No specific health flags detected
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="ingredients" className="space-y-4 mt-4">
                {hasIngredients ? (
                  <div className="space-y-3">
                    {/* Flagged Ingredients Alert */}
                    {flaggedIngredients.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                              ⚠️ {flaggedIngredients.length} Concerning Ingredient{flaggedIngredients.length > 1 ? 's' : ''} Found
                            </p>
                            <div className="space-y-1">
                              {flaggedIngredients.slice(0, 3).map((ingredient, index) => (
                                <div key={index} className="text-xs text-red-700 dark:text-red-300">
                                  <span className="font-medium">{ingredient.name}</span> - {ingredient.description}
                                </div>
                              ))}
                              {flaggedIngredients.length > 3 && (
                                <p className="text-xs text-red-700 dark:text-red-300">
                                  +{flaggedIngredients.length - 3} more flagged ingredients
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ingredients Text Display */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Ingredients List:
                      </h4>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        {currentFoodItem?.ingredientsText || manualIngredients}
                      </p>
                    </div>

                    {flaggedIngredients.length === 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-green-800 dark:text-green-200">
                            ✅ No concerning ingredients detected
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      No ingredients information available
                    </p>
                    {isFromBarcode && (
                      <Button
                        onClick={() => setShowManualIngredientEntry(true)}
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ingredients Manually
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Reminder Toggle */}
            <ReminderToggle
              foodName={currentFoodItem.name}
              foodData={{
                food_name: currentFoodItem.name,
                calories: adjustedFood.calories,
                protein: adjustedFood.protein,
                carbs: adjustedFood.carbs,
                fat: adjustedFood.fat,
                fiber: adjustedFood.fiber,
                sugar: adjustedFood.sugar,
                sodium: adjustedFood.sodium,
              }}
              className="mb-4"
            />

            {/* Bottom Action Buttons - New Clean Layout */}
            <div className="space-y-3">
              {totalItems && totalItems > 1 ? (
                // Multi-Item Layout
                <>
                  <div className="flex space-x-3">
                    {/* Don't Log - Left Half */}
                    {showSkip && onSkip && (
                      <Button
                        variant="outline"
                        onClick={onSkip}
                        className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      >
                        <MinusCircle className="h-4 w-4 mr-2" />
                        Don't Log
                      </Button>
                    )}
                    
                    {/* Cancel All - Right Half */}
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel All
                    </Button>
                  </div>
                  
                  {/* Log Item - Full Width Primary */}
                  <Button
                    onClick={handleConfirm}
                    disabled={isConfirming || isProcessingFood || portionPercentage[0] === 0}
                    className={`w-full h-12 text-lg font-semibold transition-all duration-300 ${
                      !isConfirming && !isProcessingFood && portionPercentage[0] > 0
                        ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white hover:scale-105 shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } ${(isConfirming || isProcessingFood) ? 'animate-pulse' : ''}`}
                  >
                    {isConfirming || isProcessingFood ? (
                      <>
                        <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full" />
                        Logging...
                      </>
                    ) : (
                      `Log Item ${(currentIndex || 0) + 1} of ${totalItems}`
                    )}
                  </Button>
                </>
              ) : (
                // Single-Item Layout
                <>
                  {/* Cancel - Full Width Red Text */}
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full border-gray-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Cancel
                  </Button>
                  
                  {/* Log Food - Full Width Primary */}
                  <Button
                    onClick={handleConfirm}
                    disabled={isConfirming || portionPercentage[0] === 0}
                    className={`w-full h-12 text-lg font-semibold transition-all duration-300 ${
                      !isConfirming && portionPercentage[0] > 0
                        ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white hover:scale-105 shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } ${isConfirming ? 'animate-pulse' : ''}`}
                  >
                    {isConfirming ? (
                      <>
                        <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full" />
                        Logging...
                      </>
                    ) : (
                      'Log Food'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Screen */}
      <FoodEditScreen
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleEditSave}
        foodItem={currentFoodItem}
      />

      {/* Manual Ingredient Entry */}
      <ManualIngredientEntry
        isOpen={showManualIngredientEntry}
        onClose={() => setShowManualIngredientEntry(false)}
        onIngredientsSubmit={handleManualIngredientSubmit}
        productName={currentFoodItem?.name || ''}
      />
    </>
  );
};

export default FoodConfirmationCard;
