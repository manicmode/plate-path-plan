import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogHeader, DialogClose } from '@/components/ui/dialog';
import { withSafeCancel } from '@/lib/ui/withSafeCancel';
import AccessibleDialogContent from '@/components/a11y/AccessibleDialogContent';
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
import type { NutritionThresholds } from '@/lib/health/flagRules';
import { useNutritionStore } from '@/stores/nutritionStore';
// Add the FoodCandidate type import
import type { Candidate } from '@/lib/food/search/getFoodCandidates';
import { inferPortion } from '@/lib/food/portion/inferPortion';
import { FOOD_TEXT_DEBUG, ENABLE_FOOD_TEXT_V3_NUTR, F } from '@/lib/flags';
import { extractName } from '@/lib/debug/extractName';
import { hydrateNutritionV3 } from '@/lib/nutrition/hydrateV3';
import { DialogTitle } from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { sanitizeName } from '@/utils/helpers/sanitizeName';

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
  ingredients?: Array<{ name: string; grams?: number; amount?: string }>; // Add ingredients property
  source?: string; // Nutrition data source (branded-database, usda, openfoodfacts, ai-estimate, etc.)
  confidence?: number; // Confidence score for the nutrition estimation
  enrichmentSource?: string; // Add enrichment metadata
  enrichmentConfidence?: number; // Add enrichment confidence
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
}

