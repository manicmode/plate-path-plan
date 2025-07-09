import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, FileText, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useIngredientAlert } from '@/hooks/useIngredientAlert';

interface ManualIngredientEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onIngredientsSubmit: (ingredientsText: string) => void;
  productName?: string;
  isProcessing?: boolean;
}

export const ManualIngredientEntry: React.FC<ManualIngredientEntryProps> = ({
  isOpen,
  onClose,
  onIngredientsSubmit,
  productName = 'this product',
  isProcessing = false
}) => {
  const [ingredientsText, setIngredientsText] = useState('');
  const { checkIngredients, isLoading } = useIngredientAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ingredientsText.trim()) {
      toast.error('Please enter the ingredients list');
      return;
    }

    // Check for flagged ingredients as user types/submits
    await checkIngredients(ingredientsText);
    
    onIngredientsSubmit(ingredientsText.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIngredientsText(e.target.value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <FileText className="h-6 w-6 text-orange-600" />
            Add Ingredients Manually
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Help us check for harmful ingredients in {productName}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Info Alert */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="text-xs text-orange-700 dark:text-orange-300">
                <p className="font-medium mb-1">Why we need this:</p>
                <p>We couldn't detect ingredients from the barcode. Adding them manually lets us check for harmful additives, allergens, and other concerning ingredients.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ingredients List
              </label>
              <Textarea
                value={ingredientsText}
                onChange={handleInputChange}
                placeholder="e.g., wheat flour, sugar, palm oil, salt, artificial flavors, sodium benzoate, yellow #5..."
                className="min-h-[120px] text-sm"
                disabled={isProcessing || isLoading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Copy ingredients from the product label. Look for the fine print on the back or side of the package.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isProcessing || isLoading}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Skip For Now
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || isLoading || !ingredientsText.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                {isProcessing || isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Check Ingredients
                  </div>
                )}
              </Button>
            </div>
          </form>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Helpful tips:</p>
              <ul className="space-y-1">
                <li>• Look for "Ingredients:" on the product label</li>
                <li>• Copy exactly as written, including scientific names</li>
                <li>• Include all items, even if they seem harmless</li>
                <li>• Separate items with commas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};