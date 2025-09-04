import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Zap, Info, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewItemCard } from './ReviewItemCard';
import { NumberWheelSheet } from '../inputs/NumberWheelSheet';
import { SaveSetNameDialog } from './SaveSetNameDialog';
import { FF } from '@/featureFlags';
import { createFoodLogsBatch } from '@/api/nutritionLogs';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import LegacyConfirmLoader from '@/components/confirm/LegacyConfirmLoader';
import { setConfirmFlowActive } from '@/lib/confirmFlowState';
import { toLegacyFoodItem } from '@/lib/confirm/legacyItemAdapter';
import { needsHydration, perGramSum, MACROS } from '@/lib/confirm/hydrationUtils';
import { useNutritionStore, generateFoodId } from '@/stores/nutritionStore';
import { useSound } from '@/contexts/SoundContext';
import { lightTap } from '@/lib/haptics';
import { scoreFood } from '@/health/scoring';
import { useReminders } from '@/hooks/useReminders';

export interface ReviewItem {
  name: string;
  portion: string;
  selected: boolean;
  id: string;
  eggSize?: string;
  needsDetails?: boolean; // Flag for showing "Needs details" chip
  mapped?: boolean; // Track if nutrition mapping succeeded
  grams?: number; // For logging and saving
  canonicalName?: string; // For mapping
  portionSource?: 'count' | 'area' | 'base' | 'heuristic';
  portionRange?: [number, number];
}

interface ReviewItemsScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (selectedItems: ReviewItem[]) => void;
  onLogImmediately?: (selectedItems: ReviewItem[]) => void; // One-tap logging
  items: ReviewItem[];
  prefilledItems?: ReviewItem[]; // For prefilling from health report
  afterLogSuccess?: () => void; // Called after successful logging for custom navigation/cleanup
}

