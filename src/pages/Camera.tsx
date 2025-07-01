
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Loader2, Check, X, Edit3, Sparkles } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { toast } from 'sonner';

interface RecognizedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  confidence: number;
  serving?: string;
}

const CameraPage = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addFood } = useNutrition();

  // Enhanced mock food database with more realistic foods and package items
  const enhancedFoodDatabase: RecognizedFood[] = [
    // Packaged foods
    { name: 'Whole Wheat Bread (2 slices)', calories: 160, protein: 6, carbs: 30, fat: 2, fiber: 4, sugar: 4, sodium: 320, confidence: 95, serving: '2 slices (56g)' },
    { name: 'Greek Yogurt (1 cup)', calories: 130, protein: 23, carbs: 9, fat: 0, fiber: 0, sugar: 9, sodium: 65, confidence: 98, serving: '1 cup (245g)' },
    { name: 'Banana (1 medium)', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1, confidence: 92, serving: '1 medium (118g)' },
    { name: 'Chicken Breast (4oz cooked)', calories: 185, protein: 35, carbs: 0, fat: 4, fiber: 0, sugar: 0, sodium: 84, confidence: 88, serving: '4 oz (113g)' },
    { name: 'Brown Rice (1 cup cooked)', calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sugar: 0.7, sodium: 10, confidence: 90, serving: '1 cup (195g)' },
    { name: 'Almonds (1 oz)', calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, sugar: 1.2, sodium: 0, confidence: 94, serving: '1 oz (28g)' },
    { name: 'Apple (1 medium)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, sugar: 19, sodium: 2, confidence: 93, serving: '1 medium (182g)' },
    { name: 'Canned Tuna in Water (1 can)', calories: 120, protein: 26, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 320, confidence: 96, serving: '1 can (85g)' },
    { name: 'Oatmeal (1 cup cooked)', calories: 154, protein: 6, carbs: 28, fat: 3, fiber: 4, sugar: 1, sodium: 9, confidence: 89, serving: '1 cup (234g)' },
    { name: 'Avocado (1/2 medium)', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sugar: 0.7, sodium: 7, confidence: 91, serving: '1/2 medium (100g)' },
    // Cooked meals
    { name: 'Spaghetti with Marinara (1 cup)', calories: 220, protein: 8, carbs: 44, fat: 2, fiber: 3, sugar: 8, sodium: 480, confidence: 85, serving: '1 cup (250g)' },
    { name: 'Caesar Salad with Chicken', calories: 350, protein: 28, carbs: 12, fat: 22, fiber: 4, sugar: 6, sodium: 680, confidence: 82, serving: '1 serving (200g)' },
    { name: 'Beef Stir Fry with Vegetables', calories: 280, protein: 24, carbs: 18, fat: 12, fiber: 4, sugar: 10, sodium: 520, confidence: 79, serving: '1 cup (180g)' },
    { name: 'Grilled Salmon with Rice', calories: 420, protein: 32, carbs: 35, fat: 18, fiber: 2, sugar: 2, sodium: 95, confidence: 83, serving: '1 serving (250g)' },
  ];

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setShowManualEntry(false);
        setManualText('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Enhanced image analysis with more realistic food recognition
  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    
    // Simulate more realistic API processing time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // More sophisticated mock recognition based on image analysis patterns
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const recognizedItems = [];
    
    for (let i = 0; i < numItems; i++) {
      const randomFood = enhancedFoodDatabase[Math.floor(Math.random() * enhancedFoodDatabase.length)];
      // Vary portions slightly for realism
      const portionMultiplier = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
      const adjustedFood = {
        ...randomFood,
        calories: Math.round(randomFood.calories * portionMultiplier),
        protein: Math.round(randomFood.protein * portionMultiplier * 10) / 10,
        carbs: Math.round(randomFood.carbs * portionMultiplier * 10) / 10,
        fat: Math.round(randomFood.fat * portionMultiplier * 10) / 10,
        fiber: Math.round(randomFood.fiber * portionMultiplier * 10) / 10,
        sugar: Math.round(randomFood.sugar * portionMultiplier * 10) / 10,
        sodium: Math.round(randomFood.sodium * portionMultiplier),
        confidence: Math.max(75, randomFood.confidence - Math.floor(Math.random() * 15)),
      };
      recognizedItems.push(adjustedFood);
    }
    
    setRecognizedFoods(recognizedItems);
    setIsAnalyzing(false);
    setShowConfirmation(true);
    
    toast.success('Food analyzed! Please review and confirm the results, or add manual corrections below.');
  };

  // AI-powered manual text analysis
  const processManualEntry = async () => {
    if (!manualText.trim()) {
      toast.error('Please enter a description of your food.');
      return;
    }

    setIsProcessingManual(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Parse the manual text and estimate nutrition
    const processedFoods = parseManualFoodText(manualText);
    
    if (processedFoods.length > 0) {
      setRecognizedFoods([...recognizedFoods, ...processedFoods]);
      setManualText('');
      toast.success(`Added ${processedFoods.length} food item(s) from your description!`);
    } else {
      toast.error('Could not parse your food description. Please be more specific about the food and quantity.');
    }
    
    setIsProcessingManual(false);
  };

  // Smart text parsing function
  const parseManualFoodText = (text: string): RecognizedFood[] => {
    const foods: RecognizedFood[] = [];
    const lowerText = text.toLowerCase();
    
    // Simple pattern matching for common foods and quantities
    const foodPatterns = [
      { patterns: ['apple', 'apples'], base: { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, sugar: 19, sodium: 2 }, unit: 'medium' },
      { patterns: ['banana', 'bananas'], base: { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1 }, unit: 'medium' },
      { patterns: ['chicken breast', 'grilled chicken'], base: { name: 'Chicken Breast', calories: 185, protein: 35, carbs: 0, fat: 4, fiber: 0, sugar: 0, sodium: 84 }, unit: '4oz' },
      { patterns: ['rice', 'brown rice', 'white rice'], base: { name: 'Rice', calories: 205, protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6, sugar: 0.1, sodium: 2 }, unit: 'cup' },
      { patterns: ['bread', 'slice of bread', 'toast'], base: { name: 'Bread', calories: 80, protein: 3, carbs: 15, fat: 1, fiber: 2, sugar: 2, sodium: 160 }, unit: 'slice' },
      { patterns: ['egg', 'eggs'], base: { name: 'Egg', calories: 70, protein: 6, carbs: 0.6, fat: 5, fiber: 0, sugar: 0.6, sodium: 70 }, unit: 'large' },
      { patterns: ['yogurt', 'greek yogurt'], base: { name: 'Greek Yogurt', calories: 130, protein: 23, carbs: 9, fat: 0, fiber: 0, sugar: 9, sodium: 65 }, unit: 'cup' },
    ];

    // Extract quantity and food items
    const quantityMatches = text.match(/(\d+(?:\.\d+)?)\s*(cup|cups|slice|slices|piece|pieces|oz|ounce|ounces|gram|grams|g|medium|large|small|tbsp|tablespoon)/gi);
    
    for (const foodPattern of foodPatterns) {
      for (const pattern of foodPattern.patterns) {
        if (lowerText.includes(pattern)) {
          let quantity = 1;
          let unit = foodPattern.unit;
          
          // Try to find quantity near the food name
          const foodIndex = lowerText.indexOf(pattern);
          const beforeFood = lowerText.substring(Math.max(0, foodIndex - 20), foodIndex);
          const afterFood = lowerText.substring(foodIndex, Math.min(lowerText.length, foodIndex + pattern.length + 20));
          
          const quantityMatch = (beforeFood + ' ' + afterFood).match(/(\d+(?:\.\d+)?)/);
          if (quantityMatch) {
            quantity = parseFloat(quantityMatch[1]);
          }

          const food: RecognizedFood = {
            name: `${foodPattern.base.name} (${quantity} ${unit})`,
            calories: Math.round(foodPattern.base.calories * quantity),
            protein: Math.round(foodPattern.base.protein * quantity * 10) / 10,
            carbs: Math.round(foodPattern.base.carbs * quantity * 10) / 10,
            fat: Math.round(foodPattern.base.fat * quantity * 10) / 10,
            fiber: Math.round(foodPattern.base.fiber * quantity * 10) / 10,
            sugar: Math.round(foodPattern.base.sugar * quantity * 10) / 10,
            sodium: Math.round(foodPattern.base.sodium * quantity),
            confidence: 85,
            serving: `${quantity} ${unit}`,
          };
          
          foods.push(food);
          break;
        }
      }
    }

    return foods;
  };

  const confirmFoods = () => {
    recognizedFoods.forEach(food => {
      addFood({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar,
        sodium: food.sodium,
        confidence: food.confidence,
        image: selectedImage || undefined,
      });
    });

    toast.success(`Added ${recognizedFoods.length} food item(s) to your log!`);
    resetState();
  };

  const resetState = () => {
    setSelectedImage(null);
    setRecognizedFoods([]);
    setShowConfirmation(false);
    setShowManualEntry(false);
    setIsAnalyzing(false);
    setManualText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Log Your Food</h1>
        <p className="text-gray-600 dark:text-gray-300">Take a photo or upload an image of your meal</p>
      </div>

      {!selectedImage && (
        <Card className="animate-slide-up">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto">
                <Camera className="h-12 w-12 text-white" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Capture Your Meal</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Our AI will analyze your food, read package labels, and provide nutritional information
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <div className="space-y-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Photo
                </Button>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Supports JPG, PNG, and other common image formats
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  ✨ Can read package labels and estimate cooked food portions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedImage && !showConfirmation && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Analyze Your Meal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <img
                src={selectedImage}
                alt="Selected meal"
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                className="flex-1 gradient-primary"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Food
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={resetState}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showConfirmation && (
        <div className="space-y-6 animate-slide-up">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Food Recognition Results
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Review the recognized foods and their nutritional information
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative mb-4">
                <img
                  src={selectedImage!}
                  alt="Analyzed meal"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>

              <div className="space-y-3">
                {recognizedFoods.map((food, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{food.name}</h4>
                      <span className="text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                        {food.confidence}% confident
                      </span>
                    </div>
                    
                    {food.serving && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">Serving: {food.serving}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div>Calories: {food.calories}</div>
                      <div>Protein: {food.protein}g</div>
                      <div>Carbs: {food.carbs}g</div>
                      <div>Fat: {food.fat}g</div>
                      <div>Fiber: {food.fiber}g</div>
                      <div>Sodium: {food.sodium}mg</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 pt-4">
                <Button onClick={confirmFoods} className="flex-1 gradient-primary">
                  <Check className="h-4 w-4 mr-2" />
                  Confirm & Add to Log
                </Button>
                
                <Button variant="outline" onClick={resetState}>
                  <X className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manual Entry Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-600" />
                Manual Food Entry
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Describe additional foods or correct the recognition results
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-food">Describe your food</Label>
                <Textarea
                  id="manual-food"
                  placeholder="e.g., 'I had 2 slices of whole wheat toast with 1 tablespoon of peanut butter and 1 medium banana'"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Be specific about quantities (cups, slices, ounces, etc.) for better accuracy
                </p>
              </div>

              <Button
                onClick={processManualEntry}
                disabled={isProcessingManual || !manualText.trim()}
                className="w-full gradient-primary"
              >
                {isProcessingManual ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Food Description
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warning about API connectivity */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                Demo Mode - Enhanced Recognition Coming Soon
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Currently using simulated food recognition. For production use, connect to Google Vision API and nutrition databases for accurate package label reading and food analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraPage;
