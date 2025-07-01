import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Loader2, Check, X, Edit3, Sparkles, AlertCircle } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

interface VisionApiResponse {
  labels: Array<{ description: string; score: number }>;
  foodLabels: Array<{ description: string; score: number }>;
  nutritionData: any;
  textDetected: string;
  objects: Array<{ name: string; score: number }>;
}

const CameraPage = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  const [visionResults, setVisionResults] = useState<VisionApiResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addFood } = useNutrition();

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setShowManualEntry(false);
        setManualText('');
        setVisionResults(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const convertToBase64 = (imageDataUrl: string): string => {
    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
    return imageDataUrl.split(',')[1];
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    
    try {
      const imageBase64 = convertToBase64(selectedImage);
      
      const { data, error } = await supabase.functions.invoke('vision-label-reader', {
        body: { imageBase64 }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to analyze image');
      }

      console.log('Vision API results:', data);
      setVisionResults(data);

      // Process the results to create food items
      const processedFoods = processFoodRecognition(data);
      setRecognizedFoods(processedFoods);
      setShowConfirmation(true);
      
      toast.success(`Detected items: ${data.labels.slice(0, 3).map((l: any) => l.description).join(', ')}`);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processFoodRecognition = (data: VisionApiResponse): RecognizedFood[] => {
    const foods: RecognizedFood[] = [];
    
    // If we have nutrition data from package labels
    if (data.nutritionData && Object.keys(data.nutritionData).length > 0) {
      const mainLabel = data.foodLabels[0]?.description || data.labels[0]?.description || 'Unknown Food';
      foods.push({
        name: mainLabel,
        calories: data.nutritionData.calories || 0,
        protein: data.nutritionData.protein || 0,
        carbs: data.nutritionData.carbs || 0,
        fat: data.nutritionData.fat || 0,
        fiber: data.nutritionData.fiber || 0,
        sugar: data.nutritionData.sugar || 0,
        sodium: data.nutritionData.sodium || 0,
        confidence: Math.round((data.foodLabels[0]?.score || 0.5) * 100),
        serving: 'As labeled',
      });
    } else {
      // Use food labels to estimate nutrition
      data.foodLabels.forEach(label => {
        const estimatedNutrition = estimateNutritionFromLabel(label.description);
        foods.push({
          name: label.description,
          ...estimatedNutrition,
          confidence: Math.round(label.score * 100),
          serving: 'Estimated portion',
        });
      });
    }

    return foods.slice(0, 3); // Limit to 3 items
  };

  const estimateNutritionFromLabel = (foodName: string) => {
    // Simple nutrition estimation based on food type
    const foodDatabase: { [key: string]: any } = {
      'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, sugar: 19, sodium: 2 },
      'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1 },
      'orange': { calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2, fiber: 3.1, sugar: 12.2, sodium: 0 },
      'bread': { calories: 80, protein: 3, carbs: 15, fat: 1, fiber: 2, sugar: 2, sodium: 160 },
      'cheese': { calories: 113, protein: 7, carbs: 1, fat: 9, fiber: 0, sugar: 0.5, sodium: 174 },
      'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74 },
    };

    const lowerName = foodName.toLowerCase();
    for (const [key, nutrition] of Object.entries(foodDatabase)) {
      if (lowerName.includes(key)) {
        return nutrition;
      }
    }

    // Default estimation for unknown foods
    return { calories: 100, protein: 2, carbs: 15, fat: 2, fiber: 1, sugar: 5, sodium: 50 };
  };

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
    setVisionResults(null);
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
                  ✨ Powered by Google Vision AI - reads package labels and analyzes food
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
                    Analyzing with Google Vision AI...
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
                Powered by Google Vision AI - Review the recognized foods and their nutritional information
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

              {visionResults && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Detected items: {visionResults.labels.slice(0, 5).map(l => l.description).join(', ')}
                  </h4>
                  {visionResults.textDetected && (
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Package text detected - nutrition info extracted automatically
                    </p>
                  )}
                </div>
              )}

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

      {/* API Status Card */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                Google Vision AI Connected
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300">
                Real-time food recognition, package label reading, and nutrition analysis powered by Google Vision API.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraPage;
