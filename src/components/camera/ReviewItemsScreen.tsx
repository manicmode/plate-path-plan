import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Zap, Info, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewItemCard } from './ReviewItemCard';
import { NumberWheelSheet } from '../inputs/NumberWheelSheet';
import { SaveSetNameDialog } from './SaveSetNameDialog';
import { FF } from '@/featureFlags';
import { createFoodLogsBatch } from '@/api/nutritionLogs';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FoodConfirmModal } from '@/components/FoodConfirmModal';
import '@/styles/review.css';

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
  // Remove old interface props - using global confirm flow now
  // onStartConfirmFlow?: (items: any[], origin: string) => void;
}

export const ReviewItemsScreen: React.FC<ReviewItemsScreenProps> = ({
  isOpen,
  onClose,
  onNext,
  onLogImmediately,
  items: initialItems,
  prefilledItems,
  afterLogSuccess
  // onStartConfirmFlow - removed, using global flow
}) => {
  // Add mount logging for forensic breadcrumbs
  useEffect(() => {
    if (isOpen && import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.log('[DL][CTA] bound');
      console.info('[DL][ReviewItems] mount');
    }
  }, [isOpen]);
  
  // Local confirm modal state (original pattern)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalItems, setConfirmModalItems] = useState<any[]>([]);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [openWheelForId, setOpenWheelForId] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [showSaveSetDialog, setShowSaveSetDialog] = useState(false);
  const [isSavingSet, setIsSavingSet] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

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
      
      // Use custom afterLogSuccess callback if provided, otherwise navigate to nutrition
      if (afterLogSuccess) {
        afterLogSuccess();
      } else {
        navigate('/nutrition');
      }
    } catch (error) {
      console.error('Failed to log items:', error);
      toast.error('Failed to log items. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleSeeDetailsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Stop form submits / backdrop / parent handlers from firing first
    e.preventDefault();
    e.stopPropagation();
    // @ts-ignore - extra safety so Radix backdrop doesn't win
    e.nativeEvent?.stopImmediatePropagation?.();
    
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.log('[REV][CTA][CLICK] Details');
      console.log('[REV][FLOW] set active');
      console.log('[REV][FLOW] beginConfirmSequence called');
    }

    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to continue');
      return;
    }
    
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.log('[DL][CTA] start (review)', selectedItems.map(i => i.name));
    }
    
    // Transform items to match FoodConfirmModal interface
    const modalItems = selectedItems.map(item => ({
      name: item.name,
      category: 'food',
      portion_estimate: item.grams || 100,
      confidence: 0.9,
      displayText: `${item.grams || 100}g • est.`,
      canonicalName: item.canonicalName || item.name
    }));

    // Open legacy confirm modal immediately
    setConfirmModalItems(modalItems);
    setConfirmModalOpen(true);

    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.log('[LEGACY][FLOW] open index=0', modalItems[0]?.name);
    }

    // Close the review screen AFTER starting the flow
    requestAnimationFrame(() => {
      onClose();
    });
  };

  const handleConfirmModalComplete = async (confirmedItems: any[]) => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][FLOW] end', { 
        confirmed: confirmedItems.length, 
        origin: 'review_items' 
      });
      confirmedItems.forEach((item, index) => {
        console.info('[DL][FLOW] confirm', { index: index + 1, name: item.name });
      });
    }

    setConfirmModalOpen(false);

    try {
      if (import.meta.env.VITE_LOG_DEBUG === 'true') {
        console.info('[LOG][DETAILED][CONFIRM][START]', { count: confirmedItems.length });
        confirmedItems.forEach((item, index) => {
          console.info('[LOG][INSERT][START]', { 
            index: index + 1, 
            name: item.name, 
            grams: item.portion_estimate || 100 
          });
        });
      }

      // Import here to avoid circular dependencies
      const { oneTapLog } = await import('@/lib/nutritionLog');
      
      const logEntries = confirmedItems.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.portion_estimate || 100
      }));

      await oneTapLog(logEntries);
      
      // Log successful inserts
      if (import.meta.env.VITE_LOG_DEBUG === 'true') {
        logEntries.forEach((entry, index) => {
          console.info('[LOG][INSERT][OK]', { 
            index: index + 1, 
            name: entry.name,
            grams: entry.grams
          });
        });
        console.info('[LOG][DETAILED][CONFIRM][DONE]');
      }

      // Import toast dynamically to avoid circular deps
      const { toast } = await import('sonner');
      toast.success(`Logged ${confirmedItems.length} item${confirmedItems.length > 1 ? 's' : ''} ✓`);
      
      // Navigate to home
      navigate('/home', { replace: true });
      
    } catch (error) {
      if (import.meta.env.VITE_LOG_DEBUG === 'true') {
        console.error('[DL][FLOW] log failed', error);
        confirmedItems.forEach((item, index) => {
          console.error('[LOG][INSERT][FAIL]', { 
            index: index + 1, 
            name: item.name, 
            error: error.message 
          });
        });
      }
      
      // Import toast dynamically
      const { toast } = await import('sonner');
      toast.error('Failed to log items. Please try again.');
    }
  };

  const handleConfirmModalReject = () => {
    if (import.meta.env.VITE_LOG_DEBUG === 'true') {
      console.info('[DL][FLOW] rejected', { origin: 'review_items' });
    }
    setConfirmModalOpen(false);
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
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black z-[400]" />
        <Dialog.Content
          className="fixed inset-0 z-[500] bg-[#0B0F14] text-white"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
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
              <div className="space-y-3">
                <Button
                  onClick={handleLogImmediately}
                  disabled={selectedCount === 0 || isLogging}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold text-base disabled:opacity-50"
                >
                  {isLogging ? '⏳ Logging...' : `⚡ One-Tap Log (${selectedCount})`}
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleSaveSet}
                    disabled={selectedCount === 0 || isSavingSet}
                    className="h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold text-base"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingSet ? 'Saving...' : 'Save Set'}
                  </Button>
                  
                  <Button
                    onClick={handleSeeDetailsClick}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); /* @ts-ignore */ e.nativeEvent?.stopImmediatePropagation?.(); }}
                    disabled={selectedCount === 0}
                    className="h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-base"
                  >
                    🔎 Details
                  </Button>
                </div>
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

      {/* Food Confirm Modal - Original Pattern */}
      <FoodConfirmModal
        isOpen={confirmModalOpen}
        items={confirmModalItems}
        onConfirm={handleConfirmModalComplete}
        onReject={handleConfirmModalReject}
      />
    </Dialog.Root>
  );
};