interface FoodConfirmationCardProps {
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

const FoodConfirmationCard: React.FC<FoodConfirmationCardProps> = ({
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
  // Update FoodConfirmationCard to use enrichment for confirm flow
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichedItem, setEnrichedItem] = useState<FoodItem | null>(null);

  // Add enrichment effect for confirm flow
  useEffect(() => {
    if (!currentFoodItem || enrichedItem) return;
    
    // Check if we should enrich using new unified flags
    const shouldEnrich = F.ENRICH_CONFIRM_ENRICH || (typeof window !== 'undefined' && /[?&]QA_ENRICH=1/.test(window.location.search));
    
    if (!shouldEnrich) {
      setEnrichedItem(currentFoodItem);
      return;
    }

    let cancelled = false;
    setEnrichmentLoading(true);
    
    const enrichSelected = async (item: FoodItem) => {
      try {
        // Call the edge client directly
        const { callEnrichment } = await import('@/lib/enrich/edgeClient');
        const result = await callEnrichment(item.name, { context: 'manual' });
        
        if (result?.data && !result.fallback) {
          // Convert enriched result to FoodItem format  
          const { enrichedToFoodItem } = await import('@/hooks/useManualFoodEnrichment');
          return enrichedToFoodItem(result.data, item.portionGrams || 100);
        }
        return item;
      } catch (error) {
        console.warn('[ENRICH] Failed, using original:', error);
        return item;
      }
    };

    enrichSelected(currentFoodItem).then((result) => {
      if (!cancelled) { 
        setEnrichedItem(result); 
        setEnrichmentLoading(false); 
      }
    }).catch((error) => { 
      if (!cancelled) {
        // Fail-open: use original item if enrichment fails
        console.warn('[ENRICH] Failed, using original item:', error);
        setEnrichedItem(currentFoodItem);
        setEnrichmentLoading(false); 
      }
    });
    
    return () => { cancelled = true; };
  }, [currentFoodItem, enrichedItem]);
  
  // Prompt B: Reversible Confirm choice - stable candidate options with initial item at index 0
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  
  // Build stable candidateOptions array (initial item + alternates)
  const candidateOptions = useMemo(() => {
    if (!foodItem) return [];
    
    const options = [foodItem]; // Initial item at index 0
    
    // Add alternates from __altCandidates (v3) or candidates prop
    const rawAlts = (foodItem as any)?.__altCandidates ?? [];
    const filteredAlts = rawAlts.filter((alt: any) => isRelevantAlt(alt, foodItem));
    const altCandidates = filteredAlts.length > 0 ? filteredAlts : (candidates || []);
    
    // Add alternates (excluding duplicates by name)
    const existingNames = new Set([foodItem.name]);
    altCandidates.forEach((alt: any) => {
      if (!existingNames.has(alt.name)) {
        options.push(alt);
        existingNames.add(alt.name);
      }
    });
    
    return options;
  }, [foodItem, candidates]);
  
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

  // Callback for candidate chip selection
  const handleCandidateChipSelect = useCallback((idx: number) => {
    setSelectedCandidateIndex(idx);
  }, []);

  // Derive a stable ID from props (not from transient state)
  const foodId = foodItem?.id ?? null;

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

  // Nutrition sanitizer helper
  type MaybeNum = number | null | undefined;
  const num = (v: MaybeNum) =>
    (typeof v === 'number' && Number.isFinite(v)) ? v : null;

  function sanitizeNutrition<T extends Record<string, any>>(item: T) {
    const per100gCal = num(item?.per100g?.calories);
    const perGramCal = num(item?.perGram?.calories) ?? (per100gCal != null ? per100gCal / 100 : null);
    const servingG = num(item?.perServing?.serving_grams) ?? num(item?.serving_grams);

    return {
      ...item,
      per100g: per100gCal != null ? { calories: per100gCal } : null,
      perGram: perGramCal != null ? { calories: perGramCal } : null,
      perServing: servingG != null ? { serving_grams: servingG } : null,
    };
  }

  // Apply safety sanitization using unified helper
  const current = useMemo(
    () => sanitizeNutrition(candidateOptions[selectedCandidateIndex] ?? {}),
    [candidateOptions, selectedCandidateIndex]
  );

  // Zustand selector MUST run unconditionally on every render
  const storeAnalysis = useNutritionStore(
    s => (foodId ? s.byId[foodId] : undefined)
  );

  // Optional helpers (no new hooks below guards) 
  const perGram = storeAnalysis?.perGram || {};
  const perGramSum = Object.values(perGram).reduce((a: number, v: any) => a + (Number(v) || 0), 0);

  // Detect barcode immediately from stable signals present on first render
  const isBarcodeSource = !!(
    (current as any)?.source === 'barcode' ||
    (current as any)?.id?.startsWith?.('bc:') ||
    (current as any)?.barcode
  );

  // Detect manual/voice sources for v3 handling
  const isManualVoiceSource = !!(
    (current as any)?.__source === 'manual' || 
    (current as any)?.__source === 'voice' ||
    (current as any)?.source === 'manual' || 
    (current as any)?.source === 'speech'
  );

  const useHydration = !bypassHydration;

  // Check if nutrition is ready from various sources
  const perGramReady =
    !!current?.perGram ||
    (Array.isArray((current as any)?.perGramKeys) && (current as any).perGramKeys.length > 0) ||
    (typeof (current as any)?.pgSum === 'number' && (current as any).pgSum > 0);

  const isNutritionReady = perGramReady
    || ((useHydration && !isBarcodeSource) ? (perGramSum > 0) : true);

  // Defensive render guard - readiness check
  const hasPerUnit = !!current?.perGram?.calories || !!current?.per100g?.calories;
  const ready = hasPerUnit && !!current;
  
  // Show loading state inside dialog, not early return
  const showLoader = enrichmentLoading || (!ready && !skipNutritionGuard) || isProcessingFood;
  
  // Log mount and hydration states
  useEffect(() => {
    if (isOpen && current) {
      const source = (current as any)?.__source || (current as any)?.source || 'unknown';
      console.log('[CONFIRM][MOUNT]', {
        source,
        useHydration,
        isNutritionReady,
        isManualVoice: isManualVoiceSource,
        hasPer100g: !!current?.per100g,
        hasPerGram: !!current?.perGram
      });
      
      if (!isNutritionReady && useHydration) {
        console.log('[CONFIRM][HYDRATE:PENDING]');
      }
    }
  }, [isOpen, current, useHydration, isNutritionReady, isManualVoiceSource]);

  // Log when hydration completes
  useEffect(() => {
    if (isNutritionReady && useHydration && isOpen) {
      console.log('[CONFIRM][HYDRATE:READY]');
    }
  }, [isNutritionReady, useHydration, isOpen]);

  
  // V3 nutrition hydration for manual/voice items
  useEffect(() => {
    if (!(current as any)?.id || !isManualVoiceSource || !ENABLE_FOOD_TEXT_V3_NUTR) return;
    if (perGramReady) return; // Skip if already ready
    
    const controller = new AbortController();
    
    console.log('[NUTRITION][V3][START]', { 
      name: (current as any).name, 
      id: (current as any).id 
    });
    
    hydrateNutritionV3(current, { 
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
  }, [(current as any)?.id, isManualVoiceSource, perGramReady]);

  // Log render guard state for diagnostics
  console.log('[CONFIRM][RENDER_GUARD]', {
    perGramReady,
    fromStore: !!storeAnalysis?.perGram,
    pgSum: currentFoodItem?.pgSum,
    isNutritionReady,
    isManualVoice: isManualVoiceSource
  });

  // Log nutrition readiness
  useEffect(() => {
    if (isNutritionReady && current) {
      const source = perGramReady ? 'item' : 'store';
      const dataSource = (current as any).dataSource || 'unknown';
      const pgKeys = ((current as any).perGramKeys?.length || 0);
      
      console.log('[NUTRITION][READY]', { 
        source, 
        dataSource, 
        pgKeys 
      });
    } else if (!isNutritionReady && current) {
      const reason = !perGramReady && perGramSum === 0 ? 'NO_PER_GRAM_KEYS' : 'UNKNOWN';
      console.log('[NUTRITION][BLOCKED]', { reason });
    }
  }, [isNutritionReady, perGramReady, perGramSum, current]);

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
    (bypassHydration && ((current as any)?.source === 'manual' || (current as any)?.source === 'speech'));

  // Pick the per-gram basis we'll use everywhere below
  const basisPerGram: Record<string, number> | undefined =
    (preferItem ? (current as any)?.perGram : storeAnalysis?.perGram) || undefined;

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
  
  // after you compute current, servingG and sliderPct…
  const actualServingG = Math.max(0, Math.round(((current as any)?.servingGrams ?? 100) * sliderPct));

  // Which basis are we on?
  // v3 manual/voice (canonical / Estimated / legacy_text_lookup) => per 1g
  // legacy store (photo/barcode)       => per 100g
  const dataSource = (current as any)?.dataSource as string | undefined;
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

  console.log('[CONFIRM][SCALING]', {
    basis: isPerGramBasis ? 'per-gram' : 'per-100g',
    servingG: actualServingG,
    mult: scaleMult,
    source: dataSource || 'unknown'
  });

  // Use the helpers when binding values
  const headerKcal = kcal(getPG('calories'));
  const proteinG = g1(getPG('protein'));
  const carbsG = g1(getPG('carbs'));
  const fatG = g1(getPG('fat'));
  const fiberG = g1(getPG('fiber'));
  const sugarG = g1(getPG('sugar'));

  const isBarcodeItem = (currentFoodItem as any)?.source === 'barcode';
  const isTextItem = (currentFoodItem as any)?.source === 'manual' || (currentFoodItem as any)?.source === 'speech';
  
  // Normalize name at render level with extractName utility
  const rawName = currentFoodItem?.name ?? 'Unknown Product';
  const normalizedName = extractName({ name: rawName }) || (isBarcodeItem ? `Product ${(currentFoodItem as any)?.barcode || 'Unknown'}` : 'Unknown Product');
  const title = sanitizeName(normalizedName);

  // Serving grams and label
  const servingG = preferItem
    ? ((currentFoodItem as any)?.servingGrams ?? (isBarcodeSource ? 100 : null))
    : (currentFoodItem?.portionGrams ?? null);
  
  // Remove flag gate - always use real servings when available
  const servingLabel = (isBarcodeSource && servingG && servingG !== 100)
    ? `Per serving (${servingG} g)`
    : (isBarcodeSource ? 'Per 100 g' : 'Per portion (100 g)');

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
      nameType: typeof currentFoodItem?.name, // Add diagnostic logging
      imageUrlKind: validImg ? "http" : "none",
      url: (imgUrl || "").slice(0, 120),
    });
    
    if (isBarcode && isOpen) {
      console.log('[CONFIRM][MOUNT][BARCODE]', { id: currentFoodItem?.name, name: currentFoodItem?.name, nameType: typeof currentFoodItem?.name });
    }
  }, [imgUrl, displayName, isOpen, currentFoodItem]);

  // Stabilize: directly sync from prop without null flip
  // Reset state when foodItem changes
  useEffect(() => {
    setCurrentFoodItem(foodItem);
    setSelectedCandidate(null);
    setSelectedCandidateIndex(0); // Reset to initial item
    setEnrichedItem(null); // Reset enrichment
    setEnrichmentLoading(false);
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

  // Guard content rendering ONLY; hooks already executed
  if (!currentFoodItem) {
    return <span data-guard="no-current-food" />; // minimal placeholder to keep mount stable
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

  // Honor forceConfirm - cannot be overridden by downstream logic
  const dialogOpen = forceConfirm === true || isOpen;

  // Show loading state during transition in multi-item flow
  if (!currentFoodItem && dialogOpen) {
    return (
      <Dialog open={dialogOpen} onOpenChange={totalItems && totalItems > 1 ? undefined : onClose}>
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
        <AccessibleDialogContent 
          className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden"
          title="Confirm Food Log"
          description="We'll save these items to your log."
          showCloseButton={!reminderOpen}
          data-dialog-root="confirm-food-log"
          onEscapeKeyDown={(e) => forceConfirm && e.preventDefault()}
          onInteractOutside={(e) => forceConfirm && e.preventDefault()}
        >
          <VisuallyHidden><DialogTitle>Confirm Food Log</DialogTitle></VisuallyHidden>
          <div className="p-6">
            {/* Show loader when processing */}
            {showLoader && (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full mb-4">
                    <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {enrichmentLoading ? 'Enriching nutrition data...' : 'Loading next item...'}
                  </p>
                  {totalItems > 1 && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Item {((currentIndex ?? 0) + 1)} of {totalItems}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Main content - only show when not loading */}
            {!showLoader && (
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

            {/* Prompt B: Food Candidates Chip Row for Reversible Choice */}
            {candidateOptions.length > 1 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Choose the right match:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {candidateOptions.slice(0, 6).map((candidate: any, index: number) => (
                    <button
                      key={`chip-${index}-${candidate.id || candidate.name}`}
                      onClick={() => handleCandidateChipSelect(index)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                        index === selectedCandidateIndex
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300'
                      }`}
                    >
                      <span className="truncate max-w-[120px] inline-block">
                        {candidate.name}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedCandidateIndex !== 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                      onClick={() => handleCandidateChipSelect(0)}
                    >
                      ← Back to original
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Legacy Food Candidates Picker (kept for backward compatibility) */}
            {candidateOptions.length <= 1 && (() => {
              const rawAlts = (currentFoodItem as any)?.__altCandidates ?? [];
              const filteredAlts = rawAlts.filter((alt: any) => isRelevantAlt(alt, currentFoodItem));
              const showAltStrip = filteredAlts.length >= 1;
              
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
                        onClick={() => handleCandidateChipSelect(candidateList.findIndex(c => c === candidate))}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          index === 0 
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-emerald-300'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {candidate.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                          <span>{candidate.calories} cal</span>
                          {candidate.kind === 'generic' && (
                            <span className="text-green-600 dark:text-green-400 text-xs">Generic</span>
                          )}
                          {candidate.kind === 'brand' && (
                            <span className="text-orange-600 dark:text-orange-400 text-xs">Brand</span>
                          )}
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}

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
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {displayName}
                  </h3>
                  {(currentFoodItem?.source || (currentFoodItem as any)?.enrichmentSource) && (
                    <DataSourceChip 
                      source={(currentFoodItem?.source as any) || (currentFoodItem as any)?.enrichmentSource}
                      confidence={currentFoodItem?.confidence || (currentFoodItem as any)?.enrichmentConfidence}
                      className="ml-2"
                    />
                  )}
                </div>
                 <p className="text-sm text-gray-600 dark:text-gray-400">
                   {Number.isFinite(adjustedFood.calories) ? adjustedFood.calories : 0} calories
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

            {/* Loading State for Enrichment */}
            {enrichmentLoading && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Enriching nutrition data...
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Getting enhanced nutrition information
                    </p>
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
                <TabsTrigger value="nutrition" className="rounded-lg">Nutrition</TabsTrigger>
                <TabsTrigger value="health" className="rounded-lg">Health Check</TabsTrigger>
                <TabsTrigger value="ingredients" className="rounded-lg">Ingredients</TabsTrigger>
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
            {/* Close main content wrapper */}
            </>
          )}
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
