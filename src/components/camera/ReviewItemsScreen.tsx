import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Zap, Info, X, Save, Loader2 } from 'lucide-react';
import ConfirmLoaderMinimal from '@/components/ConfirmLoaderMinimal';
import { useReminders } from "@/hooks/useReminders";

function perGramReady(entry?: { perGram?: Record<string, number> }) {
  if (!entry?.perGram) return false;
  // any non-zero nutrient is considered ready
  return Object.values(entry.perGram).some(v => (v ?? 0) > 0);
}
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
import { setConfirmFlowActive } from '@/lib/confirmFlowState';
import { toLegacyFoodItem } from '@/lib/confirm/legacyItemAdapter';
import { needsHydration, perGramSum, MACROS } from '@/lib/confirm/hydrationUtils';
import { useNutritionStore, generateFoodId } from '@/stores/nutritionStore';
import { useSound } from '@/contexts/SoundContext';
import { lightTap } from '@/lib/haptics';
import { scoreFood } from '@/health/scoring';
import { useReminderStore } from '@/stores/reminderStore';
import { useSavedSetsStore } from '@/stores/savedSets';
import { ReminderForm } from '@/components/reminder/ReminderForm';
import { hashMealSet } from '@/utils/reminders';
import { Switch } from '@/components/ui/switch';

type Phase = 'idle' | 'hydrating' | 'ready' | 'open';

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
  context?: 'health-scan' | 'logging'; // NEW: Context to determine save behavior
}

