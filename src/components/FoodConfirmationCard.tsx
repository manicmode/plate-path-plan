import React, { useState, useEffect } from 'react';
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
  imageUrl?: string; // Add imageUrl property
  barcode?: string;
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  source?: string; // Nutrition data source (branded-database, usda, openfoodfacts, ai-estimate, etc.)
  confidence?: number; // Confidence score for the nutrition estimation
  // Additional data for flag detection from health report prefill
  allergens?: string[];
  additives?: string[];
  categories?: string[];
  _provider?: string;
  // Portion scaling context
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
  // Analysis data for Health Check
  analysis?: {
    healthScore?: number;
    flags?: Array<{ id?: string; label: string; level?: 'warn'|'info'|'good'|'danger'|'warning' }>;
    ingredients?: string[];
  };
}

interface FoodConfirmationCardProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (foodItem: FoodItem) => void;
  onSkip?: () => void; // Skip functionality (now "Don't Log")
  onCancelAll?: () => void; // Cancel all items functionality
  foodItem: FoodItem | null;
  showSkip?: boolean; // Whether to show "Don't Log" button
  currentIndex?: number; // Current item index for multi-item flow
  totalItems?: number; // Total items for multi-item flow
  isProcessingFood?: boolean; // Whether the parent is processing the food item
  onVoiceAnalyzingComplete?: () => void; // Callback to hide voice analyzing overlay
  skipNutritionGuard?: boolean; // when true, allow render without perGram readiness
  bypassHydration?: boolean; // NEW: bypass store hydration for barcode items
}

const CONFIRM_FIX_REV = "2025-08-31T15:43Z-r11";

