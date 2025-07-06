
import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera as CameraIcon, Upload, Mic, Scan, Edit, Utensils, Coffee, Apple, Pizza } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ProcessingStatus } from '@/components/camera/ProcessingStatus';
import { RetryActions } from '@/components/camera/RetryActions';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import FoodEditScreen from '@/components/FoodEditScreen';

const Camera = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognizedFood, setRecognizedFood] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabAction = useCallback((tabType: string) => {
    console.log(`${tabType} tab clicked`);
    toast({
      title: `${tabType} Selected`,
      description: `You selected the ${tabType} option.`,
    });
  }, [toast]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setError(null);
      
      // Simulate processing
      setTimeout(() => {
        setIsProcessing(false);
        const mockFood = {
          name: "Grilled Chicken Salad",
          calories: 350,
          protein: 30,
          carbs: 15,
          fat: 18,
          fiber: 5,
          sugar: 8,
          sodium: 450
        };
        setRecognizedFood(mockFood);
        setIsConfirmationOpen(true);
        toast({
          title: "Photo Uploaded!",
          description: "Your food photo has been processed.",
        });
      }, 2000);
    }
  }, [toast]);

  const handleCapture = useCallback(() => {
    setIsProcessing(true);
    setError(null);

    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Photo Captured!",
        description: "Your food photo has been processed.",
      });
    }, 2000);
  }, [toast]);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsProcessing(false);
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
    setIsProcessing(false);
  }, []);

  const handleConfirmFood = (foodItem: any) => {
    console.log('Food confirmed:', foodItem);
    setRecognizedFood(null);
    setIsConfirmationOpen(false);
    toast({
      title: "Food Logged!",
      description: `${foodItem.name} has been added to your log.`,
    });
  };

  const handleEditFood = (updatedFood: any, logTime: Date, note: string) => {
    console.log('Food edited:', updatedFood, logTime, note);
    setRecognizedFood(updatedFood);
    setIsEditing(false);
  };

  if (isEditing && recognizedFood) {
    return (
      <FoodEditScreen
        isOpen={true}
        onClose={() => setIsEditing(false)}
        onSave={handleEditFood}
        foodItem={recognizedFood}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Content Card */}
      <Card className="glass-card border-0 mb-8">
        <CardContent className="card-spacing">
          {/* 8-Tab Grid Layout */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Top Row - Primary Actions (Bluish Color) */}
            <Button
              variant="ghost"
              className="h-24 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg transition-all duration-300"
              onClick={() => {
                fileInputRef.current?.click();
                handleTabAction('Upload Photo');
              }}
            >
              <Upload className="h-6 w-6" />
              <span className="text-sm font-semibold">Upload Photo</span>
            </Button>

            <Button
              variant="ghost"
              className="h-24 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg transition-all duration-300"
              onClick={() => handleTabAction('Speak to Log')}
            >
              <Mic className="h-6 w-6" />
              <span className="text-sm font-semibold">Speak to Log</span>
            </Button>

            {/* Second Row - Primary Actions (Bluish Color) */}
            <Button
              variant="ghost"
              className="h-24 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg transition-all duration-300"
              onClick={() => handleTabAction('Scan Barcode')}
            >
              <Scan className="h-6 w-6" />
              <span className="text-sm font-semibold">Scan Barcode</span>
            </Button>

            <Button
              variant="ghost"
              className="h-24 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg transition-all duration-300"
              onClick={() => handleTabAction('Manual Entry')}
            >
              <Edit className="h-6 w-6" />
              <span className="text-sm font-semibold">Manual Entry</span>
            </Button>
          </div>

          {/* Bottom Row - Secondary Actions (Light Gray) */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="ghost"
              className="h-24 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg transition-all duration-300"
              onClick={() => handleTabAction('Quick Meals')}
            >
              <Utensils className="h-6 w-6" />
              <span className="text-sm font-semibold">Quick Meals</span>
            </Button>

            <Button
              variant="ghost"
              className="h-24 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg transition-all duration-300"
              onClick={() => handleTabAction('Beverages')}
            >
              <Coffee className="h-6 w-6" />
              <span className="text-sm font-semibold">Beverages</span>
            </Button>

            <Button
              variant="ghost"
              className="h-24 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg transition-all duration-300"
              onClick={() => handleTabAction('Fruits & Snacks')}
            >
              <Apple className="h-6 w-6" />
              <span className="text-sm font-semibold">Fruits & Snacks</span>
            </Button>

            <Button
              variant="ghost"
              className="h-24 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg transition-all duration-300"
              onClick={() => handleTabAction('Recipes')}
            >
              <Pizza className="h-6 w-6" />
              <span className="text-sm font-semibold">Recipes</span>
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Processing Status */}
          {isProcessing && (
            <ProcessingStatus 
              isProcessing={true}
              processingStep="Analyzing your meal..."
              showTimeout={true}
            />
          )}

          {/* Error State */}
          {error && (
            <RetryActions 
              onRetryPhoto={() => {
                setError(null);
                setIsProcessing(false);
              }}
              onStartOver={() => {
                setError(null);
                setIsProcessing(false);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Food Confirmation Modal */}
      <FoodConfirmationCard
        isOpen={isConfirmationOpen}
        onClose={() => {
          setIsConfirmationOpen(false);
          setRecognizedFood(null);
        }}
        onConfirm={handleConfirmFood}
        foodItem={recognizedFood}
      />
    </div>
  );
};

export default Camera;