export const ReviewItemsScreen: React.FC<ReviewItemsScreenProps> = ({
  isOpen,
  onClose,
  onNext,
  onLogImmediately,
  items: initialItems,
  prefilledItems,
  afterLogSuccess,
  context = 'logging' // Default to logging context
}) => {
  // Hard block ReviewItemsScreen from manual flow
  if ((context as any) === 'manual') {
    console.info('[GUARD][REVIEW_MODAL] blocked from manual flow');
    return null;
  }
  // State
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [openWheelForId, setOpenWheelForId] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [showSaveSetDialog, setShowSaveSetDialog] = useState(false);
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [isSetSaved, setIsSetSaved] = useState(false);
  
  // Phase-based confirm modal state
  const [phase, setPhase] = useState<Phase>('idle');
  const [confirmModalItems, setConfirmModalItems] = useState<any[]>([]);
  const [currentConfirmIndex, setCurrentConfirmIndex] = useState(0);
  
  // Button loading state
  const [opening, setOpening] = useState(false);
  const hydrationStartedRef = useRef(false);
  
  // Meal set reminder state
  const [showMealSetReminder, setShowMealSetReminder] = useState(false);
  
  // Hooks
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playFoodLogConfirm } = useSound();
  const { isOn, upsertReminder, removeReminder } = useReminderStore();
  const { upsertSet } = useSavedSetsStore();
  const { createReminder } = useReminders();
  
  // Feature flags for safe rollout
  const ENABLE_SST_CONFIRM_READ = true; // Phase 1: unified reads  
  const nutritionStore = useNutritionStore();

  // Initialize items when modal opens
  useEffect(() => {
    if (isOpen) {
      const itemsToUse = prefilledItems || initialItems;
      console.log('[REVIEW] Initializing with items:', itemsToUse.length, prefilledItems ? '(prefilled)' : '(detected)');
      setItems(itemsToUse.map(item => ({ ...item, selected: true })));
    }
  }, [isOpen, initialItems, prefilledItems]);

  // Build modal items for nutrition hydration
  const modalItems = useMemo(() => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    return selectedItems.map((item, index) => {
      const id = (item as any).foodId ?? item.id ?? generateFoodId(item);
      return toLegacyFoodItem({ ...item, id }, index, ENABLE_SST_CONFIRM_READ);
    });
  }, [items.filter(item => item.selected && item.name.trim()).map(i => `${i.id}-${i.name}-${i.grams}`).join('|')]);

  // Confirm modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);

  // Replace existing hydration effect with:
  useEffect(() => {
    if (!confirmModalOpen || !items.length) return;
    
    console.log('[HYDRATE][BEGIN]', { itemsCount: items.length });
    
    // Create modalItems synchronously to establish firstCardId immediately
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    const initialModalItems = selectedItems.map((item, index) => {
      const canonicalId = item.id; // Use existing item.id as canonical
      return toLegacyFoodItem({ ...item, id: canonicalId }, index, true);
    });
    
    // Set modal items BEFORE async hydration
    setConfirmModalItems(initialModalItems);
    console.log('[REVIEW][MODAL_ITEMS]', { count: initialModalItems.length, firstId: initialModalItems[0]?.id });
    
    // Run async hydration
    (async () => {
      try {
        const names = initialModalItems.map(m => m.name);
        const { resolveGenericFoodBatch } = await import('@/health/generic/resolveGenericFood');
        const results = await resolveGenericFoodBatch(names);
        
        console.log('[HYDRATE][WRITE]', { foundCount: results?.filter(Boolean).length });
        
        const storeUpdates: Record<string, any> = {};
        const enrichedItems = initialModalItems.map((m, i) => {
          const r = results?.[i];
          if (!r) return { ...m, __hydrated: false };
          
          const canonicalId = m.id; // Use same ID from modal item
          const enrichedInput = { ...m, nutrients: r.nutrients, serving: r.serving };
          const merged = toLegacyFoodItem(enrichedInput, i, true);
          
          // Write to store using canonical ID
          storeUpdates[canonicalId] = {
            perGram: merged.nutrition?.perGram || {},
            healthScore: 0,
            flags: [],
            ingredients: [],
            __hydrated: true,
            updatedAt: Date.now(),
          };
          
          return { ...merged, id: canonicalId, __hydrated: true };
        });
        
        if (Object.keys(storeUpdates).length) {
          useNutritionStore.getState().upsertMany(storeUpdates);
          console.log('[HYDRATE][WROTE]', { ids: Object.keys(storeUpdates) });
        }
        
        setConfirmModalItems(enrichedItems);
        console.log('[HYDRATE][END]', { hydratedCount: enrichedItems.filter(i => i.__hydrated).length });
        
      } catch (e) {
        console.error('[HYDRATE][ERROR]', e);
      }
    })();
  }, [confirmModalOpen, items.length]); // Depend on items.length, not items directly

  // Derive firstCardId from confirmModalItems
  const firstCardId = confirmModalItems[0]?.id;

  // Subscribe to store for readiness
  const firstReady = useNutritionStore(
    s => firstCardId ? (
      Object.values(s.byId[firstCardId]?.perGram || {}).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) > 0
    ) : false
  );

  // Fail-open watchdog effect to prevent stuck loader
  const [loaderTimedOut, setLoaderTimedOut] = useState(false);
  
  useEffect(() => {
    if (!confirmModalOpen) {
      setLoaderTimedOut(false);
      return;
    }
    
    const timeoutMs = Number(import.meta.env.VITE_CONFIRM_FAIL_OPEN_MS) || 3000;
    const start = Date.now();
    let cancelled = false;
    
    const tick = () => {
      if (cancelled) return;
      
      const cur = confirmModalItems[currentConfirmIndex];
      const isLoading = hydrating || isHydrating || !cur || !cur.__hydrated;
      
      if (!isLoading) return; // No longer loading, no need to timeout
      
      const elapsed = Date.now() - start;
      if (elapsed > timeoutMs) {
        console.log('[CONFIRM][FAIL_OPEN] reason=timeout');
        setLoaderTimedOut(true);
        setHydrating(false);
        setIsHydrating(false);
        return;
      }
      
      requestAnimationFrame(tick);
    };
    
    tick();
    return () => { cancelled = true; };
  }, [confirmModalOpen, currentConfirmIndex, confirmModalItems, isHydrating, hydrating]);

  useEffect(() => {
    if (firstCardId) {
      console.log('[READY][FIRST_ID]', { firstCardId });
    }
  }, [firstCardId]);

  useEffect(() => {
    console.log('[READY][FIRST_READY]', { firstCardId, ready: firstReady });
  }, [firstCardId, firstReady]);

  // Wait helper so the button doesn't freeze forever
  function waitUntilReadyOr(ms: number) {
    return new Promise<void>(resolve => {
      if (firstReady) return resolve();
      const unsub = useNutritionStore.subscribe(
        (state) => {
          const entry = state.byId[firstCardId ?? ''];
          if (perGramReady(entry)) {
            unsub();
            resolve();
          }
        }
      );
      setTimeout(() => {
        unsub();
        resolve(); // graceful fallback — will still gate the card (no flash)
      }, ms);
    });
  }

  const openConfirmFlow = async () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to continue');
      return;
    }
    
    console.log('[CONFIRM][CLICK]', { selectedCount: selectedItems.length });
    setIsHydrating(true);
    
    try {
      setConfirmFlowActive(true);
      setConfirmModalOpen(true); // This triggers hydration effect
      setCurrentConfirmIndex(0);
      
      console.log('[CONFIRM][WAIT]');
      await new Promise(r => setTimeout(r, 500)); // Allow hydration to start
      
      setIsHydrating(false);
      console.log('[CONFIRM][OPEN]');
      
      requestAnimationFrame(() => {
        onClose();
      });
      
    } catch (error) {
      console.error('[CONFIRM][ERROR]', error);
      setIsHydrating(false);
      toast.error('Failed to load nutrition data');
    }
  };

  // Meal set ID for reminders
  const selectedItems = useMemo(() => items.filter(i => i.selected), [items]);
  const mealSetId = useMemo(() => hashMealSet(selectedItems), [selectedItems]);

  // Handlers
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

  const handleLogImmediately = async () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to log');
      return;
    }

    setIsLogging(true);

    try {   
      // Import here to avoid circular dependencies
      const { oneTapLog } = await import('@/lib/nutritionLog');
      
      const logEntries = selectedItems.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams || 100
      }));

      await oneTapLog(logEntries);
      
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

  const handleConfirmModalComplete = async (foodItem: any) => {
    // Guard against Review modal from manual flow
    if (foodItem?.source === 'manual') {
      console.error('[BUGTRAP] reviewModalOpenFromManual blocked');
      return;
    }
    try {
      playFoodLogConfirm();
      lightTap();
    } catch (error) {
      console.warn('[HAPTIC][ERROR]', error);
    }

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
        // End flow after the last confirm
        setConfirmModalOpen(false);
        setConfirmFlowActive(false);
        finishConfirmFlow('confirmed');
      } else {
        // Move to next item
        setCurrentConfirmIndex((i) => i + 1);
        setConfirmFlowActive(true);
      }
      
    } catch (error) {
      console.error('[CONFIRM][ERROR]', error);
      toast.error('Failed to log items. Please try again.');
    }
  };

  const handleConfirmModalReject = () => {
    setConfirmModalOpen(false);
    setConfirmFlowActive(false);
    finishConfirmFlow('canceled');
  };

  const handleConfirmModalSkip = () => {
    const isLast = currentConfirmIndex + 1 >= confirmModalItems.length;

    if (isLast) {
      setConfirmModalOpen(false);
      setConfirmFlowActive(false);
      finishConfirmFlow('skipped');
    } else {
      // Move to next item
      setCurrentConfirmIndex((i) => i + 1);
      setConfirmFlowActive(true);
    }
  };

  // Ground-truth close function
  const finishConfirmFlow = (reason: 'confirmed' | 'canceled' | 'skipped' = 'confirmed') => {
    setPhase('ready');

    if (reason === 'canceled') {
      toast.info('Logging canceled');
    } else if (reason === 'skipped') {
      toast.info(`Skipped ${confirmModalItems.length} item${confirmModalItems.length > 1 ? 's' : ''}`);
    } else {
      toast.success(`Logged ${confirmModalItems.length} item${confirmModalItems.length > 1 ? 's' : ''} ✓`);
    }

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

  const handleSaveSet = async () => {
    console.log('[SAVE_SET_CLICK]', { hasUserProp: !!user?.id });

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('[SAVE_SET_CLICK][AUTH]', { hasUserProp: !!user?.id, getUserId: currentUser?.id });

      if (!currentUser?.id) {
        // Navigate to auth route for sign-in
        console.log('[SAVE_SET_CLICK] No user, navigating to auth');
        navigate('/auth?return=/camera');
        return;
      }

      console.log('[SAVE_SET_CLICK] About to open dialog, current showSaveSetDialog:', showSaveSetDialog);
      setShowSaveSetDialog(true);
      console.log('[SAVE_SET_CLICK] setShowSaveSetDialog(true) called');
    } catch (error) {
      console.error('[SAVE_SET_CLICK_ERROR]', error);
      toast.error('Unable to verify authentication. Please try again.');
    }
  };

  const handleSaveSetWithName = async (setName: string) => {
    console.log('[DEBUG][SAVE_SET_WITH_NAME] Called with:', { setName, context, itemsLength: items.length });
    
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to save');
      return;
    }

    setIsSavingSet(true);

    try {
      console.log('[MEAL_SET][UI:SAVE_CLICK]', { itemsCount: selectedItems.length, context });

      if (context === 'health-scan') {
        // EXISTING HEALTH-SCAN BRANCH: leave as-is
        const itemsSnapshot = selectedItems.map(item => ({
          name: item.name,
          canonicalName: item.canonicalName || item.name,
          grams: item.grams || 100,
          score: 0,
          calories: 0,
          healthRating: 'unknown',
        }));

        const { data, error } = await supabase
          .from('saved_meal_set_reports')
          .insert({
            name: setName.trim(),
            overall_score: null,
            items_snapshot: itemsSnapshot,
            report_snapshot: null,
            user_id: user!.id,
            image_url: null,
          } as any)
          .select('id')
          .single();

        if (error) throw error;

        toast.success(`✅ Saved "${setName}" to Saved Reports!`, {
          action: { label: 'View Saved Reports', onClick: () => navigate('/scan/saved-reports?tab=meal-sets') },
        });

      } else {
        // LOGGING CONTEXT: save to meal_sets via our API
        console.log('[MEAL_SET][UI:SAVE_CLICK]', { itemsCount: selectedItems.length });

        const itemsForSave = selectedItems.map(i => ({
          name: i.name,
          canonicalName: i.canonicalName || i.name,
          grams: i.grams || 100,
        }));

        const { createMealSet } = await import('@/lib/mealSets');
        const savedSet = await createMealSet({ name: setName.trim(), items: itemsForSave });

        console.log('[MEAL_SET][UI:SAVE_OK]', { id: savedSet?.id });
        setIsSetSaved(true);
        toast.success(`"${setName}" saved successfully!`);
        // Keep the saved state - don't revert it
        // setTimeout(() => setIsSetSaved(false), 1500);
      }

      setShowSaveSetDialog(false);

    } catch (e: any) {
      console.error('[MEAL_SET][UI:SAVE_FAIL]', e);
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('authentication') || msg.includes('auth')) {
        setShowSaveSetDialog(false);
        navigate('/auth?return=/camera');
      } else {
        toast.error(e instanceof Error ? e.message : 'Failed to save set');
      }
    } finally {
      setIsSavingSet(false);
    }
  };

  const selectedCount = items.filter(item => item.selected && item.name.trim()).length;
  const count = items.length;

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
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black z-[400]" />
          <Dialog.Content
            className="fixed inset-0 z-[500] bg-[#0B0F14] text-white"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              if (phase === 'open') e.preventDefault();
            }}
            role="dialog"
            aria-labelledby="review-title"
            aria-describedby=""
          >
            <VisuallyHidden asChild>
              <Dialog.Title id="review-title">Confirm Food Log</Dialog.Title>
            </VisuallyHidden>
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
                  {/* Add meal set reminder toggle before Save Set button */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[15px] font-semibold text-white">Set Reminder</div>
                        <div className="text-xs text-white/60">Get reminded to eat this set again</div>
                      </div>
                      <Switch
                        checked={isOn(mealSetId)}
                        onCheckedChange={(checked) => {
                          if (checked) setShowMealSetReminder(true);
                          else {
                            removeReminder(mealSetId);
                            toast.success('Meal set reminder removed');
                          }
                        }}
                      />
                    </div>
                  </div>
                  
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
                        className="h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-base relative"
                        disabled={isHydrating}
                        onClick={openConfirmFlow}
                      >
                         {isHydrating && (
                           <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                         )}
                         <span className={isHydrating ? 'opacity-80' : ''}>
                           {isHydrating ? 'Preparing nutrition…' : '🔎 Review & Log'}
                        </span>
                      </Button>
                    </div>
                    
                    <Button
                      onClick={handleSaveSet}
                      disabled={selectedCount === 0 || isSavingSet || isSetSaved}
                      className={`w-full h-12 font-semibold text-base transition-all duration-300 ${
                        isSetSaved 
                          ? 'bg-green-600 text-white border-2 border-green-400 shadow-lg cursor-not-allowed' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                      }`}
                    >
                      {isSetSaved ? (
                        <>
                          <svg className="w-6 h-6 mr-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          ✓ SET SAVED!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {isSavingSet ? 'Saving...' : 'Save Set'}
                        </>
                      )}
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
      {confirmModalOpen && (() => {
        const cur = confirmModalItems[currentConfirmIndex];
        const hasItems = confirmModalItems.length > 0;
        const shouldShowLoader = !loaderTimedOut && (hydrating || isHydrating || !cur || !cur.__hydrated);
        const canRender = loaderTimedOut || (!shouldShowLoader && cur);
        
        console.log('[CONFIRM][RENDER_GUARD]', { 
          hasItems, 
          currentIndex: currentConfirmIndex, 
          hasCur: !!cur, 
          curHydrated: cur?.__hydrated,
          shouldShowLoader,
          loaderTimedOut,
          canRender
        });
        
        if (shouldShowLoader && !canRender) {
          return <ConfirmLoaderMinimal />;
        }
        
        if (canRender && cur) {
          console.log('[CONFIRM][MOUNT]', { name: cur.name, id: cur.id });
          return (
            <FoodConfirmationCard
              isOpen={confirmModalOpen}
              onClose={handleConfirmModalReject}
              onConfirm={handleConfirmModalComplete}
              onSkip={handleConfirmModalSkip}
              onCancelAll={handleConfirmModalReject}
              foodItem={cur}
              showSkip={true}
              currentIndex={currentConfirmIndex}
              totalItems={confirmModalItems.length}
              bypassHydration={loaderTimedOut}
            />
          );
        }
        
        return null;
      })()}

      {/* Meal Set Reminder Dialog - Using exact same structure as item reminders */}
      <Dialog.Root open={showMealSetReminder} onOpenChange={setShowMealSetReminder}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[700] bg-black/75 backdrop-blur-2xl" />
          <Dialog.Content className="fixed z-[710] left-1/2 top-1/2 w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-5 shadow-xl">
            <Dialog.Title className="sr-only">Create Reminder</Dialog.Title>
            <Dialog.Description className="sr-only">
              Get reminded to eat this meal set again.
            </Dialog.Description>

            <ReminderForm
              prefilledData={{
                label: `Meal set: ${selectedItems.map(i => i.name).join(', ')}`,
                type: 'meal',
                food_item_data: {
                  itemIds: selectedItems.map(i => i.id),
                  names: selectedItems.map(i => i.name),
                }
              }}
              onSubmit={async (reminderData) => {
                const reminderPayload = {
                  label: reminderData.label,
                  type: reminderData.type,
                  reminder_time: reminderData.reminder_time,
                  frequency_type: reminderData.frequency_type,
                  frequency_value: reminderData.frequency_value ?? null,
                  custom_days: reminderData.custom_days ?? null,
                  schedule: `FREQ=${reminderData.frequency_type.toUpperCase()};BYDAY=${(reminderData.custom_days || []).join(',')}`,
                  is_active: reminderData.is_active,
                  food_item_data: { 
                    itemIds: selectedItems.map(i => i.id), 
                    names: selectedItems.map(i => i.name) 
                  },
                };

                try {
                  const created = await createReminder(reminderPayload);
                  
                  // Convert to reminderStore format with object-based schedule
                  const storeFormat = {
                    id: created?.id ?? crypto.randomUUID(),
                    type: 'meal_set' as const,
                    title: reminderData.label,
                    schedule: {
                      freq: reminderData.frequency_type === 'daily' ? 'DAILY' as const : 
                            reminderData.frequency_type === 'weekly' ? 'WEEKLY' as const : 'MONTHLY' as const,
                      hour: parseInt(reminderData.reminder_time.split(':')[0]),
                      minute: parseInt(reminderData.reminder_time.split(':')[1]),
                      days: reminderData.custom_days
                    },
                    payload: {
                      itemIds: selectedItems.map(i => i.id),
                      names: selectedItems.map(i => i.name),
                    },
                    isActive: reminderData.is_active,
                  };
                  
                  upsertReminder(storeFormat);
                  console.log("[REM][SUBMIT][MEAL_SET]", { payload: reminderPayload });
                  toast.success("Reminder created");
                } catch (e) {
                  console.error("[REM][ERROR][CREATE]", e);
                  toast.error("Failed to create reminder");
                }

                setShowMealSetReminder(false);
              }}
              onCancel={() => setShowMealSetReminder(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};