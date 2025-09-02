import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import AccessibleDialogContent from '@/components/a11y/AccessibleDialogContent';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Zap, Save, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { SaveSetDialog } from './SaveSetDialog';
import { ReviewItemCard } from './ReviewItemCard';
import { FF } from '@/featureFlags';
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

  const handleLogImmediately = () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to log');
      return;
    }
    if (onLogImmediately) {
      onLogImmediately(selectedItems);
    } else {
      toast.error('Immediate logging not available');
    }
  };

  const handleSaveSet = () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to save');
      return;
    }
    setShowSaveDialog(true);
  };

  const selectedCount = items.filter(item => item.selected && item.name.trim()).length;
  const count = items.length;

  // Debug logging
  console.log('ReviewItemsScreen render - isOpen:', isOpen, 'items count:', items.length, 'selectedCount:', selectedCount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AccessibleDialogContent 
        className="review-sheet"
        title={`Review detected items (${count})`}
        description="Select the items you want to log"
        aria-labelledby="review-title"
        aria-describedby="review-description"
      >
        {/* Header */}
        <div className="safe-area-padding border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="review-title" className="text-xl font-bold text-foreground">
                Review Detected Items ({count})
              </h2>
              <p id="review-description" className="text-sm text-muted-foreground mt-1">
                Check and edit the food items detected in your image
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="review-content">
          <div className="space-y-3">
            {items.map((item) => (
              <ReviewItemCard
                key={item.id}
                item={item}
                canRemove={items.length > 1}
                onChange={handleItemChange}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>

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


        {/* Sticky footer with actions */}
        <div className="review-footer space-y-3">
          {FF.FEATURE_LYF_LOG_THIS_SET ? (
            <>
              {/* Primary: Log This Set (instant) */}
              <Button
                onClick={handleLogImmediately}
                disabled={selectedCount === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-medium"
              >
                <Zap className="h-4 w-4 mr-2" />
                Log This Set ({selectedCount})
              </Button>
              
              {/* Secondary: See Health Profile & Log */}
              <Button
                onClick={handleNext}
                disabled={selectedCount === 0}
                variant="outline"
                className="w-full"
              >
                <Info className="h-4 w-4 mr-2" />
                See Health Profile & Log
              </Button>
              
              {/* Third: Save This Set */}
              <Button
                onClick={handleSaveSet}
                disabled={selectedCount === 0}
                variant="ghost"
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save This Set
              </Button>
              
              {/* Fourth: Cancel */}
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full text-destructive"
              >
                Cancel
              </Button>
            </>
          ) : (
            /* Fallback layout when feature flag is off */
            <>
              <Button
                onClick={handleNext}
                disabled={selectedCount === 0}
                className="w-full"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue ({selectedCount})
              </Button>
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveSet}
                  disabled={selectedCount === 0}
                  variant="ghost"
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Set
                </Button>
                <Button onClick={onClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          )}

          {selectedCount > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        
        {/* Save Set Dialog */}
        <SaveSetDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          items={items
            .filter(item => item.selected && item.name.trim())
            .map(item => ({
              name: item.name,
              canonicalName: item.canonicalName || item.name,
              grams: item.grams || parseInt(item.portion.replace(/\D/g, '')) || 100
            }))
          }
          onSaved={(setName) => {
            setShowSaveDialog(false);
            toast.success(`Saved "${setName}"`);
          }}
        />
      </AccessibleDialogContent>
    </Dialog>
  );
};