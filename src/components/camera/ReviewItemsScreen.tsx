import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Zap, Save, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { SaveSetNameDialog } from './SaveSetNameDialog';
import { ReviewItemCard } from './ReviewItemCard';
import { NumberWheelSheet } from '../inputs/NumberWheelSheet';
import { FF } from '@/featureFlags';
import { createFoodLogsBatch } from '@/api/nutritionLogs';
import { saveMealSet } from '@/api/mealSets';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
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
}

export const ReviewItemsScreen: React.FC<ReviewItemsScreenProps> = ({
  isOpen,
  onClose,
  onNext,
  onLogImmediately,
  items: initialItems,
  prefilledItems
}) => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSaveNameDialog, setShowSaveNameDialog] = useState(false);
  const [openWheelForId, setOpenWheelForId] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
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
      
      toast.success(`Logged ✓`);
      onClose();
      
      // Navigate to today's log
      navigate('/nutrition');
    } catch (error) {
      console.error('Failed to log items:', error);
      toast.error('Failed to log items. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleSeeDetails = () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to continue');
      return;
    }
    
    // Navigate to health profile/confirmation flow
    onNext(selectedItems);
    onClose();
  };

  const handleSaveSet = () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to save');
      return;
    }
    
    if (!user?.id) {
      toast.error('You must be logged in to save sets');
      return;
    }
    
    setShowSaveNameDialog(true);
  };

  const handleSaveSetWithName = async (setName: string) => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    
    try {
      // Import here to avoid circular dependencies
      const { createMealSet } = await import('@/lib/mealSets');
      
      const mealSetItems = selectedItems.map(item => ({
        name: item.name,
        canonicalName: item.canonicalName || item.name,
        grams: item.grams || 100
      }));

      await createMealSet({ name: setName, items: mealSetItems });
      toast.success(`Saved ✓`);
      setShowSaveNameDialog(false);
    } catch (error) {
      console.error('Failed to save meal set:', error);
      toast.error('Failed to save set. Please try again.');
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
        <Dialog.Overlay className="fixed inset-0 bg-black" />
        <Dialog.Content
          className="fixed inset-0 z-[100] bg-[#0B0F14] text-white"
          onOpenAutoFocus={(e) => e.preventDefault()}
          role="dialog"
          aria-labelledby="review-title"
          aria-describedby="review-description"
        >
          <Dialog.Title id="review-title" className="sr-only">Review Detected Items</Dialog.Title>
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
                
                <Button
                  onClick={handleSeeDetails}
                  disabled={selectedCount === 0}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-base"
                >
                  🔎 Detailed Log ({selectedCount})
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

      {/* Save Set Name Dialog */}
      <SaveSetNameDialog
        isOpen={showSaveNameDialog}
        onClose={() => setShowSaveNameDialog(false)}
        onSave={handleSaveSetWithName}
      />

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
    </Dialog.Root>
  );
};