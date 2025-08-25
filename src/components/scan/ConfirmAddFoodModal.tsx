import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, ArrowLeft } from 'lucide-react';

interface ProductData {
  productName: string;
  brand?: string;
  barcode: string;
  ingredients?: string;
  nutritionSummary?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  additives?: string[];
  allergens?: string[];
  serving?: { amount: number; unit: string };
  offId?: string;
  nova?: number;
}

interface ConfirmAddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productData: ProductData, serving: { amount: number; unit: string }) => void;
  onBackToScanner: () => void;
  productData: ProductData | null;
  isLoading?: boolean;
}

export const ConfirmAddFoodModal: React.FC<ConfirmAddFoodModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onBackToScanner,
  productData,
  isLoading = false
}) => {
  const [servingAmount, setServingAmount] = useState<number>(
    productData?.serving?.amount || 100
  );
  const [servingUnit, setServingUnit] = useState<string>(
    productData?.serving?.unit || 'g'
  );

  const handleConfirm = () => {
    if (!productData) return;
    
    onConfirm(productData, {
      amount: servingAmount,
      unit: servingUnit
    });
  };

  if (!productData) return null;

  const { productName, brand, nutritionSummary, ingredients, additives, allergens, nova } = productData;
  const calories = nutritionSummary?.calories || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Add to Log
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Confirm adding this scanned product to your food log
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-6">
          {/* Product Info */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {brand ? `${brand} ${productName}` : productName}
              </h3>
              {nova && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                    NOVA {nova}
                  </span>
                </div>
              )}
            </div>

            {/* Nutrition Preview */}
            {nutritionSummary && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Calories: {calories}</div>
                  {nutritionSummary.protein && <div>Protein: {nutritionSummary.protein}g</div>}
                  {nutritionSummary.carbs && <div>Carbs: {nutritionSummary.carbs}g</div>}
                  {nutritionSummary.fat && <div>Fat: {nutritionSummary.fat}g</div>}
                </div>
              </div>
            )}

            {/* Flags */}
            {(additives?.length || allergens?.length) && (
              <div className="space-y-2">
                {additives?.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-orange-600 dark:text-orange-400">Additives:</span>
                    <span className="ml-1 text-gray-600 dark:text-gray-400">
                      {additives.slice(0, 3).join(', ')}
                      {additives.length > 3 && '...'}
                    </span>
                  </div>
                )}
                {allergens?.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-red-600 dark:text-red-400">Allergens:</span>
                    <span className="ml-1 text-gray-600 dark:text-gray-400">
                      {allergens.slice(0, 3).join(', ')}
                      {allergens.length > 3 && '...'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Serving Size Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Serving Size
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  value={servingAmount}
                  onChange={(e) => setServingAmount(Number(e.target.value))}
                  className="text-center"
                  min={1}
                  max={9999}
                />
              </div>
              <div className="w-20">
                <select
                  value={servingUnit}
                  onChange={(e) => setServingUnit(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="oz">oz</option>
                  <option value="cup">cup</option>
                  <option value="piece">piece</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isLoading || servingAmount <= 0}
              className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Adding to Log...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Log
                </>
              )}
            </Button>

            <Button
              onClick={onBackToScanner}
              variant="outline"
              className="h-10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scanner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};