import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Check, X, Sparkles, Mic, MicOff, Edit3 } from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { sendToLogVoice } from '@/integrations/logVoice';
import imageCompression from 'browser-image-compression';
import { ProcessingStatus } from '@/components/camera/ProcessingStatus';
import { RetryActions } from '@/components/camera/RetryActions';
import { validateImageFile, getImageDimensions } from '@/utils/imageValidation';

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
  error?: boolean;
  message?: string;
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
  errorType?: string;
  errorMessage?: string;
  suggestions?: string[];
  detectedItems?: string[];
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
  const [processingStep, setProcessingStep] = useState('');
  const [visionResults, setVisionResults] = useState<VisionApiResponse | null>(null);
  const [voiceResults, setVoiceResults] = useState<VoiceApiResponse | null>(null);
  const [inputSource, setInputSource] = useState<'photo' | 'voice' | 'manual'>('photo');
  
  // Error handling states
  const [showError, setShowError] = useState(false);
  const [errorType, setErrorType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorSuggestions, setErrorSuggestions] = useState<string[]>([]);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [manualEditText, setManualEditText] = useState('');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addFood } = useNutrition();
  const { isRecording, isProcessing: isVoiceProcessing, recordingDuration, startRecording, stopRecording } = useVoiceRecording();

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Helper function to compress image if needed
  const compressImageIfNeeded = async (file: File): Promise<string> => {
    const fileSizeMB = file.size / (1024 * 1024);
    
    console.log('Original image size:', fileSizeMB.toFixed(2), 'MB');
    
    if (fileSizeMB <= 1) {
      // Image is already under 1MB, convert directly to base64
      console.log('Image is under 1MB, no compression needed');
      return await fileToBase64(file);
    }

    console.log('Compressing image from', fileSizeMB.toFixed(2), 'MB to under 1MB...');
    
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      const compressedSizeMB = compressedFile.size / (1024 * 1024);
      
      console.log('Compressed image size:', compressedSizeMB.toFixed(2), 'MB');
      
      return await fileToBase64(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to compress image. Using original size.');
      return await fileToBase64(file);
    }
  };

  const processNutritionData = (source: 'photo' | 'voice' | 'manual', data: VisionApiResponse | VoiceApiResponse): RecognizedFood[] => {
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

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('Image selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate the image file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    if (validation.warning) {
      setValidationWarning(validation.warning);
      toast.warning(validation.warning);
    }

    try {
      // Compress image if needed and convert to base64
      const imageBase64 = await compressImageIfNeeded(file);
      const imageDataUrl = `data:${file.type};base64,${imageBase64}`;
      
      console.log('Image processed successfully');
      setSelectedImage(imageDataUrl);
      setShowVoiceEntry(false);
      setVoiceText('');
      setVisionResults(null);
      setVoiceResults(null);
      setInputSource('photo');
      resetErrorState();
      setValidationWarning(null);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again.');
    }
  };

  const convertToBase64 = (imageDataUrl: string): string => {
    return imageDataUrl.split(',')[1];
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      console.error('No selected image to analyze');
      toast.error('No image selected');
      return;
    }

    console.log('=== Starting image analysis ===');
    setIsAnalyzing(true);
    setProcessingStep('Validating image...');
    
    // Create AbortController for this request
    abortControllerRef.current = new AbortController();
    
    try {
      const imageBase64 = convertToBase64(selectedImage);
      
      setProcessingStep('Compressing image...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX
      
      setProcessingStep('Sending to Vision API...');
      console.log('Calling Supabase function vision-label-reader...');
      
      // Set up 25-second timeout using Promise.race
      const functionCallPromise = supabase.functions.invoke('vision-label-reader', {
        body: { imageBase64 }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('25-second timeout reached, aborting request');
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          reject(new Error('Analysis timed out after 25 seconds'));
        }, 25000);
      });

      // Race between function call and timeout
      const { data, error } = await Promise.race([
        functionCallPromise,
        timeoutPromise
      ]) as any;

      console.log('Function result received');

      // Check if the request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Request was aborted');
        toast.error('Analysis timed out');
        return;
      }

      if (error) {
        console.error('Supabase function error:', error);
        
        if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
          toast.error('Analysis timed out - please try again');
        } else {
          toast.error(`Analysis failed: ${error.message || 'Unknown error'}`);
        }
        return;
      }

      if (!data) {
        console.error('No data returned from vision API');
        toast.error('No data returned from analysis. Please try again.');
        return;
      }

      if (data.error) {
        console.error('Vision API returned error:', data.message);
        toast.error(`Analysis failed: ${data.message}`);
        return;
      }

      console.log('Processing Vision API results...');
      setVisionResults(data);

      const processedFoods = processNutritionData('photo', data);
      
      if (processedFoods.length === 0) {
        toast.error('No food items detected in the image. Please try a different photo.');
        return;
      }

      setRecognizedFoods(processedFoods);
      setInputSource('photo');
      setShowConfirmation(true);
      
      toast.success(`Detected ${processedFoods.length} food item(s): ${processedFoods.map(f => f.name).join(', ')}`);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        console.log('Request timed out');
        toast.error('Analysis timed out - please try again');
      } else if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        console.log('Request was aborted due to timeout');
        toast.error('Analysis timed out');
      } else {
        toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Please try again'}`);
      }
    } finally {
      setIsAnalyzing(false);
      setProcessingStep('');
      abortControllerRef.current = null;
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
      setProcessingStep('Processing...');
      const transcribedText = await stopRecording();
      if (transcribedText) {
        setVoiceText(transcribedText);
        setShowVoiceEntry(true);
        setInputSource('voice');
        resetErrorState();
      }
      setProcessingStep('');
    } else {
      await startRecording();
      resetErrorState();
    }
  };

  const processVoiceEntry = async () => {
    if (!voiceText.trim()) {
      showErrorState('NO_INPUT', 'No voice input detected. Please try recording again.', [
        'Make sure to speak clearly into the microphone',
        'Try recording in a quieter environment'
      ]);
      return;
    }

    setIsProcessingVoice(true);
    setProcessingStep('Processing...');
    
    try {
      setProcessingStep('Analyzing...');
      const result = await sendToLogVoice(voiceText);

      if (!result.success) {
        // Handle structured error response from edge function
        const errorData = result.message ? JSON.parse(result.message) : {};
        showErrorState(
          errorData.errorType || 'UNKNOWN_ERROR',
          errorData.errorMessage || result.error || 'Failed to process voice input',
          errorData.suggestions || ['Please try again with more specific descriptions']
        );
        return;
      }

      setProcessingStep('Preparing...');
      // Parse the structured response from the updated edge function
      const voiceApiResponse: VoiceApiResponse = JSON.parse(result.message);

      console.log('Voice API Response:', voiceApiResponse);
      setVoiceResults(voiceApiResponse);

      // Use unified processing function
      const processedFoods = processNutritionData('voice', voiceApiResponse);
      
      if (processedFoods.length > 0) {
        setRecognizedFoods(processedFoods);
        setShowConfirmation(true);
        setShowVoiceEntry(false);
        resetErrorState();
        toast.success(`Analyzed ${processedFoods.length} food item(s)! Please review and confirm.`);
      } else {
        showErrorState('NO_FOOD_DETECTED', 'Could not identify any food items from your voice input.', [
          'Try mentioning specific food names',
          'Include quantities or portions in your description'
        ]);
      }
      
    } catch (error) {
      console.error('Error processing voice input:', error);
      showErrorState('SYSTEM_ERROR', 'Failed to process voice input. Please try again.', [
        'Check your internet connection',
        'Try again in a moment'
      ]);
    } finally {
      setIsProcessingVoice(false);
      setProcessingStep('');
    }
  };

  const processManualEntry = async () => {
    if (!manualEditText.trim()) {
      toast.error('Please enter some food information');
      return;
    }

    setIsProcessingVoice(true);
    setProcessingStep('Processing');

    try {
      setProcessingStep('Analyzing...');
      const result = await sendToLogVoice(manualEditText);

      if (!result.success) {
        const errorData = result.message ? JSON.parse(result.message) : {};
        showErrorState(
          errorData.errorType || 'UNKNOWN_ERROR',
          errorData.errorMessage || result.error || 'Failed to process manual input',
          errorData.suggestions || ['Please try again with more specific descriptions']
        );
        return;
      }

      setProcessingStep('Preparing...');
      const voiceApiResponse: VoiceApiResponse = JSON.parse(result.message);
      setVoiceResults(voiceApiResponse);

      const processedFoods = processNutritionData('manual', voiceApiResponse);
      
      if (processedFoods.length > 0) {
        setRecognizedFoods(processedFoods);
        setShowConfirmation(true);
        setShowManualEdit(false);
        setInputSource('manual');
        resetErrorState();
        toast.success(`Analyzed ${processedFoods.length} food item(s)! Please review and confirm.`);
      } else {
        showErrorState('NO_FOOD_DETECTED', 'Could not identify any food items from your input.', [
          'Try mentioning specific food names',
          'Include quantities or portions in your description'
        ]);
      }
    } catch (error) {
      console.error('Error processing manual input:', error);
      showErrorState('SYSTEM_ERROR', 'Failed to process manual input. Please try again.', [
        'Check your internet connection',
        'Try again in a moment'
      ]);
    } finally {
      setIsProcessingVoice(false);
      setProcessingStep('');
    }
  };

  const showErrorState = (type: string, message: string, suggestions: string[]) => {
    setErrorType(type);
    setErrorMessage(message);
    setErrorSuggestions(suggestions);
    setShowError(true);
    setShowVoiceEntry(false);
    setShowConfirmation(false);
  };

  const resetErrorState = () => {
    setShowError(false);
    setErrorType('');
    setErrorMessage('');
    setErrorSuggestions([]);
  };

  const handleRetryVoice = () => {
    resetErrorState();
    setShowVoiceEntry(true);
  };

  const handleEditManually = () => {
    resetErrorState();
    setManualEditText(voiceText || '');
    setShowManualEdit(true);
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
            source: inputSource === 'voice' ? 'voice' : inputSource === 'manual' ? 'manual' : 'vision_api',
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
    setShowManualEdit(false);
    setIsAnalyzing(false);
    setVoiceText('');
    setManualEditText('');
    setVisionResults(null);
    setVoiceResults(null);
    setInputSource('photo');
    setProcessingStep('');
    resetErrorState();
    setValidationWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format recording duration for display
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up AbortController on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleRetryPhoto = () => {
    resetErrorState();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRetryAnalysis = () => {
    if (selectedImage) {
      analyzeImage();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Log Your Food</h1>
        <p className="text-gray-600 dark:text-gray-300">Take a photo or speak your meal</p>
      </div>

      {/* Processing Status */}
      <ProcessingStatus 
        isProcessing={isAnalyzing || isVoiceProcessing || !!processingStep}
        processingStep={processingStep}
        showTimeout={isAnalyzing}
      />

      {/* Validation Warning */}
      {validationWarning && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardContent className="p-4">
            <p className="text-yellow-800 dark:text-yellow-200">{validationWarning}</p>
          </CardContent>
        </Card>
      )}

      {!selectedImage && !showConfirmation && !showError && !showManualEdit && (
        <Card className="animate-slide-up">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full gradient-primary"
                    size="lg"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Photo
                  </Button>
                  
                  <div className="space-y-2">
                    <Button
                      onClick={handleVoiceRecording}
                      disabled={isVoiceProcessing || !!processingStep}
                      className={`w-full ${isRecording 
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                        : 'gradient-primary'
                      }`}
                      size="lg"
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="h-5 w-5 mr-2" />
                          Stop Recording ({formatRecordingTime(recordingDuration)})
                        </>
                      ) : (isVoiceProcessing || processingStep) ? (
                        <>
                          <ProcessingStatus 
                            isProcessing={true}
                            processingStep={processingStep || 'Processing...'}
                          />
                        </>
                      ) : (
                        <>
                          <Mic className="h-5 w-5 mr-2" />
                          Speak to Log
                        </>
                      )}
                    </Button>
                    
                    {isRecording && (
                      <div className="text-center">
                        <p className="text-sm text-red-600 font-medium animate-pulse">
                          🔴 Recording... Click button again to stop
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

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
                disabled={isProcessingVoice || !!processingStep}
                className="flex-1 gradient-primary min-w-[120px]"
              >
                {isProcessingVoice || processingStep ? (
                  <>
                    <ProcessingStatus 
                      isProcessing={true}
                      processingStep={processingStep || 'Processing...'}
                    />
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={() => setShowVoiceEntry(false)} className="flex-1 min-w-[80px]">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display Card */}
      {showError && (
        <Card className="animate-slide-up border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <X className="h-5 w-5" />
              Unable to Process Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
              
              {errorSuggestions.length > 0 && (
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Try these suggestions:</p>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {errorSuggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleRetryVoice} className="flex-1 gradient-primary">
                <Mic className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button onClick={handleEditManually} variant="outline" className="flex-1">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Manually
              </Button>
              
              <Button variant="outline" onClick={resetState} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Edit Card */}
      {showManualEdit && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-green-600" />
              Manual Food Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Describe what you ate:
              </label>
              <Textarea
                value={manualEditText}
                onChange={(e) => setManualEditText(e.target.value)}
                placeholder="e.g., 1 cup white rice, 4 oz grilled chicken breast, 1 medium apple..."
                className="min-h-20"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Be specific with quantities and food names for better accuracy
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={processManualEntry}
                disabled={isProcessingVoice || !!processingStep}
                className="flex-1 gradient-primary min-w-[120px]"
              >
                {isProcessingVoice || processingStep ? (
                  <>
                    <ProcessingStatus 
                      isProcessing={true}
                      processingStep={processingStep || 'Processing...'}
                    />
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Food
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={() => setShowManualEdit(false)} className="flex-1 min-w-[80px]">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Analysis Card - Updated to remove overlay and improve loading */}
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
                className="flex-1 gradient-primary min-w-[120px]"
              >
                {!isAnalyzing ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Food
                  </>
                ) : null}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={resetState} 
                className="flex-1 min-w-[80px]"
                disabled={isAnalyzing}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>

            {/* Retry Actions for Failed Analysis */}
            {!isAnalyzing && !showConfirmation && (
              <RetryActions
                onRetryPhoto={handleRetryPhoto}
                onStartOver={resetState}
                disabled={isAnalyzing}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Unified Confirmation Modal for all input types */}
      {showConfirmation && (
        <div className="space-y-6 animate-slide-up">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Food Recognition Results
                <span className="text-sm font-normal text-gray-500">
                  ({inputSource === 'voice' ? 'Voice Input' : inputSource === 'manual' ? 'Manual Input' : 'Photo Analysis'})
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

              {/* Show transcribed text for voice/manual input */}
              {(inputSource === 'voice' || inputSource === 'manual') && (voiceText || manualEditText) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    {inputSource === 'voice' ? (
                      <>
                        <Mic className="h-4 w-4 inline mr-2" />
                        Voice Input: "{voiceText}"
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4 inline mr-2" />
                        Manual Input: "{manualEditText}"
                      </>
                    )}
                  </h4>
                  {voiceResults?.data?.analysis && (
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

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button onClick={confirmFoods} className="flex-1 gradient-primary">
                  <Check className="h-4 w-4 mr-2" />
                  Confirm & Add to Log
                </Button>
                
                <Button variant="outline" onClick={resetState} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Status Card */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                Enhanced AI Food Logging
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300">
                Improved with image validation, better error handling, and enhanced user feedback.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraPage;
