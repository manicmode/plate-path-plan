import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ArrowRight, Edit3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface ReviewItem {
  name: string;
  portion: string;
  selected: boolean;
  id: string;
}

interface ReviewItemsScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (selectedItems: ReviewItem[]) => void;
  items: ReviewItem[];
}

export const ReviewItemsScreen: React.FC<ReviewItemsScreenProps> = ({
  isOpen,
  onClose,
  onNext,
  items: initialItems
}) => {
  const [items, setItems] = useState<ReviewItem[]>([]);

  // Update items when props change - improved state management
  React.useEffect(() => {
    console.log('ReviewItemsScreen received items:', initialItems);
    if (Array.isArray(initialItems) && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const handleItemChange = (id: string, field: 'name' | 'portion' | 'selected', value: string | boolean) => {
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

  const selectedCount = items.filter(item => item.selected && item.name.trim() && item.portion.trim()).length;

  // Debug logging
  console.log('ReviewItemsScreen render - isOpen:', isOpen, 'items count:', items.length, 'selectedCount:', selectedCount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Review Detected Items
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Check and edit the food items detected in your image
            </p>
          </DialogHeader>

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
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Food Name
                        </label>
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

          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 mr-3"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={selectedCount === 0}
              className={`flex-1 ml-3 flex items-center justify-center space-x-2 ${
                selectedCount > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Next → Confirm Food Log</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {selectedCount > 0 && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};