import React, { useState, useEffect, useMemo, useId } from 'react';
import { Dialog, DialogHeader, DialogClose, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { withSafeCancel } from '@/lib/ui/withSafeCancel';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Edit, Edit3, Trash2, AlertTriangle, Info, CheckCircle, X, MinusCircle, FileText, Plus, ChevronDown, ChevronUp, Award, Search, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FoodEditScreen from './FoodEditScreen';
import { ReminderToggle } from './reminder/ReminderToggle';
import { ManualIngredientEntry } from './camera/ManualIngredientEntry';
import { useIngredientAlert } from '@/hooks/useIngredientAlert';
import { DataSourceChip } from './ui/data-source-chip';
import { useSmartCoachIntegration } from '@/hooks/useSmartCoachIntegration';
import { useSound } from '@/hooks/useSound';
import { SoundGate } from '@/lib/soundGate';
import { supabase } from '@/integrations/supabase/client';
import { detectFlags } from '@/lib/health/flagger';
import { nvLabelLookup } from '@/lib/nutritionVault';
import { isEan, offImageForBarcode, offImageCandidates } from '@/lib/imageHelpers';
import { offImageCandidates as offImageCandidatesNew } from '@/lib/offImages';
import type { NutritionThresholds } from '@/lib/health/flagRules';
import { useNutritionStore } from '@/stores/nutritionStore';
import { IMAGE_PROXY_OFF } from '@/lib/flags';
// Add the FoodCandidate type import
import type { Candidate } from '@/lib/food/search/getFoodCandidates';
import { inferPortion } from '@/lib/food/portion/inferPortion';
import { FEAT_MANUAL_CHEAP_ONLY, MANUAL_FX } from '@/config/flags';
import { FOOD_TEXT_DEBUG, ENABLE_FOOD_TEXT_V3_NUTR } from '@/lib/flags';
import { extractName } from '@/lib/debug/extractName';
import { hydrateNutritionV3 } from '@/lib/nutrition/hydrateV3';
import { resolveFoodImage, buildInitialsDataUrl } from "@/lib/food/getFoodImage";
import { resolveImageUrl } from '@/lib/food/image';

import './styles/confirm-avatar.css';
import { sanitizeName } from '@/utils/helpers/sanitizeName';
import confetti from 'canvas-confetti';
import { labelFromFlags } from '@/lib/food/search/getFoodCandidates';
import { ENABLE_PHOTO_BARCODE_ENRICH } from '@/config/confirmFlags';

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
  imageAttribution?: 'nutritionix'|'off'|'usda'|'barcode'|'manual'|'unknown';
  barcode?: string;
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  ingredients?: Array<{ name: string; grams?: number; amount?: string }>; // Add ingredients property
  ingredientsList?: string[]; // Add ingredientsList for normalized ingredients
  source?: string; // Nutrition data source (branded-database, usda, openfoodfacts, ai-estimate, etc.)
  confidence?: number; // Confidence score for the nutrition estimation
  hasIngredients?: boolean;
  enrichmentSource?: string; // Add enrichment metadata
  enrichmentConfidence?: number; // Add enrichment confidence
  selectionSource?: string; // Source of selection (manual, voice, standard)
  ingredientsUnavailable?: boolean; // When no ingredient source is available
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
  // V3 nutrition hydration fields
  perGram?: any;
  perGramKeys?: string[];
  pgSum?: number;
  dataSource?: string;
  nutritionKey?: string;
  isGeneric?: boolean;
  // Selection identity fields
  flags?: { generic?: boolean; brand?: boolean; restaurant?: boolean };
  selectionFlags?: { generic?: boolean; brand?: boolean; restaurant?: boolean };
}

type ConfirmMode = 'manual' | 'standard';

interface FoodConfirmationCardProps {
  mode?: ConfirmMode; // default 'standard'
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (foodItem: FoodItem) => void;
  onSkip?: () => void; // Skip functionality (now "Don't Log")
  onCancelAll?: () => void; // Cancel all items functionality
  onCancel?: () => void; // NEW: Cancel handler for parent orchestration
  foodItem: FoodItem | null;
  showSkip?: boolean; // Whether to show "Don't Log" button
  currentIndex?: number; // Current item index for multi-item flow
  totalItems?: number; // Total items for multi-item flow
  isProcessingFood?: boolean; // Whether the parent is processing the food item
  onVoiceAnalyzingComplete?: () => void; // Callback to hide voice analyzing overlay
  skipNutritionGuard?: boolean; // when true, allow render without perGram readiness
  bypassHydration?: boolean; // NEW: bypass store hydration for barcode items
  forceConfirm?: boolean; // NEW: force confirmation dialog to stay open (for manual/voice)
  candidates?: Candidate[]; // NEW: alternative food candidates for manual/voice
  originalText?: string; // NEW: original user input for portion inference
}

const CONFIRM_FIX_REV = "2025-08-31T15:43Z-r11";

// Add helper to normalize nutrition to per-100g basis
const ensurePer100 = (item: any) => {
  // Inputs can be any of: perGram, basePer100, label.servingSizeG + macrosPerServing
  if (item?.basePer100) return item.basePer100;
  
  if (item?.perGram) {
    return {
      calories: Math.round((item.perGram.calories || 0) * 100),
      proteinG: Math.round((item.perGram.protein || 0) * 100 * 10) / 10,
      carbsG: Math.round((item.perGram.carbs || 0) * 100 * 10) / 10,
      fatG: Math.round((item.perGram.fat || 0) * 100 * 10) / 10,
      fiberG: Math.round((item.perGram.fiber || 0) * 100 * 10) / 10,
      sugarG: Math.round((item.perGram.sugar || 0) * 100 * 10) / 10,
      sodium_mg: Math.round((item.perGram.sodium || 0) * 100)
    };
  }
  
  if (item?.label?.servingSizeG && item?.label?.macrosPerServing) {
    const f = 100 / item.label.servingSizeG;
    return {
      calories: Math.round((item.label.macrosPerServing.calories || 0) * f),
      proteinG: Math.round((item.label.macrosPerServing.proteinG || 0) * f * 10) / 10,
      carbsG: Math.round((item.label.macrosPerServing.carbsG || 0) * f * 10) / 10,
      fatG: Math.round((item.label.macrosPerServing.fatG || 0) * f * 10) / 10,
      fiberG: Math.round((item.label.macrosPerServing.fiberG || 0) * f * 10) / 10,
      sugarG: Math.round((item.label.macrosPerServing.sugarG || 0) * f * 10) / 10,
      sodium_mg: Math.round((item.label.macrosPerServing.sodium_mg || 0) * f)
    };
  }
  
  return null;
};

