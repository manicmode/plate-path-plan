
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X } from 'lucide-react';

interface FoodItem {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  image?: string;
}

interface FoodEditScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFood: FoodItem, logTime: Date, note: string) => void;
  foodItem: FoodItem | null;
}

const FoodEditScreen: React.FC<FoodEditScreenProps> = ({
  isOpen,
  onClose,
  onSave,
  foodItem
}) => {
  const [editedFood, setEditedFood] = useState<FoodItem>(() => 
    foodItem || {
      name: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    }
  );

  const [logTime, setLogTime] = useState(() => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5); // HH:MM format
    return timeString;
  });

  const [note, setNote] = useState('');

  // Reset form when foodItem changes
  React.useEffect(() => {
    if (foodItem) {
      setEditedFood(foodItem);
    }
  }, [foodItem]);

  // Prevent auto-focus when modal opens
  React.useEffect(() => {
    if (isOpen) {
      // Blur any focused input elements
      const focusedElement = document.activeElement as HTMLElement;
      if (focusedElement && focusedElement.tagName === 'INPUT') {
        focusedElement.blur();
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    // Create date object from time input
    const today = new Date();
    const [hours, minutes] = logTime.split(':').map(Number);
    const logDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);

    onSave(editedFood, logDateTime, note);
    onClose();
  };

  const handleInputChange = (field: keyof FoodItem, value: string | number) => {
    setEditedFood(prev => ({
      ...prev,
      [field]: typeof value === 'string' && field !== 'name' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Food Item
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Food Name */}
            <div>
              <Label htmlFor="foodName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Food Name
              </Label>
              <Input
                id="foodName"
                value={editedFood.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="mt-1"
                placeholder="Enter food name"
                autoFocus={false}
              />
            </div>

            {/* Calories */}
            <div>
              <Label htmlFor="calories" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Calories
              </Label>
              <Input
                id="calories"
                type="number"
                value={editedFood.calories}
                onChange={(e) => handleInputChange('calories', e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>

            {/* Macronutrients Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="protein" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Protein (g)
                </Label>
                <Input
                  id="protein"
                  type="number"
                  value={editedFood.protein}
                  onChange={(e) => handleInputChange('protein', e.target.value)}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="carbs" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Carbs (g)
                </Label>
                <Input
                  id="carbs"
                  type="number"
                  value={editedFood.carbs}
                  onChange={(e) => handleInputChange('carbs', e.target.value)}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="fat" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Fat (g)
                </Label>
                <Input
                  id="fat"
                  type="number"
                  value={editedFood.fat}
                  onChange={(e) => handleInputChange('fat', e.target.value)}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Additional Nutrients */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="fiber" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Fiber (g)
                </Label>
                <Input
                  id="fiber"
                  type="number"
                  value={editedFood.fiber}
                  onChange={(e) => handleInputChange('fiber', e.target.value)}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="sugar" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Sugar (g)
                </Label>
                <Input
                  id="sugar"
                  type="number"
                  value={editedFood.sugar}
                  onChange={(e) => handleInputChange('sugar', e.target.value)}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="sodium" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Sodium (mg)
                </Label>
                <Input
                  id="sodium"
                  type="number"
                  value={editedFood.sodium}
                  onChange={(e) => handleInputChange('sodium', e.target.value)}
                  className="mt-1"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Log Time */}
            <div>
              <Label htmlFor="logTime" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Log Time
              </Label>
              <Input
                id="logTime"
                type="time"
                value={logTime}
                onChange={(e) => setLogTime(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Note */}
            <div>
              <Label htmlFor="note" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Note (optional)
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., post-workout, cheat meal"
                className="mt-1 min-h-[60px]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!editedFood.name.trim()}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FoodEditScreen;
