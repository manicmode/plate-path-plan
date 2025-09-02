import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogClose } from '@/components/ui/dialog';
import AccessibleDialogContent from '@/components/a11y/AccessibleDialogContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowRight, Edit3, AlertCircle, Zap, Save, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { SaveSetDialog } from './SaveSetDialog';

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

  const handleItemChange = (id: string, field: 'name' | 'portion' | 'selected' | 'eggSize', value: string | boolean) => {
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

  const selectedCount = items.filter(item => item.selected && item.name.trim() && item.portion.trim()).length;

  // Debug logging
  console.log('ReviewItemsScreen render - isOpen:', isOpen, 'items count:', items.length, 'selectedCount:', selectedCount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AccessibleDialogContent 
        className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden"
        title="Review detected items"
        description="Select the items you want to log."
      >
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Review Detected Items
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Check and edit the food items detected in your image
            </p>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {items.map((item, index) => (
              <Card key={item.id} className="border border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={(checked) => 
                        handleItemChange(item.id, 'selected', checked === true)
                      }
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Food Name
                          </label>
                          {item.needsDetails && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Needs details
                            </Badge>
                          )}
                        </div>
                        <Input
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          placeholder="Enter food name..."
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Portion Size
                        </label>
                        <Input
                          value={item.portion}
                          onChange={(e) => handleItemChange(item.id, 'portion', e.target.value)}
                          placeholder="e.g., 1 cup, 2 slices..."
                          className="mt-1"
                        />
                      </div>
                      
                      {/* Egg Size Selector */}
                      {item.name.toLowerCase().includes('egg') && (
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Egg Size
                          </label>
                          <Select
                            value={item.eggSize || 'large'}
                            onValueChange={(value) => handleItemChange(item.id, 'eggSize', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select egg size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small (54 kcal)</SelectItem>
                              <SelectItem value="medium">Medium (63 kcal)</SelectItem>
                              <SelectItem value="large">Large (72 kcal)</SelectItem>
                              <SelectItem value="xl">XL (80 kcal)</SelectItem>
                              <SelectItem value="jumbo">Jumbo (90 kcal)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="mt-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={handleAddItem}
              className="flex items-center space-x-2 border-dashed border-2 border-gray-300 hover:border-gray-400"
            >
              <Plus className="h-4 w-4" />
              <span>Add Food</span>
            </Button>
          </div>

          {/* Three action buttons */}
          <div className="space-y-3 mt-6">
            {/* Primary: Log selected items (one-tap) */}
            <Button
              onClick={handleLogImmediately}
              disabled={selectedCount === 0}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Log Selected Items ({selectedCount})
            </Button>
            
            {/* Secondary: See details before logging */}
            <Button
              onClick={handleNext}
              disabled={selectedCount === 0}
              variant="outline"
              className="w-full"
            >
              <Info className="h-4 w-4 mr-2" />
              See Details Before Logging
            </Button>
            
            <div className="flex gap-3">
              {/* Tertiary: Save this set */}
              <Button
                onClick={handleSaveSet}
                disabled={selectedCount === 0}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Set
              </Button>
              
              {/* Cancel */}
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  Cancel
                </Button>
              </DialogClose>
            </div>
          </div>

          {selectedCount > 0 && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
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