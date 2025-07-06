
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2, Check, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface FoodConfirmationCardProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (foodItem: FoodItem) => void;
  foodItem: FoodItem | null;
}

const FoodConfirmationCard: React.FC<FoodConfirmationCardProps> = ({
  isOpen,
  onClose,
  onConfirm,
  foodItem
}) => {
  const [portionPercentage, setPortionPercentage] = useState([100]);
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();

  if (!foodItem) return null;

  const portionMultiplier = portionPercentage[0] / 100;
  
  const adjustedFood = {
    ...foodItem,
    calories: Math.round(foodItem.calories * portionMultiplier),
    protein: Math.round(foodItem.protein * portionMultiplier * 10) / 10,
    carbs: Math.round(foodItem.carbs * portionMultiplier * 10) / 10,
    fat: Math.round(foodItem.fat * portionMultiplier * 10) / 10,
    fiber: Math.round(foodItem.fiber * portionMultiplier * 10) / 10,
    sugar: Math.round(foodItem.sugar * portionMultiplier * 10) / 10,
    sodium: Math.round(foodItem.sodium * portionMultiplier),
  };

  const getHealthScore = (food: FoodItem) => {
    let score = 70; // Base score
    
    // Positive factors
    if (food.fiber > 5) score += 10; // High fiber
    if (food.protein > 15) score += 5; // Good protein
    if (food.sodium < 300) score += 10; // Low sodium
    if (food.sugar < 10) score += 5; // Low sugar
    
    // Negative factors
    if (food.sodium > 800) score -= 15; // High sodium
    if (food.sugar > 20) score -= 10; // High sugar
    if (food.calories > 500) score -= 5; // High calorie
    
    return Math.max(0, Math.min(100, score));
  };

  const getHealthBadge = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-500', emoji: '🟢' };
    if (score >= 60) return { label: 'Moderate', color: 'bg-yellow-500', emoji: '🟡' };
    return { label: 'Poor', color: 'bg-red-500', emoji: '🔴' };
  };

  const getHealthFlags = (food: FoodItem) => {
    const flags = [];
    
    if (food.fiber > 5) flags.push({ emoji: '🥦', label: 'High Fiber', positive: true });
    if (food.sodium > 800) flags.push({ emoji: '🧂', label: 'High Sodium', positive: false });
    if (food.sugar > 15) flags.push({ emoji: '🍯', label: 'High Sugar', positive: false });
    if (food.protein > 20) flags.push({ emoji: '🥩', label: 'High Protein', positive: true });
    
    // Mock some additional flags for demo
    if (food.name.toLowerCase().includes('organic')) flags.push({ emoji: '🌱', label: 'Organic', positive: true });
    if (food.name.toLowerCase().includes('processed')) flags.push({ emoji: '🥼', label: 'Processed', positive: false });
    
    return flags;
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    
    // Success animation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onConfirm(adjustedFood);
    
    // Show success toast with animation
    toast({
      title: "Food Logged! ✨",
      description: `${adjustedFood.name} (${adjustedFood.calories} cal) added successfully.`,
      duration: 3000,
    });
    
    setIsConfirming(false);
    onClose();
  };

  const handleEdit = () => {
    toast({
      title: "Edit Food",
      description: "Food editing feature coming soon!",
    });
  };

  const healthScore = getHealthScore(foodItem);
  const healthBadge = getHealthBadge(healthScore);
  const healthFlags = getHealthFlags(foodItem);

  const getPortionLabel = (percentage: number) => {
    if (percentage === 0) return 'None';
    if (percentage === 25) return 'Quarter';
    if (percentage === 50) return 'Half';
    if (percentage === 75) return 'Three-quarters';
    if (percentage === 100) return 'Full portion';
    return `${percentage}%`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="text-center mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Confirm Food Log
            </DialogTitle>
          </DialogHeader>

          {/* Food Item Display */}
          <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
            {foodItem.image ? (
              <img 
                src={foodItem.image} 
                alt={foodItem.name}
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                {foodItem.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {adjustedFood.calories} calories
              </p>
            </div>
          </div>

          {/* Portion Size Slider */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Portion Size
              </label>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {getPortionLabel(portionPercentage[0])}
              </span>
            </div>
            <Slider
              value={portionPercentage}
              onValueChange={setPortionPercentage}
              max={100}
              min={0}
              step={25}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Tabs for Nutrition and Health */}
          <Tabs defaultValue="nutrition" className="mb-6">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <TabsTrigger value="nutrition" className="rounded-lg">Nutrition</TabsTrigger>
              <TabsTrigger value="health" className="rounded-lg">Health Check</TabsTrigger>
            </TabsList>
            
            <TabsContent value="nutrition" className="space-y-3 mt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <div className="text-lg">🥩</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {adjustedFood.protein}g
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Protein</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                  <div className="text-lg">🍞</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {adjustedFood.carbs}g
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Carbs</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="text-lg">🧈</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {adjustedFood.fat}g
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Fat</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Fiber</span>
                  <span className="font-medium">{adjustedFood.fiber}g</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400">Sugar</span>
                  <span className="font-medium">{adjustedFood.sugar}g</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="health" className="space-y-4 mt-4">
              {/* Health Score Badge */}
              <div className="text-center">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${healthBadge.color} text-white font-medium`}>
                  <span>{healthBadge.emoji}</span>
                  <span>{healthBadge.label}</span>
                  <span className="text-sm">({healthScore}/100)</span>
                </div>
              </div>
              
              {/* Health Flags */}
              <div className="space-y-2">
                {healthFlags.map((flag, index) => (
                  <div 
                    key={index}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      flag.positive 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                        : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                    }`}
                  >
                    <span className="text-lg">{flag.emoji}</span>
                    <span className={`text-sm font-medium ${
                      flag.positive ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'
                    }`}>
                      {flag.label}
                    </span>
                  </div>
                ))}
                
                {healthFlags.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No specific health flags detected</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex-1 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isConfirming || portionPercentage[0] === 0}
              className={`flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white transition-all duration-300 ${
                isConfirming ? 'animate-pulse' : 'hover:scale-105'
              }`}
            >
              {isConfirming ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Logging...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FoodConfirmationCard;