export const ReviewItemsScreen: React.FC<ReviewItemsScreenProps> = ({
  isOpen,
  onClose,
  onNext,
  onLogImmediately,
  items: initialItems,
  prefilledItems,
  afterLogSuccess
}) => {
  // Add mount logging for forensic breadcrumbs
  useEffect(() => {
    if (isOpen && import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.log('[DL][CTA] bound');
      console.info('[DL][ReviewItems] mount');
    }
  }, [isOpen]);
  
  // Legacy confirm modal state (per-item rich modal)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalItems, setConfirmModalItems] = useState<any[]>([]);
  const [currentConfirmIndex, setCurrentConfirmIndex] = useState(0);
  const [hydrating, setHydrating] = useState(false);
  
  // Hydration flag and modal state for flash prevention
  const [isHydrating, setIsHydrating] = useState(false);
  
  // Feature flags for safe rollout
  const ENABLE_SST_CONFIRM_READ = true; // Phase 1: unified reads  
  const nutritionStore = useNutritionStore();

  // Navigation with forced hydration per item
  const gotoIndex = (next: number) => {
    const nextItem = confirmModalItems[next];
    // Show loader BEFORE we flip the content, so there's no snap
    const mustHydrate = needsHydration(nextItem) && !nextItem?.__hydrated;

    setHydrating(mustHydrate);
    setCurrentConfirmIndex(next);

    if (mustHydrate) {
      console.log('[HYDRATE][ITEM][START]', { name: nextItem.name, idx: next });
      // Timeout fallback so loader doesn't stick forever
      const fallback = setTimeout(() => setHydrating(false), 2500);

      (async () => {
        try {
          const { resolveGenericFoodBatch } = await import('@/health/generic/resolveGenericFood');
          const [result] = await resolveGenericFoodBatch([nextItem.name]);
          
          if (result) {
            setConfirmModalItems(prev => {
              const copy = [...prev];
              
              // Create enriched item with nutrition from GenericFood
              const enrichedItem = {
                ...copy[next],
                nutrients: result.nutrients,
                serving: result.serving
              };
              
              const merged = toLegacyFoodItem(enrichedItem, next);
              const improved = perGramSum(merged?.nutrition?.perGram) > perGramSum(copy[next]?.nutrition?.perGram);
              copy[next] = improved ? { ...merged, __hydrated: true } : copy[next];
              return copy;
            });
          }
        } catch (err) {
          console.error('[HYDRATE][ITEM][ERROR]', err);
        } finally {
          clearTimeout(fallback);
          setHydrating(false);
          console.log('[HYDRATE][ITEM][END]', { idx: next });
        }
      })();
    }
  };

  // Force hydration on open (even if adapter thinks it's "complete")
  useEffect(() => {
    if (!confirmModalOpen || !confirmModalItems.length) return;

    (async () => {
      const names = confirmModalItems.map(m => m.name);
      console.log('[HYDRATE][OPEN][START]', { names });

      try {
        const { resolveGenericFoodBatch } = await import('@/health/generic/resolveGenericFood');
        const results = await resolveGenericFoodBatch(names);

        console.log('[HYDRATE][OPEN][END]', {
          count: results?.length,
          foundCount: results?.filter(Boolean).length,
          first: results?.[0] ? { slug: results[0].slug, hasNutrients: !!results[0].nutrients } : null
        });

        // CRITICAL: write resolver output to the shared store FIRST
        const storeUpdates: Record<string, any> = {};

        const enrichedItems = confirmModalItems.map((m, i) => {
          const r = results?.[i];
          if (!r) return m;

          const storeId = m.id;

          // 1) merge nutrients for adapter
          const enrichedInput = { ...m, nutrients: r.nutrients, serving: r.serving };
          const merged = toLegacyFoodItem(enrichedInput, storeId, /*strict=*/ true);

          // 2) compute legacy health analysis with the same function Health Report uses
          const perGram = merged.nutrition?.perGram ?? {};
          const portionGrams = merged.portionGrams ?? 100;
          const legacyAnalysis = scoreFood({
            nutrients: {
              calories: (perGram.calories || 0) * portionGrams,
              protein_g: (perGram.protein || 0) * portionGrams,
              carbs_g: (perGram.carbs || 0) * portionGrams,
              fat_g: (perGram.fat || 0) * portionGrams,
              fiber_g: (perGram.fiber || 0) * portionGrams,
              sugars_g: (perGram.sugar || 0) * portionGrams,
              sodium_mg: (perGram.sodium || 0) * portionGrams,
            },
            name: merged.name,
            source: 'barcode'
          });

          // 3) write BOTH nutrients + legacy analysis into the shared store
          storeUpdates[storeId] = {
            perGram: merged.nutrition?.perGram || {},
            healthScore: legacyAnalysis,
            flags: [], // Will be computed by detectFlags in the card
            ingredients: merged.analysis?.ingredients || [],
            imageUrl: merged.analysis?.imageUrl,
            source: 'generic_foods',
            confidence: 0.9,
            __hydrated: true,
            updatedAt: Date.now(),
          };

          // 4) ensure the modal item carries the same analysis fields for immediate render
          return {
            ...merged,
            analysis: {
              ...(merged.analysis ?? {}),
              healthScore: legacyAnalysis,
              flags: [], // Will be computed by detectFlags in the card
              ingredients: merged.analysis?.ingredients || [],
            },
            __hydrated: true,
          };
        });

        if (Object.keys(storeUpdates).length) {
          useNutritionStore.getState().upsertMany(storeUpdates);
          console.log('[SST][WRITE][CONFIRM]', { ids: Object.keys(storeUpdates) });

          const wrote = Object.keys(storeUpdates);
          const read  = enrichedItems.map(it => it.id);
          console.log('[SST][IDS_COMPARE]', {
            wrote, read,
            missingInStore: read.filter(id => !wrote.includes(id)),
            extraInStore:   wrote.filter(id => !read.includes(id)),
          });

          const byId = useNutritionStore.getState().byId;
          console.log('[SST][STORE_AFTER_WRITE]', wrote.map(id => ({
            id,
            hasPerGram: !!byId[id]?.perGram,
            pgSum: Object.values(byId[id]?.perGram || {}).reduce((a: number, b: any) => a + (+b || 0), 0),
            healthScore: byId[id]?.healthScore,
            flags: (byId[id]?.flags ?? []).map((f:any) => f.label),
          })));
        }

        setConfirmModalItems(enrichedItems);
      } catch (e) {
        console.error('[HYDRATE][OPEN][ERROR]', e);
      }
    })();
  }, [confirmModalOpen, confirmModalItems.length]);

  // Hard assertions for debugging
  useEffect(() => {
    const item = confirmModalItems[currentConfirmIndex];
    if (!item) return;
    console.log('[CONFIRM][BINDINGS]', {
      name: item.name,
      pg: item?.nutrition?.perGram,
      pgSum: perGramSum(item?.nutrition?.perGram),
      hydrated: !!item?.__hydrated
    });
  }, [confirmModalItems, currentConfirmIndex]);
  
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [openWheelForId, setOpenWheelForId] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [showSaveSetDialog, setShowSaveSetDialog] = useState(false);
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playFoodLogConfirm } = useSound();
  const { createReminder } = useReminders();

  // Handle meal set reminder creation
  const handleCreateMealSetReminder = async () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) return;

    try {
      const mealSetName = selectedItems.map(i => i.name).join(', ');
      const mealSetData = {
        items: selectedItems.map(item => ({
          name: item.name,
          canonicalName: item.canonicalName || item.name,
          grams: item.grams || 100
        }))
      };

      await createReminder({
        label: `Eat ${mealSetName}`,
        type: 'meal',
        frequency_type: 'daily',
        frequency_value: 1,
        reminder_time: '12:30',
        is_active: true,
        food_item_data: mealSetData,
        channel: 'app',
        payload: { meal_set: true }
      });
      
      toast.success('Meal set reminder created! 🔔');
    } catch (error) {
      console.error('Failed to create reminder:', error);
      toast.error('Failed to create reminder');
      setReminderEnabled(false);
    }
  };

  // Initialize items when modal opens
  useEffect(() => {
    if (isOpen) {
      const itemsToUse = prefilledItems || initialItems;
      console.log('[REVIEW] Initializing with items:', itemsToUse.length, prefilledItems ? '(prefilled)' : '(detected)');
      setItems(itemsToUse.map(item => ({ ...item, selected: true })));
    }
  }, [isOpen, initialItems, prefilledItems]);
  
  // Auto-open when items are set
  React.useEffect(() => {
    if (items.length > 0 && !isOpen) {
      // Items ready but modal not open - this shouldn't happen with atomic handoff
      console.log('Items ready but modal not open');
    }
  }, [items, isOpen]);

  const handleItemChange = (id: string, field: 'name' | 'portion' | 'selected' | 'eggSize' | 'grams', value: string | boolean | number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleAddItem = () => {
    const newItem: ReviewItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      portion: '',
      selected: true
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleNext = () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim() && item.portion.trim());
    if (selectedItems.length === 0) {
      return;
    }
    onNext(selectedItems);
  };

  const handleLogImmediately = async () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to log');
      return;
    }

    setIsLogging(true);

    try {
      console.info('[LYF][one-tap-log]', selectedItems.map(i => ({ 
        name: i.canonicalName || i.name, 
        grams: i.grams || 100 
      })));

      if (import.meta.env.VITE_LOG_DEBUG === 'true') {
        console.info('[LOG][DETAILED][CONFIRM][START]', { count: selectedItems.length });
      }

      // Import here to avoid circular dependencies
      const { oneTapLog } = await import('@/lib/nutritionLog');
      
      const logEntries = selectedItems.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams || 100
      }));

      await oneTapLog(logEntries);
      
      // Emit metrics
      const { incrementCounter } = await import('@/lib/metrics');
      incrementCounter('photo.one_tap_used');
      
      if (import.meta.env.VITE_LOG_DEBUG === 'true') {
        console.info('[LOG][DETAILED][CONFIRM][DONE]');
      }
      
      toast.success(`Logged ✓`);
      onClose();
      
      // Use custom afterLogSuccess callback if provided, otherwise navigate to home
      if (afterLogSuccess) {
        afterLogSuccess();
      } else {
        navigate('/home');
      }
    } catch (error) {
      console.error('Failed to log items:', error);
      toast.error('Failed to log items. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  // Open confirm flow with hydration gate
  const openConfirmFlow = async () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to continue');
      return;
    }

    setIsHydrating(true);
    
    try {
      // Transform items using legacy adapter with SST enabled
      const initialModalItems = selectedItems.map((item, index) => {
        const id = (item as any).foodId ?? item.id ?? generateFoodId(item);
        return toLegacyFoodItem({ ...item, id }, index, ENABLE_SST_CONFIRM_READ);
      });
      
      // Hydrate nutrition data first
      setConfirmModalItems(initialModalItems);
      
      // Wait for proper nutrition data to be loaded
      const { resolveGenericFoodBatch } = await import('@/health/generic/resolveGenericFood');
      const names = initialModalItems.map(m => m.name);
      const results = await resolveGenericFoodBatch(names);
      
      // Process and enrich items with proper nutrition data
      const enrichedItems = initialModalItems.map((item, index) => {
        const result = results?.[index];
        if (!result) return item;
        
        const enrichedInput = { ...item, nutrients: result.nutrients, serving: result.serving };
        const merged = toLegacyFoodItem(enrichedInput, item.id, true);
        
        return {
          ...merged,
          __hydrated: true,
        };
      });
      
      // Only proceed if we have properly hydrated items
      const hasValidNutrition = enrichedItems.some(item => 
        item.nutrition?.perGram && Object.values(item.nutrition.perGram).some(val => val > 0)
      );
      
      if (!hasValidNutrition) {
        throw new Error('Could not load nutrition data');
      }
      
      // Small delay to prevent flicker
      await new Promise(r => setTimeout(r, 500));
      
      // Set flow active to prevent ScanHub navigation
      setConfirmFlowActive(true);
      
      // Update items with enriched data and open modal
      setConfirmModalItems(enrichedItems);
      setCurrentConfirmIndex(0);
      setConfirmModalOpen(true);
      setIsHydrating(false);

      // Close the review screen AFTER starting the flow  
      requestAnimationFrame(() => {
        onClose();
      });
      
    } catch (error) {
      console.error('[HYDRATE][ERROR]', error);
      setIsHydrating(false);
      toast.error('Failed to load nutrition data');
    }
  };

  const handleDetailsMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // @ts-ignore
    e.nativeEvent?.stopImmediatePropagation?.();
    
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.log('[REV][CTA][MDOWN]');
    }

    openConfirmFlow();
  };

  const handleDetailsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Do nothing on click - all logic moved to mouseDown
    e.preventDefault();
    e.stopPropagation();
  };

  const handleConfirmModalComplete = async (foodItem: any) => {
    try {
      playFoodLogConfirm();
      lightTap();
    } catch (error) {
      console.warn('[HAPTIC][ERROR]', error);
    }

    console.log('[CONFIRM][SUCCESS]', {
      itemName: foodItem.name,
      index: currentConfirmIndex,
      timestamp: Date.now()
    });

    try {
      // Import here to avoid circular dependencies
      const { oneTapLog } = await import('@/lib/nutritionLog');
      
      const logEntry = {
        name: foodItem.name,
        canonicalName: foodItem.name,
        grams: Math.round((foodItem.portionGrams || 100) * (foodItem.factor || 1))
      };

      await oneTapLog([logEntry]);
      
      // Check if there are more items
      const isLast = currentConfirmIndex + 1 >= confirmModalItems.length;
      
      if (isLast) {
        // End flow only after the last confirm
        setConfirmFlowActive(false);
        finishConfirmFlow('confirmed');
      } else {
        // Move to next item using hydration-aware navigation
        gotoIndex(currentConfirmIndex + 1);
        setConfirmFlowActive(true);
      }
      
    } catch (error) {
      console.error('[CONFIRM][ERROR]', error);
      
      // Import toast dynamically
      const { toast } = await import('sonner');
      toast.error('Failed to log items. Please try again.');
    }
  };

  const handleConfirmModalReject = () => {
    console.log('[CONFIRM][CANCEL]', {
      totalItems: confirmModalItems?.length,
      timestamp: Date.now()
    });
    setConfirmFlowActive(false);
    finishConfirmFlow('canceled');
  };

  const handleConfirmModalSkip = () => {
    const isLast = currentConfirmIndex + 1 >= confirmModalItems.length;
    console.log('[CONFIRM][SKIP]', { index: currentConfirmIndex });

    if (isLast) {
      setConfirmFlowActive(false);
      finishConfirmFlow('skipped');
    } else {
      // Move to next item using hydration-aware navigation
      gotoIndex(currentConfirmIndex + 1);
      setConfirmFlowActive(true);
    }
  };

  // Ground-truth close function
  const finishConfirmFlow = (reason: 'confirmed' | 'canceled' | 'skipped' = 'confirmed') => {
    setConfirmModalOpen(false);

    (async () => {
      const { toast } = await import('sonner');
      
      if (reason === 'canceled') {
        toast.info('Logging canceled');
      } else if (reason === 'skipped') {
        toast.info(`Skipped ${confirmModalItems.length} item${confirmModalItems.length > 1 ? 's' : ''}`);
      } else {
        toast.success(`Logged ${confirmModalItems.length} item${confirmModalItems.length > 1 ? 's' : ''} ✓`);
      }
    })();

    if (afterLogSuccess) {
      afterLogSuccess();
    } else {
      navigate('/home', { replace: true });
    }
  };


  const handleOpenWheel = (itemId: string) => {
    setOpenWheelForId(itemId);
  };

  const handleWheelChange = (grams: number) => {
    if (openWheelForId) {
      handleItemChange(openWheelForId, 'grams', grams);
      handleItemChange(openWheelForId, 'portion', `${grams}g`);
    }
  };

  const handleWheelClose = () => {
    setOpenWheelForId(null);
  };

  const handleSaveSet = () => {
    if (!user?.id) {
      toast.error('Please log in to save sets');
      return;
    }
    setShowSaveSetDialog(true);
  };

  const handleSaveSetWithName = async (setName: string) => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to save');
      return;
    }

    setIsSavingSet(true);
    try {
      const itemsSnapshot = selectedItems.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams || 100,
        score: 0, // No score available in ReviewItemsScreen
        calories: 0, // No calories available in ReviewItemsScreen  
        healthRating: 'unknown'
      }));

      const { data, error } = await supabase
        .from('saved_meal_set_reports')
        .insert({
          name: setName.trim(),
          overall_score: null, // No overall score available
          items_snapshot: itemsSnapshot,
          report_snapshot: null, // No report data available
          user_id: user.id,
          image_url: null
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      toast.success(`Saved "${setName}" ✓ • View in Saved Reports → Meal Sets`, {
        action: {
          label: 'View',
          onClick: () => navigate('/scan/saved-reports?tab=meal-sets')
        }
      });
      
      setShowSaveSetDialog(false);
    } catch (error) {
      console.error('Failed to save set:', error);
      toast.error('Failed to save set');
    } finally {
      setIsSavingSet(false);
    }
  };

  const selectedCount = items.filter(item => item.selected && item.name.trim()).length;
  const count = items.length;

  // Debug logging  
  console.log('ReviewItemsScreen render - isOpen:', isOpen, 'items count:', items.length, 'selectedCount:', selectedCount);
  
  // Add review open telemetry
  useEffect(() => {
    if (isOpen && items.length > 0) {
      console.info('[REVIEW][open]', 'fullscreen', `count=${items.length}`);
      
      // Log portion details for each item
      items.forEach(item => {
        console.info('[PORTION]', `item=${item.name}`, `grams=${item.grams || 100}`, `source=${item.portionSource || 'est'}`);
      });
    }
  }, [isOpen, items.length]);

  // Background scroll lock effect
  useEffect(() => {
    if (!isOpen) return;
    const { style } = document.body;
    const prev = style.overflow;
    style.overflow = 'hidden';
    return () => { style.overflow = prev; };
  }, [isOpen]);

  return (
    <>
      {/* Show loader while hydrating */}
      {isHydrating && <LegacyConfirmLoader />}
      
      {/* Keep existing modal structure */}
      {!isHydrating && (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black z-[400]" />
            <Dialog.Content
              className="fixed inset-0 z-[500] bg-[#0B0F14] text-white"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => {
                if (confirmModalOpen) e.preventDefault();
              }}
              role="dialog"
              aria-labelledby="review-title"
              aria-describedby=""
            >
              <VisuallyHidden.Root>
                <Dialog.Title id="review-title">Confirm Food Log</Dialog.Title>
              </VisuallyHidden.Root>
              <Dialog.Description id="review-description" className="sr-only">Confirm items and portion sizes</Dialog.Description>

              <div className="flex h-full w-full flex-col">
                {/* Header (sticky) */}
                <header className="sticky top-0 z-10 bg-[#0B0F14] px-5 pt-4 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Review Detected Items ({count})
                  </h2>
                  <p className="text-sm text-gray-400">
                    Check and edit the food items detected in your image.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </header>

              {/* ScrollArea (flex-1, overflow-y-auto) */}
              <div className="flex-1 overflow-y-auto px-5 pb-24">
                {count === 0 ? (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="text-6xl">🍽️</div>
                    <h3 className="text-xl font-semibold text-white">No food detected</h3>
                    <p className="text-gray-400 text-center">
                      Try again, upload from gallery, or add manually.
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-sm pt-4">
                      <Button
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={handleAddItem}
                        variant="outline"
                        className="w-full border-gray-600 text-white hover:bg-white/10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Manually
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Items list
                  <>
                    <div className="space-y-2 pt-4">
                      {items.map((item) => (
                        <ReviewItemCard
                          key={item.id}
                          item={item}
                          canRemove={items.length > 1}
                          onChange={handleItemChange}
                          onRemove={handleRemoveItem}
                          onOpenWheel={handleOpenWheel}
                        />
                      ))}
                    </div>

                    {/* Add food button */}
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={handleAddItem}
                        className="flex items-center space-x-2 border-dashed border-2 border-gray-600 text-white hover:bg-white/10"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Food</span>
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer (sticky) - only show if we have items */}
              {count > 0 && (
                <footer className="sticky bottom-0 z-10 bg-[#0B0F14] px-5 py-4">
                  {/* Meal set reminder toggle */}
                  {selectedCount > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[15px] font-semibold text-white">Set Reminder</div>
                          <div className="text-xs text-white/60">Get reminded to eat this set again</div>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={reminderEnabled}
                            onChange={(e) => {
                              setReminderEnabled(e.target.checked);
                              if (e.target.checked) {
                                handleCreateMealSetReminder();
                              }
                            }}
                          />
                          <div className="h-6 w-11 rounded-full bg-white/20 peer-checked:bg-emerald-500 transition-colors">
                            <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleLogImmediately}
                        disabled={selectedCount === 0 || isLogging}
                        className="h-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold text-base disabled:opacity-50"
                      >
                        {isLogging ? '⏳ Logging...' : `⚡ One-Tap Log (${selectedCount})`}
                      </Button>
                      
                       <Button
                         onMouseDown={handleDetailsMouseDown}
                         onClick={handleDetailsClick}
                         disabled={selectedCount === 0 || isHydrating}
                         className="h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-base disabled:opacity-50"
                       >
                         {isHydrating ? (
                           <>
                             <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                             Loading...
                           </>
                         ) : (
                           '🔎 Review & Log'
                         )}
                       </Button>
                    </div>
                    
                    <Button
                      onClick={handleSaveSet}
                      disabled={selectedCount === 0 || isSavingSet}
                      className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold text-base"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSavingSet ? 'Saving...' : 'Save Set'}
                    </Button>
                  </div>
                  
                  {/* Cancel button full width */}
                  <div className="pt-2">
                    <Button
                      onClick={onClose}
                      variant="outline"
                      size="lg"
                      className="w-full h-12 rounded-xl border-white/20 bg-transparent text-white"
                    >
                      Cancel
                    </Button>
                  </div>

                  {selectedCount > 0 && (
                    <p className="text-center text-xs text-gray-400 mt-2">
                      {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </footer>
              )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* Number Wheel Sheet */}
      <NumberWheelSheet
        open={!!openWheelForId}
        defaultValue={openWheelForId ? (items.find(i => i.id === openWheelForId)?.grams || 100) : 100}
        onChange={handleWheelChange}
        onClose={handleWheelClose}
        min={10}
        max={500}
        step={5}
        unit="g"
      />

      {/* Save Set Name Dialog */}
      <SaveSetNameDialog
        isOpen={showSaveSetDialog}
        onClose={() => setShowSaveSetDialog(false)}
        onSave={handleSaveSetWithName}
      />

      {/* Legacy Rich Food Confirmation Modal */}
      {confirmModalOpen && confirmModalItems[currentConfirmIndex] && !hydrating && (
        <>
          {process.env.NODE_ENV === 'development' && (() => {
            const item = confirmModalItems[currentConfirmIndex];
            console.log('[CONFIRM][BINDINGS]', {
              name: item.name,
              grams: item.grams,
              perGram: item.nutrition?.perGram,
              healthScore: item.analysis?.healthScore,
              flags: item.analysis?.flags?.length,
              ingredients: item.analysis?.ingredients?.length,
              hydrated: (item as any).__hydrated
            });
            return null;
          })()}
          
          <FoodConfirmationCard
            isOpen={confirmModalOpen}
            onClose={handleConfirmModalReject}
            onConfirm={handleConfirmModalComplete}
            onSkip={handleConfirmModalSkip}
            onCancelAll={handleConfirmModalReject}
            foodItem={confirmModalItems[currentConfirmIndex]}
            showSkip={true}
            currentIndex={currentConfirmIndex}
            totalItems={confirmModalItems.length}
          />
        </>
      )}
    </>
  );
};
