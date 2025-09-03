import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function ManualEntryModal({ isOpen, onClose, onSubmit }: ManualEntryModalProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setError('Please enter at least one food (comma-separated)');
      return;
    }
    
    // Clear error and submit
    setError('');
    onSubmit(trimmedText);
    setText(''); // Reset for next time
  };

  const handleClose = () => {
    setText('');
    setError('');
    onClose();
  };

  const commonFoods = ['salmon', 'brown rice', 'asparagus', 'tomato', 'lemon', 'chicken breast', 'quinoa', 'broccoli'];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border border-white/10 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Describe Your Meal</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter food items separated by commas or new lines..."
              className="min-h-[120px] bg-white/10 border-white/20 text-white placeholder-white/50 resize-none"
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          {/* Common food chips */}
          <div>
            <p className="text-sm text-white/70 mb-2">Quick picks:</p>
            <div className="flex flex-wrap gap-2">
              {commonFoods.map((food) => (
                <Button
                  key={food}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentText = text.trim();
                    const separator = currentText && !currentText.endsWith(',') ? ', ' : '';
                    setText(currentText + separator + food);
                  }}
                  className="text-xs border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {food}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Parse Items
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}