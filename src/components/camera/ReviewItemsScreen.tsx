import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
  // State
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [openWheelForId, setOpenWheelForId] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [showSaveSetDialog, setShowSaveSetDialog] = useState(false);
  const [isSavingSet, setIsSavingSet] = useState(false);
  
  // Phase-based confirm modal state
  const [phase, setPhase] = useState<Phase>('idle');
  const [confirmModalItems, setConfirmModalItems] = useState<any[]>([]);
  const [currentConfirmIndex, setCurrentConfirmIndex] = useState(0);
  
  // Meal set reminder state
  const [showMealSetReminder, setShowMealSetReminder] = useState(false);
  
  // Hooks
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playFoodLogConfirm } = useSound();
  const { isOn, upsertReminder, removeReminder } = useReminderStore();
  const { upsertSet } = useSavedSetsStore();
  
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

  // Phase management - start hydration when items change
  useEffect(() => {
    if (!modalItems?.length) {
      setPhase('idle');
      return;
    }

    setPhase('hydrating');

    (async () => {
      try {
        // Hydrate each item
        for (const item of modalItems) {
          if (needsHydration(item)) {
            try {
              const { resolveGenericFoodBatch } = await import('@/health/generic/resolveGenericFood');
              const [result] = await resolveGenericFoodBatch([item.name]);
              
              if (result?.nutrients) {
                const id = generateFoodId(item);
                const perGram = result.nutrients;
                useNutritionStore.getState().upsert(id, {
                  perGram,
                  healthScore: 0,
                  flags: [],
                  __hydrated: true,
                  updatedAt: Date.now()
                });
                
                // Mark item as hydrated
                (item as any).__hydrated = true;
                (item as any).nutrition = { perGram };
              }
            } catch (err) {
              console.error('Failed to hydrate item:', item.name, err);
            }
          }
        }
        
        // Set enriched modal items
        setConfirmModalItems(modalItems);
      } catch (error) {
        console.error('Hydration failed:', error);
      }
    })();
  }, [modalItems]);

  // Subscribe to first item nutrition readiness
  useEffect(() => {
    const firstItem = modalItems?.[0];
    if (!firstItem?.id || phase !== 'hydrating') return;

    const checkReady = () => {
      const pg = useNutritionStore.getState().byId[firstItem.id]?.perGram;
      return !!pg && perGramSum(pg) > 0;
    };

    // Check immediately
    if (checkReady()) {
      setPhase('ready');
      return;
    }

    // Subscribe to changes
    const unsubscribe = useNutritionStore.subscribe(
      () => {
        if (checkReady()) {
          setPhase('ready');
        }
      }
    );

    return unsubscribe;
  }, [modalItems, phase]);

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
        // End flow only after the last confirm
        setConfirmFlowActive(false);
        finishConfirmFlow('confirmed');
      } else {
        // Move to next item
        setCurrentConfirmIndex(currentConfirmIndex + 1);
        setConfirmFlowActive(true);
      }
      
    } catch (error) {
      console.error('[CONFIRM][ERROR]', error);
      toast.error('Failed to log items. Please try again.');
    }
  };

  const handleConfirmModalReject = () => {
    setConfirmFlowActive(false);
    finishConfirmFlow('canceled');
  };

  const handleConfirmModalSkip = () => {
    const isLast = currentConfirmIndex + 1 >= confirmModalItems.length;

    if (isLast) {
      setConfirmFlowActive(false);
      finishConfirmFlow('skipped');
    } else {
      // Move to next item
      setCurrentConfirmIndex(currentConfirmIndex + 1);
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
                        onClick={() => {
                          if (phase !== 'ready') return;
                          setPhase('open');
                        }}
                        disabled={phase !== 'ready'}
                        className="h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-base"
                      >
                        {phase === 'ready' ? '🔎 Review & Log' : (
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Preparing nutrition…
                          </div>
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

      {/* Phase-based Food Confirmation Modal */}
      {phase === 'open' && confirmModalItems[currentConfirmIndex] && (
        <FoodConfirmationCard
          isOpen={true}
          onClose={() => setPhase('ready')}
          onConfirm={handleConfirmModalComplete}
          onSkip={handleConfirmModalSkip}
          onCancelAll={() => setPhase('ready')}
          foodItem={confirmModalItems[currentConfirmIndex]}
          showSkip
          currentIndex={currentConfirmIndex}
          totalItems={confirmModalItems.length}
        />
      )}

      {/* Meal Set Reminder Dialog - Using standard Dialog with blur overlay */}
      <Dialog.Root open={showMealSetReminder} onOpenChange={setShowMealSetReminder}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700]" />
          <Dialog.Content
            className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[460px]
                       -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-0 shadow-lg z-[710]"
          >
            <Dialog.Title className="sr-only">Create Reminder</Dialog.Title>
            <Dialog.Description className="sr-only">Get reminded to eat this meal set again.</Dialog.Description>
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
                const reminder = {
                  id: mealSetId,
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
                
                upsertReminder(reminder);
                setShowMealSetReminder(false);
                toast.success('Meal set reminder created');
              }}
              onCancel={() => setShowMealSetReminder(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};