
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Mic, Edit, Clock, ScanLine, Save } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';

const Log = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [showConfirmationCard, setShowConfirmationCard] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState('');

  const handlePhotoCapture = () => {
    setAnalysisType('photo');
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      // Mock successful recognition
      const mockFood = {
        name: 'Grilled Chicken Breast',
        calories: 280,
        protein: 35,
        carbs: 2,
        fat: 12,
        fiber: 0,
        sugar: 0,
        sodium: 340,
      };
      
      setSelectedFood(mockFood);
      setShowConfirmationCard(true);
      setIsAnalyzing(false);
    }, 3000);
  };

  const handleVoiceLog = () => {
    setAnalysisType('voice');
    setIsAnalyzing(true);
    
    setTimeout(() => {
      const mockFood = {
        name: 'Turkey Sandwich',
        calories: 420,
        protein: 25,
        carbs: 45,
        fat: 18,
        fiber: 4,
        sugar: 6,
        sodium: 890,
      };
      
      setSelectedFood(mockFood);
      setShowConfirmationCard(true);
      setIsAnalyzing(false);
    }, 2500);
  };

  const handleManualEntry = () => {
    toast({
      title: "Manual Entry",
      description: "Opening manual food entry form...",
    });
  };

  const handleRecent = () => {
    const recentFoods = JSON.parse(localStorage.getItem('recentFoods') || '[]');
    if (recentFoods.length === 0) {
      toast({
        title: "No Recent Foods",
        description: "Start logging foods to see your recent items here.",
      });
      return;
    }
    
    const randomRecent = recentFoods[Math.floor(Math.random() * recentFoods.length)];
    setSelectedFood(randomRecent);
    setShowConfirmationCard(true);
  };

  const handleBarcodeScan = () => {
    toast({
      title: "Barcode Scanner",
      description: "Camera-based barcode scanning coming soon!",
    });
  };

  const handleSaved = () => {
    const savedFoods = JSON.parse(localStorage.getItem('savedFoods') || '[]');
    if (savedFoods.length === 0) {
      toast({
        title: "No Saved Foods",
        description: "Save foods from the confirmation screen to access them here.",
      });
      return;
    }
    
    const randomSaved = savedFoods[Math.floor(Math.random() * savedFoods.length)];
    setSelectedFood(randomSaved);
    setShowConfirmationCard(true);
  };

  const handleUnrecognizedInput = () => {
    setIsAnalyzing(false);
    toast({
      title: "Recognition Failed",
      description: "We couldn't recognize a food item. Would you like to enter it manually?",
      action: (
        <Button onClick={handleManualEntry} variant="outline" size="sm">
          Manual Entry
        </Button>
      ),
    });
  };

  const handleConfirmFood = (confirmedFood) => {
    const recentFoods = JSON.parse(localStorage.getItem('recentFoods') || '[]');
    recentFoods.unshift(confirmedFood);
    localStorage.setItem('recentFoods', JSON.stringify(recentFoods.slice(0, 20)));
    
    setSelectedFood(null);
    
    toast({
      title: "Food Logged Successfully! ✨",
      description: `${confirmedFood.name} has been added to your daily log.`,
    });
  };

  const logOptions = [
    // Top Row
    {
      id: 'photo',
      title: 'Take Photo',
      icon: Camera,
      color: 'from-blue-500 to-cyan-500',
      description: 'Capture your meal',
      onClick: handlePhotoCapture,
    },
    {
      id: 'voice',
      title: 'Speak to Log',
      icon: Mic,
      color: 'from-pink-500 to-rose-500',
      description: 'Say what you ate',
      onClick: handleVoiceLog,
    },
    {
      id: 'barcode',
      title: 'Scan Barcode',
      icon: ScanLine,
      color: 'from-green-500 to-emerald-500',
      description: 'Scan product code',
      onClick: handleBarcodeScan,
    },
    // Bottom Row
    {
      id: 'manual',
      title: 'Manual Entry',
      icon: Edit,
      color: 'from-orange-500 to-yellow-500',
      description: 'Enter food details',
      onClick: handleManualEntry,
    },
    {
      id: 'recent',
      title: 'Recent Logs',
      icon: Clock,
      color: 'from-indigo-500 to-blue-500',
      description: 'Previously logged',
      onClick: handleRecent,
    },
    {
      id: 'saved',
      title: 'Saved Logs',
      icon: Save,
      color: 'from-purple-500 to-violet-500',
      description: 'Your saved foods',
      onClick: handleSaved,
    },
  ];

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="relative">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              {analysisType === 'photo' ? (
                <Camera className="h-8 w-8 text-white" />
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Analyzing your food...
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {analysisType === 'photo' ? 'Processing image' : 'Processing audio'}
            </p>
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              ~3 seconds left
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleUnrecognizedInput}
            className="mt-4"
          >
            Having trouble? Enter manually
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Log Your Food
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Choose your preferred logging method
          </p>
        </div>

        {/* 2+2+2 Grid Layout (3 buttons per row, 2 rows) */}
        <div className="space-y-6">
          {/* Top Row - 3 buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {logOptions.slice(0, 3).map((option) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.id}
                  className="group cursor-pointer border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden h-48"
                  onClick={option.onClick}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-90`} />
                  <CardContent className="relative h-full flex flex-col items-center justify-center text-center p-6 text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {option.title}
                    </h3>
                    <p className="text-sm opacity-90">
                      {option.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bottom Row - 3 buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {logOptions.slice(3, 6).map((option) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.id}
                  className="group cursor-pointer border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden h-48"
                  onClick={option.onClick}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-90`} />
                  <CardContent className="relative h-full flex flex-col items-center justify-center text-center p-6 text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {option.title}
                    </h3>
                    <p className="text-sm opacity-90">
                      {option.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Food Confirmation Card */}
      <FoodConfirmationCard
        isOpen={showConfirmationCard}
        onClose={() => {
          setShowConfirmationCard(false);
          setSelectedFood(null);
        }}
        onConfirm={handleConfirmFood}
        foodItem={selectedFood}
      />
    </div>
  );
};

export default Log;
