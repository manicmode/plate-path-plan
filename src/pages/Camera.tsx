import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, Check, X, Sparkles, Mic, MicOff } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { sendToLogVoice } from '@/integrations/logVoice';

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

interface VoiceApiResponse {
  success: boolean;
  data: {
    foodItems: Array<{
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sugar: number;
      sodium: number;
      confidence: number;
      serving: string;
    }>;
    analysis: string;
  };
  originalText: string;
  error?: string;
}

const CameraPage = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFood[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showVoiceEntry, setShowVoiceEntry] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [visionResults, setVisionResults] = useState<VisionApiResponse | null>(null);
  const [voiceResults, setVoiceResults] = useState<VoiceApiResponse | null>(null);
  const [inputSource, setInputSource<'photo' | 'voice'>('photo');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addFood } = useNutrition();
  const { isRecording, isProcessing: isVoiceProcessing, startRecording, stopRecording } = useVoiceRecording();

  // Unified function to process nutrition data from both photo and voice sources
  const processNutritionData = (source: 'photo' | 'voice', data: VisionApiResponse | VoiceApiResponse): RecognizedFood[] => {
    const foods: RecognizedFood[] = [];
    
    if (source === 'voice' && 'data' in data) {
      // Process voice API response
      const voiceData = data as VoiceApiResponse;
      if (voiceData.success && voiceData.data.foodItems) {
        voiceData.data.foodItems.forEach(item => {
          foods.push({
            name: `${item.name} (Voice Input)`,
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            fiber: item.fiber || 0,
            sugar: item.sugar || 0,
            sodium: item.sodium || 0,
            confidence: item.confidence || 80,
            serving: item.serving || 'Voice estimated portion',
          });
        });
      }
    } else if (source === 'photo' && 'labels' in data) {
      // Process vision API response (existing logic)
      const visionData = data as VisionApiResponse;
      
      if (visionData.nutritionData && Object.keys(visionData.nutritionData).length > 0) {
        const mainLabel = visionData.foodLabels[0]?.description || visionData.labels[0]?.description || 'Unknown Food';
        foods.push({
          name: mainLabel,
          calories: visionData.nutritionData.calories || 0,
          protein: visionData.nutritionData.protein || 0,
          carbs: visionData.nutritionData.carbs || 0,
          fat: visionData.nutritionData.fat || 0,
          fiber: visionData.nutritionData.fiber || 0,
          sugar: visionData.nutritionData.sugar || 0,
          sodium: visionData.nutritionData.sodium || 0,
          confidence: Math.round((visionData.foodLabels[0]?.score || 0.5) * 100),
          serving: 'As labeled',
        });
      } else {
        visionData.foodLabels.forEach(label => {
          const estimatedNutrition = estimateNutritionFromLabel(label.description);
          foods.push({
            name: label.description,
            ...estimatedNutrition,
            confidence: Math.round(label.score * 100),
            serving: 'Estimated portion',
          });
        });
      }
    }

    return foods.slice(0, 3);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setShowVoiceEntry(false);
        setVoiceText('');
        setVisionResults(null);
        setVoiceResults(null);
        setInputSource('photo');
      };
      reader.readAsDataURL(file);
    }
  };

  const convertToBase64 = (imageDataUrl: string): string => {
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

      const processedFoods = processNutritionData('photo', data);
      setRecognizedFoods(processedFoods);
      setInputSource('photo');
      setShowConfirmation(true);
      
      toast.success(`Detected items: ${data.labels.slice(0, 3).map((l: any) => l.description).join(', ')}`);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const estimateNutritionFromLabel = (foodName: string) => {
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

    return { calories: 100, protein: 2, carbs: 15, fat: 2, fiber: 1, sugar: 5, sodium: 50 };
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setVoiceText(transcribedText);
        setShowVoiceEntry(true);
        setInputSource('voice');
      }
    } else {
      await startRecording();
    }
  };

  const processVoiceEntry = async () => {
    if (!voiceText.trim()) {
      toast.error('No voice input detected. Please try recording again.');
      return;
    }

    setIsProcessingVoice(true);
    
    try {
      const result = await sendToLogVoice(voiceText);

      if (!result.success) {
        throw new Error(result.error || 'Failed to process voice input');
      }

      // Parse the structured response from the updated edge function
      const voiceApiResponse: VoiceApiResponse = {
        success: result.success,
        data: result.message ? JSON.parse(result.message) : { foodItems: [], analysis: '' },
        originalText: voiceText,
      };

      console.log('Voice API Response:', voiceApiResponse);
      setVoiceResults(voiceApiResponse);

      // Use unified processing function
      const processedFoods = processNutritionData('voice', voiceApiResponse);
      
      if (processedFoods.length > 0) {
        setRecognizedFoods(processedFoods);
        setShowConfirmation(true); // THIS IS THE KEY FIX - show confirmation modal
        setShowVoiceEntry(false); // Hide voice entry card
        toast.success(`Analyzed ${processedFoods.length} food item(s)! Please review and confirm.`);
      } else {
        toast.error('Could not identify any food items from your voice input.');
      }
      
    } catch (error) {
      console.error('Error processing voice input:', error);
      toast.error('Failed to process voice input. Please try again.');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const confirmFoods = async () => {
    try {
      // Add foods to context and mark as confirmed
      for (const food of recognizedFoods) {
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

        // Persist to Supabase nutrition_logs table
        const { error } = await supabase
          .from('nutrition_logs')
          .insert({
            food_name: food.name,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            fiber: food.fiber,
            sugar: food.sugar,
            sodium: food.sodium,
            confidence: food.confidence,
            serving_size: food.serving,
            source: inputSource === 'voice' ? 'voice' : 'vision_api',
            image_url: selectedImage || null,
          });

        if (error) {
          console.error('Error saving to Supabase:', error);
          // Don't throw error to avoid disrupting UX, but log it
        }
      }

      toast.success(`Added ${recognizedFoods.length} food item(s) to your log!`);
      resetState();
    } catch (error) {
      console.error('Error confirming foods:', error);
      toast.error('Failed to save some items. Please try again.');
    }
  };

  const resetState = () => {
    setSelectedImage(null);
    setRecognizedFoods([]);
    setShowConfirmation(false);
    setShowVoiceEntry(false);
    setIsAnalyzing(false);
    setVoiceText('');
    setVisionResults(null);
    setVoiceResults(null);
    setInputSource('photo');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Log Your Food</h1>
        <p className="text-gray-600 dark:text-gray-300">Take a photo or speak your meal</p>
      </div>

      {!selectedImage && !showConfirmation && (
        <Card className="animate-slide-up">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto">
                <Camera className="h-12 w-12 text-white" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Capture Your Meal</h3>
                <p className="text-gray-600 dark:text-gray-300">
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
                
                <Button
                  onClick={handleVoiceRecording}
                  disabled={isVoiceProcessing}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-5 w-5 mr-2" />
                      Stop Recording
                    </>
                  ) : isVoiceProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5 mr-2" />
                      Speak to Log
                    </>
                  )}
                </Button>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Supports JPG, PNG, and voice input
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  ✨ Powered by AI - analyzes food and estimates nutrition
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Entry Card */}
      {showVoiceEntry && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-600" />
              Voice Input Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">You said:</p>
              <p className="font-medium">{voiceText}</p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={processVoiceEntry}
                disabled={isProcessingVoice}
                className="flex-1 gradient-primary"
              >
                {isProcessingVoice ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze & Log Food
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={() => setShowVoiceEntry(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Analysis Card */}
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

      {/* Unified Confirmation Modal for both Photo and Voice */}
      {showConfirmation && (
        <div className="space-y-6 animate-slide-up">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Food Recognition Results
                <span className="text-sm font-normal text-gray-500">
                  ({inputSource === 'voice' ? 'Voice Input' : 'Photo Analysis'})
                </span>
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Review the recognized foods and their nutritional information
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show image for photo input */}
              {selectedImage && inputSource === 'photo' && (
                <div className="relative mb-4">
                  <img
                    src={selectedImage}
                    alt="Analyzed meal"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}

              {/* Show transcribed text for voice input */}
              {inputSource === 'voice' && voiceText && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    <Mic className="h-4 w-4 inline mr-2" />
                    Voice Input: "{voiceText}"
                  </h4>
                  {voiceResults?.data.analysis && (
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {voiceResults.data.analysis}
                    </p>
                  )}
                </div>
              )}

              {/* Show vision results for photo input */}
              {visionResults && inputSource === 'photo' && (
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
        </div>
      )}

      {/* API Status Card */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                AI-Powered Food Logging
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300">
                Photo analysis and voice input with AI nutrition estimation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraPage;