const FoodConfirmationCard: React.FC<FoodConfirmationCardProps> = ({
  mode = 'standard',
  isOpen,
  onClose,
  onConfirm,
  onSkip,
  onCancelAll,
  onCancel,
  foodItem,
  showSkip = false,
  currentIndex,
  totalItems,
  isProcessingFood = false,
  onVoiceAnalyzingComplete,
  skipNutritionGuard = false,
  bypassHydration = false,
  forceConfirm = false,
  candidates,
  originalText
}) => {
  // ✅ Call hooks unconditionally first
  const ready = Boolean(foodItem);

  // Add safety flag logic
  const inputSource = foodItem?.source ?? 'manual';
  const allowEnrich = inputSource === 'manual' || ENABLE_PHOTO_BARCODE_ENRICH;

  // All hooks called unconditionally first
  const titleId = useId();
  const descId = useId();
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
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [prevItem, setPrevItem] = useState<any | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  
  // B. Lazy ingredients state
  const [lazyIngredients, setLazyIngredients] = useState<{
    ingredientsList: string[];
    ingredientsText: string;
    hasIngredients: boolean;
    ingredientsUnavailable: boolean;
    isLoading: boolean;
  } | null>(null);
  
  const { toast } = useToast();

  // Minimal tokenization with tiny stopword set (inline, local only)
  const STOP = new Set(['the','a','an','with','and','of']);
  const tokenize = (s?: string) =>
    new Set((s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w)));

  // Canonical "family" check: 'pizza:slice' and 'pizza:pepperoni' share 'pizza'
  const sameFamily = (a?: string, b?: string) => {
    if (!a || !b) return false;
    const ra = a.split(':')[0], rb = b.split(':')[0];
    return !!ra && !!rb && ra === rb;
  };

  // Very small, defensive relevance check. No external dependencies.
  function isRelevantAlt(alt: any, cur: any): boolean {
    if (!alt || !cur) return false;
    if (alt.id && cur.id && alt.id === cur.id) return false;

    // If both have classId and they differ, treat as not relevant.
    if (alt.classId && cur.classId && alt.classId !== cur.classId) return false;

    // If both have canonicalKey and families differ, treat as not relevant.
    if (alt.canonicalKey && cur.canonicalKey && !sameFamily(alt.canonicalKey, cur.canonicalKey)) {
      return false;
    }

    // Token overlap as a fallback when classId/canonicalKey missing
    const a = tokenize(alt.name);
    const b = tokenize(cur.name);
    const hasOverlap = [...a].some(w => b.has(w));

    // Confidence floor (reuse existing score field if present)
    const scoreOK = (alt.score ?? 0) >= 0.55;

    return hasOverlap && scoreOK;
  }
  const { checkIngredients, flaggedIngredients, isLoading: isCheckingIngredients } = useIngredientAlert();
  const { triggerCoachResponseForIngredients } = useSmartCoachIntegration();
  const { playFoodLogConfirm } = useSound();

  const [reminderOpen, setReminderOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // 🧪 DEBUG INSTRUMENTATION
  const __IMG_DEBUG = false; // keep instrumentation off in UI
  
  // Collect URLs: safe candidates for manual, enriched for photo/barcode
  const PLACEHOLDER = '/images/food-placeholder.png';
  const isManualImage = inputSource === 'manual';
  
  const ensureProxied = (u?: string) =>
    u && u.startsWith('https://images.openfoodfacts.org')
      ? `/api/image-proxy?url=${encodeURIComponent(u)}`
      : u;

  const imageUrls = useMemo(() => {
    const candidates: string[] = [
      (currentFoodItem as any)?.imageUrl,
      (currentFoodItem as any)?.thumbnailUrl,
      (currentFoodItem as any)?.photoUrl,
    ].filter(Boolean) as string[];

    // map all to proxied
    const dedup = Array.from(new Set(candidates.map(ensureProxied)));
    return dedup.length ? dedup : [PLACEHOLDER];
  }, [
    (currentFoodItem as any)?.imageUrl,
    (currentFoodItem as any)?.thumbnailUrl,
    (currentFoodItem as any)?.photoUrl,
    (currentFoodItem as any)?.providerRef,
    (currentFoodItem as any)?._provider,
    isManualImage
  ]);

  useEffect(() => setImgIdx(0), [imageUrls.join('|')]);

  const resolvedSrc = imageUrls[Math.min(imgIdx, imageUrls.length - 1)] || PLACEHOLDER;
  useEffect(() => {
    const fromEnrichment = isManualImage ? [] : ((currentFoodItem as any)?.image?.urls ?? []);
    const fromBarcodeGuess = isManualImage ? [] : ((currentFoodItem as any)?.providerRef ? offImageCandidatesNew((currentFoodItem as any).providerRef) : []);
    
    console.log('[IMG][CARD][BIND]', {
      providerRef: (currentFoodItem as any)?.providerRef,
      fromEnrichment,
      fromBarcodeGuess,
      using: resolvedSrc,
    });
  }, [resolvedSrc, imageUrls, (currentFoodItem as any)?.providerRef, isManualImage]);


  // Derive a stable ID from props (not from transient state)
  const foodId = foodItem?.id ?? null;

  // Confetti removed from modal open - now only fires after successful logging

  // A) Log what FoodConfirmationCard receives as props
  useEffect(() => {
    console.log("[CONFIRM][PROPS]", {
      source: foodItem?.source, 
      confidence: foodItem?.confidence,
      ingLen: foodItem?.ingredients?.length ?? 0,
      enrichmentSource: foodItem?.enrichmentSource,
      enrichmentConfidence: foodItem?.enrichmentConfidence
    });
  }, [foodItem]);

  // Zustand selector MUST run unconditionally on every render
  const storeAnalysis = useNutritionStore(
    s => (foodId ? s.byId[foodId] : undefined)
  );

  // Optional helpers (no new hooks below guards) 
  const perGram = storeAnalysis?.perGram || {};
  const perGramSum = Object.values(perGram).reduce((a: number, v: any) => a + (Number(v) || 0), 0);

  // Detect barcode immediately from stable signals present on first render
  const isBarcodeSource = !!(
    (currentFoodItem as any)?.source === 'barcode' ||
    (currentFoodItem as any)?.id?.startsWith?.('bc:') ||
    (currentFoodItem as any)?.barcode
  );

  // Detect manual/voice sources for v3 handling
  const isManualVoiceSource = !!(
    (currentFoodItem as any)?.__source === 'manual' || 
    (currentFoodItem as any)?.__source === 'voice' ||
    (currentFoodItem as any)?.source === 'manual' || 
    (currentFoodItem as any)?.source === 'speech'
  );

  const useHydration = allowEnrich && !bypassHydration;
  // Check if nutrition is ready from various sources
  const perGramReady =
    !!currentFoodItem?.perGram ||
    (Array.isArray(currentFoodItem?.perGramKeys) && currentFoodItem.perGramKeys.length > 0) ||
    (typeof currentFoodItem?.pgSum === 'number' && currentFoodItem.pgSum > 0);
  
  const isNutritionReady = perGramReady
    || ((useHydration && !isBarcodeSource) ? (perGramSum > 0) : true);
  
  // HARD GUARD: manual items never use store/hydration
  const isManual = mode === 'manual' || 
                   foodItem?.selectionSource === 'manual' || 
                   currentFoodItem?.source === 'manual' ||
                   (currentFoodItem as any)?.__source === 'manual';
  const readyForManual = !!foodItem?.enrichmentSource && Array.isArray(foodItem?.ingredientsList);
  
  // Build and route sentinels on mount
  useEffect(() => {
    if (isOpen) {
      // Emit confirm:mounted event to hide preparing overlay
      window.dispatchEvent(new CustomEvent('confirm:mounted'));
      
      // Hide any preparing overlays when confirmation opens
      if (typeof window !== 'undefined') {
        // Hide voice analyzing overlay
        const voiceEvent = new CustomEvent('hide:voice-analyzing');
        window.dispatchEvent(voiceEvent);
        
        // Hide processing overlays
        const processingEvent = new CustomEvent('hide:processing-overlay');
        window.dispatchEvent(processingEvent);
      }
      
      console.info('[BUILD]', {
        sha: 'confirm-card-fix-v1', 
        time: new Date().toISOString(), 
        mode: import.meta?.env?.MODE || 'development'
      });
      console.info('[CONFIRM_PATH]', {
        cardFile: 'src/components/FoodConfirmationCard.tsx',
        enrichmentFile: 'src/hooks/useManualFoodEnrichment.tsx',
        sentinel: 'hooks/enrich/v3/8f4a2b'
      });
    }
  }, [isOpen]);

  // Log mount and hydration states
  useEffect(() => {
    if (isOpen && currentFoodItem) {
      const source = (currentFoodItem as any)?.__source || (currentFoodItem as any)?.source || 'unknown';
      const ingredientsList = Array.isArray((currentFoodItem as any)?.ingredientsList)
        ? (currentFoodItem as any).ingredientsList
        : [];
      const cardLayoutClass = 'food-confirm-card fixed-layout';
      
      console.log('[CONFIRM][ENTER]', {
        source,
        useHydration,
        isNutritionReady,
        isManualVoice: isManualVoiceSource,
        ingredientsListLength: ingredientsList.length,
        cardLayoutClass
      });
      
      if (!isNutritionReady && useHydration) {
        console.log('[CONFIRM][HYDRATE:PENDING]');
      }
    }
  }, [isOpen, currentFoodItem, useHydration, isNutritionReady, isManualVoiceSource]);

  // Log when hydration completes and emit confirm:mounted for nutrition ready
  useEffect(() => {
    if (isNutritionReady && useHydration && isOpen) {
      console.log('[CONFIRM][HYDRATE:READY]');
      // Also emit confirm:mounted when nutrition is ready
      window.dispatchEvent(new CustomEvent('confirm:mounted'));
    }
  }, [isNutritionReady, useHydration, isOpen]);

  
  // V3 nutrition hydration for manual/voice items
  useEffect(() => {
    if (!currentFoodItem?.id || !isManualVoiceSource || !ENABLE_FOOD_TEXT_V3_NUTR) return;
    if (perGramReady) return; // Skip if already ready
    
    const controller = new AbortController();
    
    console.log('[NUTRITION][V3][START]', { 
      name: currentFoodItem.name, 
      id: currentFoodItem.id 
    });
    
    hydrateNutritionV3(currentFoodItem, { 
      signal: controller.signal, 
      preferGeneric: true 
    }).then(result => {
      if (controller.signal.aborted) return;
      
      setCurrentFoodItem(prev => prev ? ({
        ...prev,
        perGram: result.perGram,
        perGramKeys: result.perGramKeys,
        pgSum: 1,
        dataSource: result.dataSource
      }) : null);
      
      console.log('[NUTRITION][READY]', {
        source: 'hydrated',
        dataSource: result.dataSource,
        pgKeys: result.perGramKeys.length
      });
    }).catch(error => {
      if (!controller.signal.aborted) {
        console.log('[NUTRITION][BLOCKED]', { 
          reason: 'HYDRATION_FAILED',
          error: error.message 
        });
      }
    });
    
    return () => controller.abort();
  }, [currentFoodItem?.id, isManualVoiceSource, perGramReady]);

  // Log render guard state for diagnostics
  console.log('[CONFIRM][RENDER_GUARD]', {
    perGramReady,
    fromStore: !!storeAnalysis?.perGram,
    pgSum: currentFoodItem?.pgSum,
    isNutritionReady,
    isManualVoice: isManualVoiceSource
  });

  // Log nutrition readiness and bypass hydration
  useEffect(() => {
    if (bypassHydration) {
      console.log('[CONFIRM][FAIL_OPEN] reason=bypass');
    }
    
    if (isNutritionReady && currentFoodItem) {
      const source = perGramReady ? 'item' : 'store';
      const dataSource = currentFoodItem.dataSource || 'unknown';
      const pgKeys = (currentFoodItem.perGramKeys?.length || 0);
      
      console.log('[NUTRITION][READY]', { 
        source, 
        dataSource, 
        pgKeys 
      });
    } else if (!isNutritionReady && currentFoodItem && !bypassHydration) {
      const reason = !perGramReady && perGramSum === 0 ? 'NO_PER_GRAM_KEYS' : 'UNKNOWN';
      console.log('[NUTRITION][BLOCKED]', { reason });
    }
  }, [isNutritionReady, perGramReady, perGramSum, currentFoodItem, bypassHydration]);

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

  // Force preferItem on barcode regardless of bypassHydration timing
  // Updated to prefer item-level per-gram data when available
  const preferItem =
    (perGramReady && (isManualVoiceSource || !storeAnalysis?.perGram || perGramSum === 0)) ||
    isBarcodeSource ||
    (bypassHydration && ((currentFoodItem as any)?.source === 'manual' || (currentFoodItem as any)?.source === 'speech'));

  // Pick the per-gram basis we'll use everywhere below
  const basisPerGram: Record<string, number> | undefined =
    (preferItem ? (currentFoodItem as any)?.perGram : storeAnalysis?.perGram) || undefined;

  // Normalize key aliases so different sources still render
  const getPG = (k: string) => {
    if (!basisPerGram) return 0;
    const aliases: Record<string, string[]> = {
      calories: ['calories', 'kcal', 'energy_kcal', 'energy'],
      protein:  ['protein', 'protein_g'],
      carbs:    ['carbs', 'carbohydrates', 'carbohydrate', 'carbs_g', 'carbohydrates_total_g'],
      fat:      ['fat', 'fat_total_g', 'total_fat'],
      fiber:    ['fiber', 'dietary_fiber', 'fiber_g'],
      sugar:    ['sugar', 'sugars', 'sugars_total_g', 'sugar_g'],
      satFat:   ['saturated_fat', 'sat_fat', 'saturated_fat_g'],
      sodium:   ['sodium', 'sodium_mg']
    };
    for (const key of (aliases[k] || [k])) {
      const v = basisPerGram[key];
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
    }
    return 0;
  };

  const sliderPct = portionPercentage[0] / 100;
  
  // after you compute currentFoodItem, servingG and sliderPct…
  const actualServingG = Math.max(0, Math.round(((currentFoodItem as any)?.servingGrams ?? 100) * sliderPct));

  // Which basis are we on?
  // v3 manual/voice (canonical / Estimated / legacy_text_lookup) => per 1g
  // legacy store (photo/barcode)       => per 100g
  const dataSource = (currentFoodItem as any)?.dataSource as string | undefined;
  const isPerGramBasis =
    isManualVoiceSource ||
    dataSource === 'canonical' ||
    dataSource === 'Estimated' ||
    dataSource === 'legacy_text_lookup';

  // Choose the right multiplier for scaling macro tiles + header kcal
  // per-gram basis: multiply by grams; per-100g basis: multiply by grams/100
  const scaleMult = isPerGramBasis ? actualServingG : actualServingG / 100;

  // convenient helpers
  const safe = (n?: number) => (Number.isFinite(n!) ? (n as number) : 0);
  const g1 = (n?: number) => Math.round(safe(n) * scaleMult * 10) / 10; // grams to 1 decimal
  const kcal = (n?: number) => Math.round(safe(n) * scaleMult);         // calories to int

  // Normalize nutrition using ensurePer100 helper
  const per100 = ensurePer100(currentFoodItem);
  const normalizedPerGram = per100 ? {
    calories: per100.calories / 100,
    protein: per100.proteinG / 100,
    carbs: per100.carbsG / 100,
    fat: per100.fatG / 100,
    fiber: per100.fiberG / 100,
    sugar: per100.sugarG / 100,
    sodium: per100.sodium_mg / 100
  } : null;
  
  // Set macros mode based on available data
  const macrosMode = per100 ? 'normalized' : 'legacy_text_lookup';
  
  console.log('[CONFIRM][SCALING]', {
    basisChosen: per100 ? 'per-100g-normalized' : 'legacy',
    baseServingG: actualServingG,
    uiServingLabel: 'calculated_later',
    sliderG: actualServingG,
    sourcePaths: {
      perGram: !!currentFoodItem?.perGram,
      basePer100: !!(currentFoodItem as any)?.basePer100,
      perPortion: !!(currentFoodItem as any)?.basePerPortion,
      labelData: !!(currentFoodItem as any)?.label
    },
    inputs: {
      perServingMacros: (currentFoodItem as any)?.label?.macrosPerServing,
      servingSizeG: (currentFoodItem as any)?.label?.servingSizeG,
      basePer100: (currentFoodItem as any)?.basePer100,
      perGram: currentFoodItem?.perGram
    },
    outputs: per100 ? { 
      kcal: Math.round((per100.calories * actualServingG) / 100), 
      proteinG: Math.round((per100.proteinG * actualServingG) / 100 * 10) / 10, 
      carbsG: Math.round((per100.carbsG * actualServingG) / 100 * 10) / 10, 
      fatG: Math.round((per100.fatG * actualServingG) / 100 * 10) / 10 
    } : { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    macrosMode,
    dataSource: dataSource || 'unknown'
  });

  // Calculate final nutrition values using normalized per100 basis
  const finalNutrition = per100 ? {
    calories: Math.round((per100.calories * actualServingG) / 100),
    protein: Math.round((per100.proteinG * actualServingG) / 100 * 10) / 10,
    carbs: Math.round((per100.carbsG * actualServingG) / 100 * 10) / 10,
    fat: Math.round((per100.fatG * actualServingG) / 100 * 10) / 10,
    fiber: Math.round((per100.fiberG * actualServingG) / 100 * 10) / 10,
    sugar: Math.round((per100.sugarG * actualServingG) / 100 * 10) / 10,
    sodium: Math.round((per100.sodium_mg * actualServingG) / 100)
  } : {
    // Fallback to legacy calculation
    calories: kcal(getPG('calories')),
    protein: g1(getPG('protein')),
    carbs: g1(getPG('carbs')),
    fat: g1(getPG('fat')),
    fiber: g1(getPG('fiber')),
    sugar: g1(getPG('sugar')),
    sodium: Math.round(getPG('sodium') * scaleMult * 1000)
  };

  // 1) Helper near the top of the file
  const kcalFromMacros = (p = 0, c = 0, f = 0, alcohol = 0) =>
    Math.round(p * 4 + c * 4 + f * 9 + alcohol * 7);

  // 2) Inside the component, right after you compute the values for the tiles
  //    Use the *scaled* numbers you already render in the three macro cards.
  const p = finalNutrition?.protein ?? 0;
  const c = finalNutrition?.carbs ?? 0;
  const f = finalNutrition?.fat ?? 0;
  const alc = (finalNutrition as any)?.alcohol ?? 0;

  // Prefer item.kcal if present; otherwise derive from the (already scaled) macros.
  const headerKcal =
    (typeof (currentFoodItem as any)?.kcal === 'number' && (currentFoodItem as any).kcal > 0)
      ? (currentFoodItem as any).kcal
      : kcalFromMacros(p, c, f, alc);
  
  const proteinG = finalNutrition.protein;
  const carbsG = finalNutrition.carbs;
  const fatG = finalNutrition.fat;
  const fiberG = finalNutrition.fiber;
  const sugarG = finalNutrition.sugar;

  const isBarcodeItem = (currentFoodItem as any)?.source === 'barcode';
  const isTextItem = (currentFoodItem as any)?.source === 'manual' || (currentFoodItem as any)?.source === 'speech';
  
  // Compute display badge from the FINAL item, not the original candidate
  const badge = useMemo(() => {
    const sourceFlags = (currentFoodItem as any)?.selectionFlags || currentFoodItem?.flags;
    const isGeneric = (currentFoodItem as any)?.isGeneric;
    const provider = (currentFoodItem as any)?.provider;
    const barcode = (currentFoodItem as any)?.providerRef || (currentFoodItem as any)?.barcode;
    const brandName = (currentFoodItem as any)?.brandName || (currentFoodItem as any)?.brand;
    const enrichmentSource = (currentFoodItem as any)?.enrichmentSource;
    
    // Badge truth: item is branded if it has real brand evidence
    const isBrand = !!(barcode || brandName || enrichmentSource === 'off' || enrichmentSource === 'label');
    
    if (isBrand) return 'Brand';
    if (isGeneric === true || provider === 'generic') return 'Generic';
    
    // Use flags as fallback, but ensure brand takes priority over generic
    const fromFlags = labelFromFlags(sourceFlags);
    if (fromFlags === 'Brand') return 'Brand';
    
    // Default to 'Item' for ambiguous cases
    return fromFlags || 'Item';
  }, [currentFoodItem]);
  
  // C. Badge truth logic - final evidence based computation
  const item = currentFoodItem;
  const enrichmentSource = (item?.enrichmentSource ?? undefined) as
    | 'off'
    | 'label'
    | 'provider'
    | 'legacy_text_lookup'
    | string
    | undefined;

  const hasBrandEvidence = Boolean((item as any)?.barcode || (item as any)?.providerRef || (item as any)?.brandName);
  const isGenericCandidate = (item as any)?.provider === 'generic' || (item as any)?.isGeneric;
  
  // Priority: Generic takes precedence if explicitly marked, then check for brand evidence
  const chipVariant: 'brand' | 'generic' | 'hidden' = 
    isGenericCandidate ? 'generic' :
    (hasBrandEvidence || enrichmentSource === 'off' || enrichmentSource === 'label') ? 'brand' : 'hidden';
  const chipLabel = chipVariant === 'brand' ? 'Brand' : (chipVariant === 'generic' ? 'Generic' : '');
  const badgeVariant: 'default' | 'secondary' = chipVariant === 'brand' ? 'default' : 'secondary';

  console.log('[CONFIRM][BADGE]', { hasBrandEvidence, enrichmentSource, chipVariant, brandName: (item as any)?.brandName, barcode: (item as any)?.barcode, providerRef: (item as any)?.providerRef });

  // 3) When binding the title/summary, use headerKcal (not item.kcal)
  console.log('[CONFIRM][BIND]', { badge: chipLabel, basis: isPerGramBasis ? 'per-gram' : 'per-100g', servingG: actualServingG, headerKcal });

  // Normalize props to avoid layout branch flips
  const normalizedItem = useMemo(() => ({
    ...currentFoodItem,
    portionSource: (currentFoodItem as any)?.portionSource || 'inferred',
    providerRef: (currentFoodItem as any)?.providerRef || 'generic',
    classId: (currentFoodItem as any)?.classId || 'generic_food',
  }), [currentFoodItem]);

  // Read ingredientsList with fallback to ingredientsText (enhanced with lazy loading)
  const ingredientsList = useMemo(() => {
    const itemList = (currentFoodItem as any)?.ingredientsList || [];
    const itemText = (currentFoodItem as any)?.ingredientsText || '';
    const lazyList = lazyIngredients?.ingredientsList || [];
    const lazyText = lazyIngredients?.ingredientsText || '';
    
    // Use lazy data if available, otherwise item data
    const list = lazyList.length ? lazyList : itemList;
    const text = lazyText || itemText;
    
    // If list is empty but text exists, try to split text into list
    const ingredients = list.length 
      ? list 
      : (text ? text.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    return Array.isArray(ingredients) ? ingredients : [];
  }, [currentFoodItem?.id, (currentFoodItem as any)?.ingredientsList, (currentFoodItem as any)?.ingredientsText, lazyIngredients]);

  // B. Lazy ingredient fetching effect
  useEffect(() => {
    // Only fetch if we have an item and no ingredients yet
    if (!currentFoodItem || lazyIngredients?.isLoading) return;
    
    const itemKey = `${currentFoodItem.id}-${(currentFoodItem as any)?.providerRef || currentFoodItem.name}`;
    const hasItemIngredients = (currentFoodItem as any)?.ingredientsList?.length || (currentFoodItem as any)?.ingredientsText;
    const hasLazyIngredients = lazyIngredients?.ingredientsList?.length || lazyIngredients?.ingredientsText;
    const isUnavailable = (currentFoodItem as any)?.ingredientsUnavailable || lazyIngredients?.ingredientsUnavailable;
    
    // Skip if we already have ingredients or marked unavailable
    if (hasItemIngredients || hasLazyIngredients || isUnavailable) return;
    
    console.log('[LAZY][ING] Starting fetch for:', itemKey);
    
    // Set loading state
    setLazyIngredients(prev => ({ ...(prev || {}), isLoading: true, ingredientsList: [], ingredientsText: '', hasIngredients: false, ingredientsUnavailable: false }));
    
    // Fetch ingredients
    nvLabelLookup({
      providerRef: (currentFoodItem as any)?.providerRef || (currentFoodItem as any)?.barcode,
      name: currentFoodItem.name
    }).then(result => {
      if (result.ingredientsList?.length || result.ingredientsText) {
        console.log('[LAZY][ING] Success:', { listLen: result.ingredientsList?.length, hasText: !!result.ingredientsText });
        setLazyIngredients({
          ingredientsList: result.ingredientsList || [],
          ingredientsText: result.ingredientsText || '',
          hasIngredients: true,
          ingredientsUnavailable: false,
          isLoading: false
        });
      } else {
        console.log('[LAZY][ING] No data found');
        setLazyIngredients({
          ingredientsList: [],
          ingredientsText: '',
          hasIngredients: false,
          ingredientsUnavailable: true,
          isLoading: false
        });
      }
    }).catch(error => {
      console.warn('[LAZY][ING] Error:', error);
      setLazyIngredients({
        ingredientsList: [],
        ingredientsText: '',
        hasIngredients: false,
        ingredientsUnavailable: true,
        isLoading: false
      });
    });
  }, [currentFoodItem?.id, (currentFoodItem as any)?.providerRef, currentFoodItem?.name, lazyIngredients?.isLoading]);

  // Log ingredient availability for debugging
  useEffect(() => {
    if (import.meta.env.DEV && isOpen) {
      const ingredientsText = (currentFoodItem as any)?.ingredientsText || '';
      console.log('[CONFIRM][ING]', {
        listLen: ingredientsList.length,
        hasText: !!ingredientsText,
        ingredientsUnavailable: currentFoodItem?.ingredientsUnavailable
      });
    }
  }, [ingredientsList.length, (currentFoodItem as any)?.ingredientsText, currentFoodItem?.ingredientsUnavailable, isOpen]);

  // Add ingredient diagnostics on mount
  useEffect(() => {
    if (import.meta.env.DEV && currentFoodItem) {
      const listLen = (currentFoodItem as any)?.ingredientsList?.length ?? 0;
      const hasText = !!(currentFoodItem as any)?.ingredientsText;
      console.log('[CONFIRM][ING]', {
        listLen,
        hasText,
        finalIngredientsLen: ingredientsList.length
      });
    }
  }, [currentFoodItem, ingredientsList.length]);

  const hasIngredients = ingredientsList.length > 0;

  // Fixed container class, not coupled to hasIngredients
  const cardLayoutClass = 'food-confirm-card fixed-layout';

  // Header chips: no wrap/overflow
  const headerChipsClass = 'flex items-center gap-2 flex-nowrap overflow-hidden';
  const chipClass = 'flex-shrink-0 truncate max-w-32';

  // Expose debug function
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__dumpConfirmState = () => ({
        sha: '2025-09-11-fix',
        route: 'FoodConfirmationCard',
        itemKeys: Object.keys(currentFoodItem || {}),
        ingredientsList: ingredientsList.slice(0, 5),
        hasIngredients,
        classes: { cardLayoutClass, headerChipsClass },
        normalizedItem
      });
    }
  }, [currentFoodItem, ingredientsList, hasIngredients, cardLayoutClass, headerChipsClass, normalizedItem]);
  console.log('[CONFIRM][VERIFICATION]', {
    source: currentFoodItem?.source,
    enrichmentSource: (currentFoodItem as any)?.enrichmentSource,
    adapterIngredientsLength: ingredientsList.length,
    adapterFirst3: ingredientsList.slice(0, 3),
    cardIngredientsLength: ingredientsList.length,
    cardLayoutClass: 'food-confirm-card with-stable-panels',
    hasIngredients,
    providerRef: normalizedItem.providerRef,
    portionSource: normalizedItem.portionSource,
    classId: normalizedItem.classId
  });
  
  // Log for diagnostics
  console.log('[CONFIRM][LAYOUT]', {
    providerRef: normalizedItem.providerRef,
    portionSource: normalizedItem.portionSource,
    classId: normalizedItem.classId,
    hasIngredients: hasIngredients,
    ingredientsLength: ingredientsList.length,
    cardLayoutClass: 'food-confirm-card with-stable-panels'
  });
  
  // Normalize name at render level with extractName utility
  const rawName = currentFoodItem?.name ?? 'Unknown Product';
  const normalizedName = extractName({ name: rawName }) || (isBarcodeItem ? `Product ${(currentFoodItem as any)?.barcode || 'Unknown'}` : 'Unknown Product');
  const title = sanitizeName(normalizedName);
  
  // Hard-bind imgSrc in the header (derive once)
  const imgSrc =
    currentFoodItem?.imageUrl ??
    null;
  
  console.debug('[IMG][CARD][BIND]', { name: currentFoodItem?.name, url: imgSrc });
  console.debug('[CSP][IMG] ready', { src: imgSrc });
  
  // Store/selector proof
  console.debug('[IMG][STORE]', currentFoodItem?.name, currentFoodItem?.imageUrl);
  
  // Add layout check and feature flag logging
  useEffect(() => {
    console.debug('[FLAG][MANUAL_CHEAP_ONLY]', FEAT_MANUAL_CHEAP_ONLY);
    console.debug('[IMG][LAYOUT]', { hasOverlay: !!document.querySelector('.image-overlay') });
    
    // Runtime self-test helper
    (window as any).__probe = () => {
      const el = document.querySelector('[data-test="confirm-food-img"]');
      console.log('[PROBE][IMG-ELEM]', !!el, el?.getAttribute('src'));
      
      const s = (window as any).__stores?.nutrition?.getState?.() || {};
      console.log('[PROBE][STATE]', {
        current: s.currentFoodItem?.name,
        url: s.currentFoodItem?.imageUrl,
        attr: s.currentFoodItem?.imageAttribution
      });
    };
  }, []);
  
  useEffect(() => {
    if (currentFoodItem) {
      console.debug('[confirm] food.imageUrl=', currentFoodItem?.imageUrl, 'resolved=', imgSrc, 'source=', currentFoodItem?.source, 'attribution=', currentFoodItem?.imageAttribution);
    }
  }, [currentFoodItem?.imageUrl, imgSrc, currentFoodItem?.source, currentFoodItem?.imageAttribution]);

  // Serving grams and label - use consistent gram-based labeling
  const servingG = preferItem
    ? ((currentFoodItem as any)?.servingGrams ?? (isBarcodeSource ? 100 : null))
    : (currentFoodItem?.portionGrams ?? null);
  
  // Always show grams in serving label for consistency
  const servingLabel = `${actualServingG}g`;

  console.log('[SERVING][FINAL]', { isBarcodeSource, bypassHydration, preferItem, servingG, servingLabel });
  console.log('[PORTION][SOURCE]', (currentFoodItem as any)?.portionSource || (isBarcodeItem ? 'UPC' : 'unknown'));

  const servingText = (currentFoodItem as any)?.servingText as string | undefined;
  const grams = Math.round(servingG ?? 100);
  
  // Prefer real serving grams, then servingText, then fallback
  const subtitle = (isBarcodeItem || isTextItem) ? (
    (servingG && servingG !== 100) ? `Per serving (${servingG} g)` :
    servingText ? `Per portion (${servingText})` :
    'Per 100 g'
  ) : (servingG ? `${servingG} g per portion` : 'Per portion (unknown size)');
  
  // Legacy compatibility  
  const displayName = title;
  
  // Add image diagnostics logging
  console.log('[CONFIRM][IMAGE]', {
    has: !!resolvedSrc,
    urls: imageUrls.length,
    using: resolvedSrc,
    providerRef: (currentFoodItem as any)?.providerRef
  });

  // Pre-load image to avoid flash
  useEffect(() => {
    if (resolvedSrc) {
      const img = new Image();
      img.src = resolvedSrc;
    }
  }, [resolvedSrc]);

  // Check if this is an unknown product that needs manual entry
  const isUnknownProduct = (currentFoodItem as any)?.isUnknownProduct;
  const hasBarcode = !!(currentFoodItem as any)?.barcode;

  useEffect(() => {
    const url = resolvedSrc ?? '';
    const imageUrlKind = /^https?:\/\//i.test(url) ? 'http' : 'none';
    const isBarcode = !!(currentFoodItem as any)?.barcode || !!(currentFoodItem as any)?._provider;
    console.log('[CONFIRM][MOUNT]', {
      rev: CONFIRM_FIX_REV,
      name: displayName,
      nameType: typeof currentFoodItem?.name, // Add diagnostic logging
      imageUrlKind: !!resolvedSrc ? "http" : "none",
      url: (resolvedSrc || "").slice(0, 120),
    });
    
    if (isBarcode && isOpen) {
      console.log('[CONFIRM][MOUNT][BARCODE]', { id: currentFoodItem?.name, name: currentFoodItem?.name, nameType: typeof currentFoodItem?.name });
    }
  }, [resolvedSrc, displayName, isOpen, currentFoodItem]);

  // Stabilize: directly sync from prop without null flip
  useEffect(() => {
    setCurrentFoodItem(foodItem);
    setSelectedCandidate(null); // Reset candidate selection when food item changes
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
      console.log('[CONFIRM][READY_TO_HIDE_OVERLAY]');
      requestAnimationFrame(() => setTimeout(() => {
        onVoiceAnalyzingComplete();
      }, 150));
    }
  }, [isOpen, currentFoodItem, onVoiceAnalyzingComplete]);

  // Card binds store-first (diagnostic only, no UI change)
  // For v3 manual/voice items, use the new hydrator
  useEffect(() => {
    if (!currentFoodItem?.id) return;
    
    // Check if this is a v3 manual/voice item that needs hydration
    const isV3ManualVoice = ENABLE_FOOD_TEXT_V3_NUTR && isManualVoiceSource && !perGramReady;
    
    if (isV3ManualVoice) {
      console.log('[NUTRITION][HYDRATE]', { 
        key: currentFoodItem?.nutritionKey, 
        ready: !!currentFoodItem?.perGram 
      });
      
      // Use v3 hydrator for manual/voice items
      const controller = new AbortController();
      
      hydrateNutritionV3(currentFoodItem, { 
        signal: controller.signal, 
        preferGeneric: true 
      }).then(result => {
        if (controller.signal.aborted) return;
        
        // Update the current food item with hydrated nutrition
        setCurrentFoodItem(prev => prev ? ({
          ...prev,
          perGram: result.perGram,
          perGramKeys: result.perGramKeys,
          pgSum: 1, // Mark as hydrated
          dataSource: result.dataSource
        }) : null);
        
        console.log('[NUTRITION][V3][SUCCESS]', {
          dataSource: result.dataSource,
          perGramKeys: result.perGramKeys.length,
          isEstimated: result.isEstimated
        });
      }).catch(error => {
        if (controller.signal.aborted) return;
        console.error('[NUTRITION][V3][ERROR]', error);
      });
      
      return () => controller.abort();
    } else {
      // Legacy store binding for non-v3 items
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
    }
  }, [currentFoodItem?.id, currentFoodItem?.name, isManualVoiceSource, perGramReady]);

  // Handle candidate selection with logging and hydration
  const handleCandidateSelect = async (candidate: any, index: number) => {
    console.log('[CONFIRM][ALT:SELECT]', {
      from: currentFoodItem?.name,
      to: candidate.name,
      index
    });
    
    setPrevItem(currentFoodItem); // remember current
    setSelectedCandidate(candidate);
    
    // For v3 candidates, use their pre-calculated values
    if (candidate.servingG) {
      console.log('[CONFIRM][ALT:HYDRATE:READY]', {
        name: candidate.name,
        servingG: candidate.servingG
      });
      
      setCurrentFoodItem({
        ...currentFoodItem!,
        name: candidate.name,
        calories: candidate.calories,
        protein: candidate.protein,
        carbs: candidate.carbs,
        fat: candidate.fat,
        fiber: candidate.fiber,
        sugar: candidate.sugar,
        sodium: candidate.sodium,
        imageUrl: candidate.imageUrl,
        portionGrams: candidate.servingG
      });
    } else {
      // Fallback for legacy candidates - would need hydration
      const portionEstimate = originalText ? 
        inferPortion(candidate.name, originalText, undefined, candidate.classId) :
        { grams: 100, unit: 'portion', displayText: '100g portion', source: 'custom_amount' as const };
      
      setCurrentFoodItem({
        ...currentFoodItem!,
        name: candidate.name,
        calories: candidate.calories,
        protein: candidate.protein,
        carbs: candidate.carbs,
        fat: candidate.fat,
        fiber: candidate.fiber,
        sugar: candidate.sugar,
        sodium: candidate.sodium,
        imageUrl: candidate.imageUrl,
        portionGrams: portionEstimate.grams
      });
    }
  };

  // Guard content rendering ONLY; hooks already executed
  if (!ready) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Always render dialog, show loading state if nutrition isn't ready

  const portionMultiplier = portionPercentage[0] / 100;
  
  // Helper for scaling
  function scale(val: number, f: number) { return Math.round(val * f * 10) / 10; }

  // Calculate effective nutrients - prefer foodItem data for barcode items
  const base = currentFoodItem.basePer100; // per-100g baseline
  const gramsFactor = currentFoodItem.factor ?? 1; // portionGrams/100 at 100% slider
  const sliderFraction = portionMultiplier; // 0..1 (0%, 25%, 50%, 75%, 100%)

  // Helper for scaling per-100g values to serving when serving fields missing
  const scaleFrom100g = (val100?: number, grams?: number) =>
    typeof val100 === 'number' && typeof grams === 'number'
      ? Math.round((val100 * grams) / 100)
      : undefined;

  // Get base nutrition values - prefer serving data for barcode items
  const baseCalories = preferItem 
    ? ((currentFoodItem as any)?.calories_serving ?? (currentFoodItem as any)?.calories ?? 0) 
    : currentFoodItem.calories;
  const baseProtein = preferItem 
    ? ((currentFoodItem as any)?.protein_g_serving ?? (currentFoodItem as any)?.protein_g ?? 0) 
    : currentFoodItem.protein;
  const baseCarbs = preferItem 
    ? ((currentFoodItem as any)?.carbs_g_serving ?? (currentFoodItem as any)?.carbs_g ?? 0) 
    : currentFoodItem.carbs;
  const baseFat = preferItem 
    ? ((currentFoodItem as any)?.fat_g_serving ?? (currentFoodItem as any)?.fat_g ?? 0) 
    : currentFoodItem.fat;
  const baseFiber = preferItem 
    ? ((currentFoodItem as any)?.fiber_g_serving ?? (currentFoodItem as any)?.fiber_g ?? 0) 
    : currentFoodItem.fiber;
  const baseSugar = preferItem 
    ? ((currentFoodItem as any)?.sugar_g_serving ?? (currentFoodItem as any)?.sugar_g ?? 0) 
    : currentFoodItem.sugar;
  const baseSodium = preferItem 
    ? ((currentFoodItem as any)?.sodium_mg_serving ?? (currentFoodItem as any)?.sodium_mg ?? 0) 
    : currentFoodItem.sodium;

  // Add macro mode logging
  console.log('[CONFIRM][MACROS_MODE]', (currentFoodItem as any)?.macro_mode || 'UNKNOWN');

  const effective = basisPerGram && Object.keys(basisPerGram).length > 0
    ? {
        // Use normalized per-gram data with portion scaling
        calories: headerKcal,
        protein: proteinG,
        carbs: carbsG,
        fat: fatG,
        fiber: fiberG,
        sugar: sugarG,
        sodium: Math.round(getPG('sodium') * scaleMult * 1000), // convert to mg
      }
    : base && !preferItem
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

  console.log('[CONFIRM][RENDER_GUARD]', {
    inputSource: 'undefined', // keeping minimal as requested  
    showConfirmation: isOpen,
    forceConfirm,
    hasItem: !!currentFoodItem,
    itemId: currentFoodItem?.id,
    itemName: currentFoodItem?.name,
    kcal: currentFoodItem?.calories,
  });

  // Temporary diagnostic: Bind values
  console.log('[CONFIRM][BIND]', {
    title,
    preferItem,
    kcal: headerKcal,
    protein: proteinG,
    source: (currentFoodItem as any)?.source,
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
    
    // Health flags input logging
    const tokensLen = ingredientsText.split(/\s+/).filter(Boolean).length;
    const hasAnalysisTags = !!(food as any)?.ingredients_analysis_tags;
    
    console.log('[HEALTH][IN]', { 
      tokensLen, 
      lang: 'unknown', // Would need language detection
      usingAnalysisTags: hasAnalysisTags,
      allergens: (food as any)?.allergens?.slice(0, 5) || [],
      additives: (food as any)?.additives?.slice(0, 5) || [],
      ingredientsTextLen: ingredientsText.length
    });
    
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
      case 'gpt-individual':
      case 'gpt-fallback':
      case 'ai-estimate':
      case 'ai_estimate':
      case 'multi-ai-fallback':
        return 'AI estimate';
      default:
        return '';
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
      
      // Fire confetti immediately on success
      requestAnimationFrame(() => {
        const t0 = performance.now();
        confetti();
        console.info('[CONFETTI]', { dt: performance.now() - t0 });
      });
      
      // Success animation delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
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

  // Honor forceConfirm - cannot be overridden by downstream logic
  const dialogOpen = forceConfirm === true || isOpen;

  // Add CONFIRM BIND log - log what we receive
  const isGeneric = (currentFoodItem as any)?.isGeneric;
  const provider = (currentFoodItem as any)?.provider;
  const chip = (isGeneric === true || provider === 'generic') ? 'generic' : 'brand';
  const basis = isPerGramBasis ? 'per-gram' : 'per-100g';
  const servingGrams = actualServingG;
  const ingredientsLength = ingredientsList.length;
  
  console.log('[CONFIRM][BIND]', { 
    chip, 
    basis, 
    servingG: servingGrams, 
    ingredientsLength,
    isGeneric,
    provider,
    sourceFlags: (currentFoodItem as any)?.selectionFlags || currentFoodItem?.flags
  });
  
  // Also add slider change logging
  useEffect(() => {
    console.log('[CONFIRM][SCALING]', {
      basisChosen: isPerGramBasis ? 'per-gram' : 'per-100g',
      baseServingG: actualServingG,
      uiServingLabel: servingLabel,
      sliderG: actualServingG,
      sourcePaths: {
        perGram: !!basisPerGram,
        basePer100: !!(currentFoodItem as any)?.basePer100,
        perPortion: !!(currentFoodItem as any)?.basePerPortion
      },
      inputs: {
        perServingMacros: (currentFoodItem as any)?.label?.macrosPerServing,
        servingSizeG: (currentFoodItem as any)?.label?.servingSizeG,
        basePer100: (currentFoodItem as any)?.basePer100,
        perGram: basisPerGram
      },
      outputs: { kcal: headerKcal, proteinG, carbsG, fatG },
      scaleMult,
      dataSource: dataSource || 'unknown',
      trigger: 'slider_change'
    });
  }, [portionPercentage[0], isPerGramBasis, actualServingG, servingLabel, basisPerGram, headerKcal, proteinG, carbsG, fatG, scaleMult, dataSource]);

  // Show loading state during transition in multi-item flow
  if (!currentFoodItem && dialogOpen) {
    return (
      <Dialog open={dialogOpen} onOpenChange={totalItems && totalItems > 1 ? undefined : onClose}>
        <DialogContent 
          className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Loading next item</DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">
            Please wait while the next food item is being loaded.
          </DialogDescription>
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
      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          // Prevent closing parent when reminder is open
          if (reminderOpen && !open) return;
          if (totalItems && totalItems > 1) return;
          
          // Don't block explicit user Cancel - only prevent ESC/outside clicks with forceConfirm
          console.log('[CANCEL][CLICK]');
          onClose();
          console.log('[CANCEL][DONE]');
        }}
      >
        <DialogContent 
          className="food-confirm-card with-stable-panels max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden max-h-[90vh] flex flex-col"
          showCloseButton={false}
          data-dialog-root="confirm-food-log"
          onEscapeKeyDown={(e) => forceConfirm && e.preventDefault()}
          onInteractOutside={(e) => forceConfirm && e.preventDefault()}
          aria-describedby={descId}
        >
          <DialogHeader className="sr-only">
            <DialogTitle id={titleId}>Confirm Food Log</DialogTitle>
          </DialogHeader>
          <DialogDescription id={descId} className="sr-only">
            Review nutrition information and adjust serving size as needed.
          </DialogDescription>
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {/* Manual Entry Enrichment Loading */}
            {(isManual && !readyForManual) ? (
              <div className="space-y-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">Loading enrichment data...</p>
              </div>
            ) : (
              <>
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

            {/* Food Candidates Picker for Manual/Voice with __altCandidates */}
            {(() => {
              const rawAlts = (currentFoodItem as any)?.__altCandidates ?? [];
              const filteredAlts = rawAlts.filter((alt: any) => isRelevantAlt(alt, currentFoodItem));
              const showAltStrip = filteredAlts.length >= 1;
              console.log(showAltStrip ? '[SWAP][STRIP][SHOW]' : '[SWAP][STRIP][HIDE]', { count: filteredAlts.length });
              
              return (candidates && candidates.length > 1) || showAltStrip;
            })() && (
              <div className="mb-6">
                {prevItem && (
                  <div className="mt-2 text-xs">
                    <button
                      type="button"
                      className="underline text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        // revert to previous, then clear
                        setCurrentFoodItem(prevItem);
                        setPrevItem(null);
                        console.log('[SWAP][REVERT]', { to: prevItem?.name });
                      }}
                    >
                      ← Back to "{prevItem?.name ?? 'previous'}"
                    </button>
                  </div>
                )}
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Not right? Try another match:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {/* Show filtered v3 alt candidates if available, otherwise use prop candidates */}
                  {(() => {
                    const rawAlts = (currentFoodItem as any)?.__altCandidates ?? [];
                    const filteredAlts = rawAlts.filter((alt: any) => isRelevantAlt(alt, currentFoodItem));
                    const candidateList = filteredAlts.length > 0 ? filteredAlts : (candidates || []);
                    
                    return candidateList.slice(0, 6).map((candidate: any, index: number) => (
                      <button
                        key={candidate.id}
                        onClick={() => handleCandidateSelect(candidate, index)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          index === 0 
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-emerald-300'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {candidate.name}
                        </div>
                         <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-nowrap overflow-hidden">
                           <span className="flex-shrink-0 truncate max-w-32">{candidate.calories} cal</span>
                            <span className={`flex-shrink-0 truncate max-w-32 text-xs ${
                              labelFromFlags(candidate.flags || {}) === 'Generic' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-orange-600 dark:text-orange-400'
                            }`}>
                              {labelFromFlags(candidate.flags || {})}
                            </span>
                         </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Food Item Display with Hard-Bound Avatar */}
            <div className="confirm-card-header flex items-center space-x-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl" style={{ position: 'relative' }}>
              <div className="confirm-avatar" style={{ position: 'relative', width: 64, height: 64, overflow: 'hidden' }}>
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={currentFoodItem?.name ?? 'food'}
                    data-test="confirm-food-img"
                    onLoad={(e) =>
                      console.debug('[IMG][LOAD]', imgSrc, {
                        w: e.currentTarget.naturalWidth,
                        h: e.currentTarget.naturalHeight
                      })
                    }
                    onError={(e) => {
                      console.warn('[IMG][ERROR]', imgSrc, e);
                      (e.currentTarget as HTMLImageElement).src = buildInitialsDataUrl(currentFoodItem?.name ?? 'food');
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 12,
                      zIndex: 1
                    }}
                  />
                ) : (
                  <img
                    src={buildInitialsDataUrl(displayName)}
                    alt={displayName}
                    data-test="confirm-food-fallback"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 12,
                      zIndex: 1
                    }}
                  />
                )}

                {/* Temporary: 24px control image to prove painting path */}
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg"
                  alt="control"
                  data-test="confirm-img-control"
                  style={{ position: 'absolute', left: -9999, width: 24, height: 24 }}
                  onLoad={() => console.debug('[IMG][HARD][LOAD] control ok')}
                  onError={() => console.warn('[IMG][HARD][ERROR] control failed')}
                />

                {/* Brand badge must NEVER block clicks or cover image */}
                <div className="brand-badge" style={{ position: 'absolute', right: -6, top: -6, zIndex: 2, pointerEvents: 'none' }}>
                  <DataSourceChip
                    source={currentFoodItem?.enrichmentSource || currentFoodItem?.source || 'unknown'}
                    confidence={currentFoodItem?.enrichmentConfidence || currentFoodItem?.confidence}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {displayName}
                  </h3>
                  {/* Brand/Generic truth chip (NOT provider source) */}
                  {chipVariant !== 'hidden' && (
                    <Badge variant={badgeVariant} className="ml-2">{chipLabel}</Badge>
                  )}
                </div>
                 <p className="text-sm text-gray-600 dark:text-gray-400">
                    {Number.isFinite(headerKcal) ? headerKcal : 0} calories
                  </p>
                 {((currentFoodItem as any)?.enrichmentSource === "ESTIMATED" || 
                   ((currentFoodItem as any)?.enrichmentConfidence && (currentFoodItem as any).enrichmentConfidence < 0.7)) && (
                   <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                     Estimated — tap to adjust if needed
                   </p>
                 )}
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

            {/* Loading State for Nutrition Hydration */}
            {(!isNutritionReady && useHydration && !skipNutritionGuard) && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Loading nutrition data...
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Please wait while we fetch detailed nutrition information
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs for Nutrition and Health */}
            <Tabs defaultValue="nutrition" className="mb-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <TabsTrigger value="nutrition" className="rounded-xl">Nutrition</TabsTrigger>
                <TabsTrigger value="health" className="rounded-xl">Health Check</TabsTrigger>
                <TabsTrigger value="ingredients" className="rounded-xl">
                  Ingredients
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="nutrition" className="space-y-3 mt-4">
                
                {/* Show skeleton when nutrition is loading */}
                {(!isNutritionReady && useHydration && !skipNutritionGuard) ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded mx-auto mb-2 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="w-8 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                          <div className="w-6 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                        <div className="text-lg">🥩</div>
                         <div className="text-sm font-medium text-gray-900 dark:text-white">
                           {Number.isFinite(adjustedFood.protein) ? adjustedFood.protein : 0}g
                         </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Protein</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                        <div className="text-lg">🍞</div>
                         <div className="text-sm font-medium text-gray-900 dark:text-white">
                           {Number.isFinite(adjustedFood.carbs) ? adjustedFood.carbs : 0}g
                         </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Carbs</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="text-lg">🧈</div>
                         <div className="text-sm font-medium text-gray-900 dark:text-white">
                           {Number.isFinite(adjustedFood.fat) ? adjustedFood.fat : 0}g
                         </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Fat</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400">Fiber</span>
                        <span className="font-medium">{Number.isFinite(adjustedFood.fiber) ? adjustedFood.fiber : 0}g</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400">Sugar</span>
                        <span className="font-medium">{Number.isFinite(adjustedFood.sugar) ? adjustedFood.sugar : 0}g</span>
                      </div>
                    </div>

                  </>
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
                           
              </TabsContent>
              
              <TabsContent value="ingredients" className="space-y-4 mt-4">
                {/* Enhanced ingredients tab with OFF analysis indicator */}
                {import.meta.env.DEV && (currentFoodItem as any)?.ingredients_analysis_tags?.length > 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                    <span>✓</span>
                    <span>Using label analysis</span>
                  </div>
                )}
                
                 <div className="ingredients-panel min-h-24">
                    {/* B. Show loading state for lazy fetch */}
                    {(!hasIngredients && !(currentFoodItem as any)?.ingredientsUnavailable && !lazyIngredients?.ingredientsUnavailable) && (
                      <div className="text-center py-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Fetching label…
                        </div>
                      </div>
                    )}
                   {ingredientsList.length > 0 ? (
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

                      {/* Ingredients List Display */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Ingredients List:
                        </h4>
                        <ul className="space-y-1">
                          {ingredientsList.map((ingredient: string, index: number) => (
                            <li key={index} className="text-xs text-gray-700 dark:text-gray-300">
                              • {ingredient}
                            </li>
                          ))}
                        </ul>
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
                    <div className="text-center py-6">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                       {(currentFoodItem?.ingredientsUnavailable || lazyIngredients?.ingredientsUnavailable) ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            No label data available
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            No provider label found for this item.
                          </p>
                        </div>
                       ) : !lazyIngredients?.isLoading && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            No ingredients information available yet
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
                    </div>
                  )}
                </div>
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
                      type="button"
                      variant="outline"
                      onClick={withSafeCancel(() => {
                        console.log('[CANCEL][CLICK]', { component: 'FoodConfirmationCard', action: 'cancel-all' });
                        onCancelAll?.();
                        console.log('[CANCEL][DONE]', { component: 'FoodConfirmationCard', action: 'cancel-all' });
                      })}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={withSafeCancel(() => {
                      console.log('[CANCEL][CLICK]', { component: 'FoodConfirmationCard' });
                      onClose(); // Triggers Radix close & focus restore
                      onCancel?.(); // Parent cleanup
                      console.log('[CANCEL][DONE]', { component: 'FoodConfirmationCard' });
                    })}
                    className="w-full border-gray-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Cancel
                  </Button>
                  
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
            </>
            )}
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

      {/* Debug Overlay */}
      {(new URLSearchParams(window.location.search).get('debug') === 'confirm' || 
        localStorage.getItem('debugConfirm') === 'true') && (
        <div className="fixed top-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg max-w-sm z-50 font-mono">
          <div className="mb-2 font-bold text-yellow-400">🔍 Debug Overlay</div>
          <div><strong>Route:</strong> FoodConfirmationCard</div>
          <div><strong>Git SHA:</strong> 2025-09-11-fix</div>
          <div><strong>Source:</strong> {currentFoodItem?.source}</div>
          <div><strong>Enrichment:</strong> {(currentFoodItem as any)?.enrichmentSource}</div>
          <div><strong>Ingredients:</strong> {ingredientsList.length} items</div>
          <div><strong>First 3:</strong> {ingredientsList.slice(0, 3).join(', ') || 'none'}</div>
          <div><strong>hasIngredients:</strong> {hasIngredients.toString()}</div>
          <div><strong>Layout Class:</strong> {cardLayoutClass}</div>
          <div><strong>Provider:</strong> {normalizedItem.providerRef}</div>
          <div><strong>Portion Source:</strong> {normalizedItem.portionSource}</div>
          <div className="mt-2 text-xs text-gray-400">
            window.__dumpConfirmState() for full data
          </div>
        </div>
      )}
    </>
  );
};

// Global debug function
if (typeof window !== 'undefined') {
  // Need access to component state - will be set from inside component
}

export default FoodConfirmationCard;
