import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Zap, Save, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { SavedSetsSheet } from './SavedSetsSheet';
import { SaveSetDialog } from './SaveSetDialog';
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
}

interface ReviewItemsScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (selectedItems: ReviewItem[]) => void;
  onLogImmediately?: (selectedItems: ReviewItem[]) => void; // One-tap logging
  items: ReviewItem[];
}

export const ReviewItemsScreen: React.FC<ReviewItemsScreenProps> = ({
  isOpen,
  onClose,
  onNext,
  onLogImmediately,
  items: initialItems
}) => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSaveNameDialog, setShowSaveNameDialog] = useState(false);
  const [openWheelForId, setOpenWheelForId] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Atomic handoff - update items when props change
  React.useEffect(() => {
    console.log('ReviewItemsScreen received items:', initialItems);
    if (Array.isArray(initialItems) && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);
  
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
        <Dialog.Overlay className="fixed inset-0 z-[99] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="lyf-sheet fixed z-[100] inset-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          role="dialog"
          aria-labelledby="review-title"
          aria-describedby="review-description"
        >
          <Dialog.Title id="review-title" className="sr-only">Review Detected Items</Dialog.Title>
          <Dialog.Description id="review-description" className="sr-only">Confirm items and portion sizes</Dialog.Description>

          <div className="lyf-panel">
            {/* Mobile sheet grab handle */}
            <div className="sm:block hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-foreground/20" />

            <div className="lyf-panel__body">
              {/* Header with count */}
              <div className="px-4 pt-3 pb-2 sm:px-5 sm:pt-3">
                <h2 className="text-xl font-semibold text-foreground mt-2 mb-4">
                  Review Detected Items <span className="text-muted-foreground">({count})</span>
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  Check and edit the food items detected in your image.
                </p>
              </div>

              {/* Scrollable content */}
              <div className="lyf-items px-4 sm:px-5">
                <div className="space-y-2">
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

                {/* Add spacer when there's only 1 item for better spacing */}
                {selectedCount === 1 && <div style={{ minHeight: '28dvh' }} />}

                {/* Add food button */}
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={handleAddItem}
                    className="flex items-center space-x-2 border-dashed border-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Food</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Sticky action footer */}
            <div className="lyf-actions bg-background border-t border-border">
              <div className="p-4 space-y-3">
                {/* Two primary actions with equal prominence */}
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
                
                {/* Secondary actions row - improved styling */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSaveSet}
                    disabled={selectedCount === 0}
                    size="lg"
                    className="flex-1 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-bold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    💾 Save Set
                  </Button>
                  
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 rounded-xl border-white/20 bg-transparent text-white"
                  >
                    Cancel
                  </Button>
                </div>

                {selectedCount > 0 && (
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>
          </div>
          
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};