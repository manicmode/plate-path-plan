import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface SummaryItem {
  id: string;
  name: string;
  portion: string;
  selected: boolean;
}

interface SummaryReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (selectedItems: SummaryItem[]) => void;
  items: SummaryItem[];
}

export const SummaryReviewPanel: React.FC<SummaryReviewPanelProps> = ({
  isOpen,
  onClose,
  onNext,
  items: initialItems
}) => {
  const [items, setItems] = useState<SummaryItem[]>(initialItems);

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleItemToggle = (id: string, checked: boolean) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: checked } : item
    ));
  };

  const handleSelectAll = () => {
    const allSelected = items.every(item => item.selected);
    setItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const handleNext = () => {
    const selectedItems = items.filter(item => item.selected);
    if (selectedItems.length === 0) {
      return;
    }
    onNext(selectedItems);
  };

  const selectedCount = items.filter(item => item.selected).length;
  const allSelected = items.length > 0 && items.every(item => item.selected);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden" aria-describedby="summary-review-desc">
        <DialogTitle id="summary-review-title" className="sr-only">Review detected items</DialogTitle>
        <DialogDescription id="summary-review-desc" className="sr-only">
          Review and select items detected in your scan.
        </DialogDescription>
        <div className="p-6">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
              Review Detected Items
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Tap the items you'd like to confirm for your food log
            </p>
          </DialogHeader>

          {/* Summary Stats */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-white/70 text-gray-800">
                  {items.length} items detected
                </Badge>
                <Badge variant="default" className="bg-emerald-500">
                  {selectedCount} selected
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
            {items.map((item, index) => (
              <Card 
                key={item.id} 
                className={`border-2 transition-all duration-200 ${
                  item.selected 
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={(checked) => 
                        handleItemToggle(item.id, checked === true)
                      }
                      className="h-5 w-5"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {item.portion}
                      </p>
                    </div>

                    {item.selected && (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">What happens next?</p>
              <p>You'll see individual confirmation screens for each selected item where you can adjust portions and nutrition details.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={selectedCount === 0}
              className={`flex-1 flex items-center justify-center gap-2 ${
                selectedCount > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Confirm {selectedCount} Item{selectedCount !== 1 ? 's' : ''}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};