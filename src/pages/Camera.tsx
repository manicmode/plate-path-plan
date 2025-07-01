
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, Check, X } from 'lucide-react';
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
}

const CameraPage = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addFood } = useNutrition();

  // Mock food database for demo
  const mockFoodData: RecognizedFood[] = [
    {
      name: 'Grilled Chicken Breast',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
      sugar: 0,
      sodium: 74,
      confidence: 92,
    },
    {
      name: 'Mixed Green Salad',
      calories: 25,
      protein: 2,
      carbs: 5,
      fat: 0.3,
      fiber: 3,
      sugar: 3,
      sodium: 15,
      confidence: 88,
    },
    {
      name: 'Brown Rice',
      calories: 112,
      protein: 2.3,
      carbs: 23,
      fat: 0.9,
      fiber: 1.8,
      sugar: 0.4,
      sodium: 5,
      confidence: 85,
    },
  ];

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    
    // Simulate API call to Google Vision API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock recognition results
    const randomFoods = mockFoodData
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);
    
    setRecognizedFoods(randomFoods);
    setIsAnalyzing(false);
    setShowConfirmation(true);
    
    toast.success('Food recognized! Please confirm the details.');
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
    setIsAnalyzing(false);
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
                <p className="text-gray-600">
                  Our AI will analyze your food and provide nutritional information
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
                
                <p className="text-sm text-gray-500">
                  Supports JPG, PNG, and other common image formats
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
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
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
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Confirm Food Items</CardTitle>
            <p className="text-sm text-gray-600">
              Please review and confirm the recognized foods
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
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{food.name}</h4>
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                      {food.confidence}% confident
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>Calories: {food.calories}</div>
                    <div>Protein: {food.protein}g</div>
                    <div>Carbs: {food.carbs}g</div>
                    <div>Fat: {food.fat}g</div>
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
      )}
    </div>
  );
};

export default CameraPage;
