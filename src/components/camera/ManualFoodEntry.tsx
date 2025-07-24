import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSecureApiCall } from '@/hooks/useSecureApiCall';
import { sanitizeText, safeParseNumber } from '@/lib/validation';

interface ManualFoodEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (foodData: any) => void;
  initialBarcode?: string;
}

export const ManualFoodEntry: React.FC<ManualFoodEntryProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBarcode = ''
}) => {
  const { validateApiCall } = useSecureApiCall();
  const [formData, setFormData] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    sodium: '',
    barcode: initialBarcode
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    // Validate and sanitize all input data
    const validatedData = await validateApiCall({
      name: formData.name,
      calories: formData.calories,
      protein: formData.protein,
      carbs: formData.carbs,
      fat: formData.fat,
      fiber: formData.fiber,
      sugar: formData.sugar,
      sodium: formData.sodium,
      barcode: formData.barcode
    }, {
      sanitizeTexts: ['name', 'barcode'],
      validateNumbers: ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium']
    });

    if (validatedData === false) {
      return; // Validation failed, error already shown
    }

    const foodData = {
      id: `manual-${Date.now()}`,
      name: validatedData.name,
      calories: validatedData.calories || 0,
      protein: validatedData.protein || 0,
      carbs: validatedData.carbs || 0,
      fat: validatedData.fat || 0,
      fiber: validatedData.fiber || 0,
      sugar: validatedData.sugar || 0,
      sodium: validatedData.sodium || 0,
      confidence: 100,
      timestamp: new Date(),
      confirmed: false,
      barcode: validatedData.barcode,
      ingredientsText: '',
      ingredientsAvailable: false,
      isManualEntry: true
    };

    onSave(foodData);
    onClose();
    toast.success('Food item created successfully');
  };

  const handleInputChange = (field: string, value: string) => {
    // Sanitize text inputs on change
    const sanitizedValue = field === 'name' || field === 'barcode' 
      ? sanitizeText(value) 
      : value;
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Add Food Manually
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Apple, Banana, etc."
                required
              />
            </div>

            {initialBarcode && (
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="Product barcode"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={formData.calories}
                  onChange={(e) => handleInputChange('calories', e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  value={formData.protein}
                  onChange={(e) => handleInputChange('protein', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.1"
                  value={formData.carbs}
                  onChange={(e) => handleInputChange('carbs', e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fat">Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  value={formData.fat}
                  onChange={(e) => handleInputChange('fat', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fiber">Fiber (g)</Label>
                <Input
                  id="fiber"
                  type="number"
                  step="0.1"
                  value={formData.fiber}
                  onChange={(e) => handleInputChange('fiber', e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sugar">Sugar (g)</Label>
                <Input
                  id="sugar"
                  type="number"
                  step="0.1"
                  value={formData.sugar}
                  onChange={(e) => handleInputChange('sugar', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sodium">Sodium (mg)</Label>
              <Input
                id="sodium"
                type="number"
                value={formData.sodium}
                onChange={(e) => handleInputChange('sodium', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg mr-2">💾</span>
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};