const FoodConfirmationCard: React.FC<FoodConfirmationCardProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onSkip,
  onCancelAll,
  foodItem,
  showSkip = false,
  currentIndex,
  totalItems,
  isProcessingFood = false,
  onVoiceAnalyzingComplete,
  skipNutritionGuard = false,
  bypassHydration = false
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

  const [reminderOpen, setReminderOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Derive a stable ID from props (not from transient state)
  const foodId = foodItem?.id ?? null;

  // Zustand selector MUST run unconditionally on every render
  const storeAnalysis = useNutritionStore(
    s => (foodId ? s.byId[foodId] : undefined)
  );

  // Optional helpers (no new hooks below guards) 
  const perGram = storeAnalysis?.perGram || {};
  const perGramSum = Object.values(perGram).reduce((a: number, v: any) => a + (Number(v) || 0), 0);
  
  const useHydration = !bypassHydration;
  const isNutritionReady = useHydration ? (perGramSum > 0) : true;

  

  // Diagnostic log for home loading crash
  console.log('[CONFIRM][GUARD][HOME_LOAD]', {
    hasItem: !!currentFoodItem,
    isOpen,
    inputSource: 'undefined' // keeping minimal as requested
  });

  // Set body flag when reminder is open for CSS portal handling
  useEffect(() => {
    if (reminderOpen) {
      document.body.setAttribute('data-reminder-open', 'true');
    } else {
      document.body.removeAttribute('data-reminder-open');
    }
    return () => document.body.removeAttribute('data-reminder-open');
  }, [reminderOpen]);

  // Lock body scroll when confirm dialog is open
  useEffect(() => {
    document.body.dataset.modalOpen = isOpen ? "true" : "false";
    console.log("[SCROLL][LOCK]", { rev: CONFIRM_FIX_REV, modal: "confirm", isOpen });
    return () => { delete document.body.dataset.modalOpen; };
  }, [isOpen]);

  // Derive display values with broad fallback
  // Enhanced display values for barcode and text items
  const preferItem = bypassHydration && ((currentFoodItem as any)?.source === 'barcode' || (currentFoodItem as any)?.source === 'manual' || (currentFoodItem as any)?.source === 'speech');
  const isBarcodeItem = (currentFoodItem as any)?.source === 'barcode';
  const isTextItem = (currentFoodItem as any)?.source === 'manual' || (currentFoodItem as any)?.source === 'speech';
  const title = currentFoodItem?.name ?? 'Unknown Product';
  const servingG = preferItem ? ((currentFoodItem as any)?.servingGrams ?? null) : (currentFoodItem?.portionGrams ?? null);
  const servingText = (currentFoodItem as any)?.servingText as string | undefined;
  const grams = Math.round(servingG ?? 100);
  
  // Use serving text for barcode and text items when available, otherwise use grams
  const subtitle = (isBarcodeItem || isTextItem)
    ? (servingText ? `Per portion (${servingText})` : `Per portion (${grams} g)`)
    : (servingG ? `${servingG} g per portion` : 'Per portion (unknown size)');
  
  const imageUrl = preferItem ? ((currentFoodItem as any)?.imageUrl ?? null) : (currentFoodItem?.image ?? currentFoodItem?.imageUrl ?? null);
  
  const displayName = title;
  
  const imgUrl = imageUrl ?? currentFoodItem?.image ?? currentFoodItem?.imageUrl ?? null;
  const validImg = typeof imgUrl === "string" && /^https?:\/\//i.test(imgUrl);

  // Check if this is an unknown product that needs manual entry
  const isUnknownProduct = (currentFoodItem as any)?.isUnknownProduct;
  const hasBarcode = !!(currentFoodItem as any)?.barcode;

  useEffect(() => {
    const url = imgUrl ?? '';
    const imageUrlKind = /^https?:\/\//i.test(url) ? 'http' : 'none';
    const isBarcode = !!(currentFoodItem as any)?.barcode || !!(currentFoodItem as any)?._provider;
    console.log('[CONFIRM][MOUNT]', {
      rev: CONFIRM_FIX_REV,
      name: displayName,
      imageUrlKind: validImg ? "http" : "none",
      url: (imgUrl || "").slice(0, 120),
    });
    
    if (isBarcode && isOpen) {
      console.log('[CONFIRM][MOUNT][BARCODE]', { id: currentFoodItem?.name, name: currentFoodItem?.name });
    }
  }, [imgUrl, displayName, isOpen, currentFoodItem]);

  // Stabilize: directly sync from prop without null flip
  useEffect(() => {
    setCurrentFoodItem(foodItem);
  }, [foodItem]);

  // Trigger coach response when flagged ingredients are detected
  React.useEffect(() => {
    if (flaggedIngredients.length > 0 && currentFoodItem) {
      // Mock coach message callback for demo
      const handleCoachMessage = (message: any) => {};
      
      triggerCoachResponseForIngredients(flaggedIngredients, handleCoachMessage);
    }
  }, [flaggedIngredients, currentFoodItem, triggerCoachResponseForIngredients]);

  // Hide voice analyzing overlay when confirmation modal is fully mounted and open
  React.useEffect(() => {
    if (isOpen && currentFoodItem && onVoiceAnalyzingComplete) {
      // Ensure the modal is fully rendered and stable before hiding the overlay
      const timer = setTimeout(() => {
        onVoiceAnalyzingComplete();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentFoodItem, onVoiceAnalyzingComplete]);

  // Card binds store-first (diagnostic only, no UI change)
  useEffect(() => {
    if (!currentFoodItem?.id) return;
    const data = useNutritionStore.getState().byId[currentFoodItem.id];
    const perGram = data?.perGram || {};
    if (process.env.NODE_ENV === 'development') {
      const pgSum = Object.values(perGram || {}).reduce((a: number, v: any) => a + (+v || 0), 0);
      console.log('[SST][CARD_BIND]', {
        id: currentFoodItem?.id,
        fromStore: !!data?.perGram,
        perGramKeys: Object.keys(perGram || {}),
        pgSum
      });
      console.log('[SST][HEALTH_BIND]', {
        id: currentFoodItem?.id,
        score: currentFoodItem?.analysis?.healthScore,
        flags: currentFoodItem?.analysis?.flags?.map((f: any) => f.label || f),
      });
    }
  }, [currentFoodItem?.id, currentFoodItem?.name]);

  // Guard content rendering ONLY; hooks already executed
  if (!currentFoodItem) {
    return <span data-guard="no-current-food" />; // minimal placeholder to keep mount stable
  }

  const canRender = skipNutritionGuard || isNutritionReady;
  if (!canRender) {
    console.log('[RENDER_GUARD] nutrition not ready (barcode bypass off)', { isNutritionReady, skipNutritionGuard, useHydration });
    return <span data-guard="not-ready" />;
  }

  const portionMultiplier = portionPercentage[0] / 100;
  
  // Helper for scaling
  function scale(val: number, f: number) { return Math.round(val * f * 10) / 10; }

  // Calculate effective nutrients - prefer foodItem data for barcode items
  const base = currentFoodItem.basePer100; // per-100g baseline
  const gramsFactor = currentFoodItem.factor ?? 1; // portionGrams/100 at 100% slider
  const sliderFraction = portionMultiplier; // 0..1 (0%, 25%, 50%, 75%, 100%)

  // Get base nutrition values - prefer item data for barcode
  const baseCalories = preferItem ? ((currentFoodItem as any)?.calories ?? 0) : currentFoodItem.calories;
  const baseProtein = preferItem ? ((currentFoodItem as any)?.protein_g ?? 0) : currentFoodItem.protein;
  const baseCarbs = preferItem ? ((currentFoodItem as any)?.carbs_g ?? 0) : currentFoodItem.carbs;
  const baseFat = preferItem ? ((currentFoodItem as any)?.fat_g ?? 0) : currentFoodItem.fat;
  const baseFiber = preferItem ? ((currentFoodItem as any)?.fiber_g ?? 0) : currentFoodItem.fiber;
  const baseSugar = preferItem ? ((currentFoodItem as any)?.sugar_g ?? 0) : currentFoodItem.sugar;
  const baseSodium = preferItem ? ((currentFoodItem as any)?.sodium_mg ?? 0) : currentFoodItem.sodium;

  const effective = base && !preferItem
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
        // Use direct values with portion scaling
        calories: Math.round(baseCalories * portionMultiplier),
        protein: Math.round(baseProtein * portionMultiplier * 10) / 10,
        carbs: Math.round(baseCarbs * portionMultiplier * 10) / 10,
        fat: Math.round(baseFat * portionMultiplier * 10) / 10,
        fiber: Math.round(baseFiber * portionMultiplier * 10) / 10,
        sugar: Math.round(baseSugar * portionMultiplier * 10) / 10,
        sodium: Math.round(baseSodium * portionMultiplier),
      };

  const adjustedFood = {
    ...currentFoodItem,
    ...effective,
  };

  console.log('[CONFIRM][RENDER_GUARD][BARCODE]', {
    inputSource: 'undefined', // keeping minimal as requested  
    showConfirmation: isOpen,
    hasItem: !!currentFoodItem,
    itemId: currentFoodItem?.id,
    itemName: currentFoodItem?.name,
    kcal: currentFoodItem?.calories,
  });

  console.log('[CONFIRM][BIND]', { 
    title, 
    calories: effective.calories, 
    protein: effective.protein, 
    carbs: effective.carbs, 
    fat: effective.fat, 
    servingG,
    preferItem,
    bypassHydration
  });

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
    // Use the deterministic flagger system
    const ingredientsText = (food as any).ingredientsText || food.ingredientsText || '';
    const nutritionThresholds: NutritionThresholds = {
      sodium_mg_100g: food.sodium,
      sugar_g_100g: food.sugar,
      satfat_g_100g: food.fat * 0.3, // Rough estimate - 30% of total fat as saturated
      fiber_g_100g: food.fiber,
      protein_g_100g: food.protein,
    };

    const flags = detectFlags(ingredientsText, nutritionThresholds);
    
    console.debug('[FLAGS][INPUT]', {
      hasIngredients: !!ingredientsText,
      allergens: (food as any).allergens?.length || 0,
      additives: (food as any).additives?.length || 0
    });
    
    console.debug('[FLAGS][RESULT]', { count: flags?.length || 0 });
    
    return flags.map(flag => ({
      emoji: flag.severity === 'good' ? '✅' : flag.severity === 'warning' ? '⚠️' : '🚫',
      label: flag.label,
      positive: flag.severity === 'good',
      description: flag.description
    }));
  };

  // Meal Quality Evaluation Functions
  const evaluateMealQuality = async (nutritionLogId: string) => {
    if (!nutritionLogId) return;
    
    setIsEvaluatingQuality(true);
    try {
      
      
      const { data, error } = await supabase.functions.invoke('evaluate-meal-quality', {
        body: { nutrition_log_id: nutritionLogId }
      });

      if (error) {
        console.error('Error evaluating meal quality:', error);
        return;
      }

      
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

  // Map technical source names to user-friendly labels
  const getFriendlySourceLabel = (source: string) => {
    switch (source.toLowerCase()) {
      case 'branded-database':
      case 'branded_database':
        return 'Branded database';
      case 'usda':
      case 'openfoodfacts':
      case 'open_food_facts':
        return 'Food database';
      case 'gpt-individual':
      case 'gpt-fallback':
      case 'ai-estimate':
      case 'ai_estimate':
      case 'multi-ai-fallback':
        return 'AI estimate';
      default:
        return 'Database lookup';
    }
  };

  const handleConfirm = async () => {
    // Prevent double-processing
    if (isConfirming || isProcessingFood) {
      
      return;
    }
    
    // Set confirming state immediately to disable button and prevent double-clicks
    setIsConfirming(true);
    
    try {
      
      
      // Add 10-second timeout wrapper around onConfirm
      const confirmPromise = new Promise<void>((resolve, reject) => {
        try {
          // Persist only HTTP(S) image URLs; anything else becomes undefined.
          const payload = {
            ...adjustedFood,
            image: typeof adjustedFood.image === 'string' && /^https?:\/\//i.test(adjustedFood.image)
              ? adjustedFood.image
              : undefined,
          };
          onConfirm(payload);
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
      SoundGate.markConfirm();
      
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
    if (percentage === 100) {
      // For barcode items, use the actual serving size
      return isBarcodeItem ? 'Full portion' : 'Full portion';
    }
    return `${percentage}%`;
  };

  // Show loading state during transition in multi-item flow
  if (!currentFoodItem && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={totalItems && totalItems > 1 ? undefined : onClose}>
        <AccessibleDialogContent 
          className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden"
          title="Loading next item"
          description="Please wait while the next food item is being loaded."
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
        </AccessibleDialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Prevent closing parent when reminder is open
        if (reminderOpen && !open) return;
        if (totalItems && totalItems > 1) return;
        onClose();
      }}>
        <AccessibleDialogContent 
          className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden"
          title="Confirm Food Log"
          description="We'll save these items to your log."
          showCloseButton={!reminderOpen}
          data-dialog-root="confirm-food-log"
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

            <div className="text-center mb-4 relative">
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
              
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {totalItems > 1 && (
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                    Item {((currentIndex ?? 0) + 1)} of {totalItems}
                  </div>
                )}
                Confirm Food Log
              </h1>
            </div>

            {/* Food Item Display */}
            <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
              {validImg ? (
                <img
                  key={imgUrl}             // force refresh when URL changes
                  src={imgUrl}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  onLoad={() => console.log("[CONFIRM][IMAGE]", { rev: CONFIRM_FIX_REV, event: "load" })}
                  onError={(e) => { console.log("[CONFIRM][IMAGE]", { rev: CONFIRM_FIX_REV, error: "onError->fallback", src: (e.target as HTMLImageElement)?.src }); setImageError(true); }}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <FallbackEmoji className="h-16 w-16 rounded-xl" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  {displayName}
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
                  {subtitle}
                </label>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {getPortionLabel(portionPercentage[0])}
                </span>
              </div>
              <Slider
                value={portionPercentage}
                onValueChange={(values) => {
                  setPortionPercentage(values);
                  // Add forensics logging for portion changes
                  const pct = values[0];
                  const scaledCalories = Math.round((currentFoodItem?.calories || 0) * (pct / 100));
                  console.log('[LOG] portion_change', { pct, calories: scaledCalories });
                }}
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

                {/* Nutrition Source Display - User-friendly labels, no confidence % */}
                {currentFoodItem.source && (
                  <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                      📊 Data source: <span className="font-medium text-blue-600 dark:text-blue-400">{getFriendlySourceLabel(currentFoodItem.source)}</span>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="health" className="space-y-4 mt-4">
                {/* Legacy Health Check Panel */}
                <div className="text-center">
                  <Badge className={`${healthBadge.bgColor} text-white font-medium px-4 py-2 text-sm rounded-full inline-flex items-center space-x-2`}>
                    <span>{healthBadge.emoji}</span>
                    <span>{healthBadge.label}</span>
                    <span className="text-xs">({healthScore}/10)</span>
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
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${
                            flag.positive ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'
                          }`}>
                            {flag.label}
                          </span>
                          {flag.description && (
                            <p className={`text-xs mt-1 ${
                              flag.positive ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'
                            }`}>
                              {flag.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                      No specific health flags detected
                    </div>
                  )}
                </div>
                          
                {/* 🧪 Ingredients section with collapsed view */}
                {currentFoodItem?.ingredientsText && (
                  <div className="mt-4">
                    <details className="group bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <summary className="cursor-pointer p-3 text-sm font-medium text-gray-900 dark:text-white list-none">
                        <div className="flex items-center justify-between">
                          <span>View Ingredients</span>
                          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                        </div>
                      </summary>
                      <div className="p-3 pt-0 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {currentFoodItem.ingredientsText}
                        </p>
                      </div>
                    </details>
                  </div>
                )}
                          
                {/* Health Check Button for Barcode Items */}
                {isFromBarcode && (
                  <div className="mt-4">
                    <Button
                      onClick={async () => {
                        try {
                          const { openHealthReportFromBarcode } = await import('@/features/health/openHealthReport');
                          const barcode = currentFoodItem?.barcode;
                          if (barcode) {
                            const result = await openHealthReportFromBarcode(barcode, 'scanner-manual');
                            if (result.success) {
                              window.location.href = `${result.route}?mode=${result.params.mode}&barcode=${result.params.barcode}&source=${result.params.source}`;
                            }
                          }
                        } catch (error) {
                          console.error('Failed to open health report:', error);
                        }
                      }}
                      className="w-full"
                      variant="outline"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      View Full Health Report
                    </Button>
                  </div>
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
              foodName={displayName}
              foodData={{
                food_name: displayName,
                calories: adjustedFood.calories,
                protein: adjustedFood.protein,
                carbs: adjustedFood.carbs,
                fat: adjustedFood.fat,
                fiber: adjustedFood.fiber,
                sugar: adjustedFood.sugar,
                sodium: adjustedFood.sodium,
              }}
              className="mb-4"
              onReminderOpen={() => {
                setReminderOpen(true);
                // Assert close button counts when reminder opens
                setTimeout(() => {
                  const confirmCount = document.querySelectorAll('[data-dialog-root="confirm-food-log"] button[aria-label="Close"]').length;
                  const reminderCount = document.querySelectorAll('[data-dialog-root="reminder-modal"] button[aria-label="Close"]').length;
                  console.log('[A11Y][CLOSE-COUNT]', { rev: CONFIRM_FIX_REV, confirm: confirmCount, reminder: reminderCount });
                }, 100);
              }}
              onReminderClose={() => setReminderOpen(false)}
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
                      onClick={onCancelAll}
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
                    aria-busy={isConfirming || isProcessingFood}
                    className={`w-full h-12 text-lg font-semibold transition-all duration-300 ${
                      !isConfirming && !isProcessingFood && portionPercentage[0] > 0
                        ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white hover:scale-105 shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } ${(isConfirming || isProcessingFood) ? 'animate-pulse pointer-events-none' : ''}`}
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
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  
                  {/* Log Food - Full Width Primary */}
                  <Button
                    onClick={handleConfirm}
                    disabled={isConfirming || portionPercentage[0] === 0}
                    aria-busy={isConfirming}
                    className={`w-full h-12 text-lg font-semibold transition-all duration-300 ${
                      !isConfirming && portionPercentage[0] > 0
                        ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white hover:scale-105 shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } ${isConfirming ? 'animate-pulse pointer-events-none' : ''}`}
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
        </AccessibleDialogContent>
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
