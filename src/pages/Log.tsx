
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Mic, Edit, Clock, ScanLine, Save, Droplets, Pill } from 'lucide-react';
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
    
    setTimeout(() => {
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

  const handleHydration = () => {
    navigate('/hydration');
  };

  const handleSupplements = () => {
    navigate('/supplements');
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

  // Define the 8 logging options in 2x4 grid format
  const primaryLogOptions = [
    {
      id: 'photo',
      title: 'Upload Photo',
      icon: Camera,
      description: 'Take a photo of your meal',
      onClick: handlePhotoCapture,
    },
    {
      id: 'voice',
      title: 'Speak to Log',
      icon: Mic,
      description: 'Say what you ate',
      onClick: handleVoiceLog,
    },
    {
      id: 'manual',
      title: 'Manual Entry',
      icon: Edit,
      description: 'Enter food details manually',
      onClick: handleManualEntry,
    },
    {
      id: 'barcode',
      title: 'Scan Barcode',
      icon: ScanLine,
      description: 'Scan product barcode',
      onClick: handleBarcodeScan,
    },
  ];

  const secondaryLogOptions = [
    {
      id: 'saved',
      title: 'Saved Logs',
      icon: Save,
      description: 'Your frequently saved foods',
      onClick: handleSaved,
    },
    {
      id: 'recent',
      title: 'Recent Logs',
      icon: Clock,
      description: 'Previously logged foods',
      onClick: handleRecent,
    },
    {
      id: 'hydration',
      title: 'Hydration Log',
      icon: Droplets,
      description: 'Track your water intake',
      onClick: handleHydration,
    },
    {
      id: 'supplements',
      title: 'Supplement Log',
      icon: Pill,
      description: 'Log your supplements',
      onClick: handleSupplements,
    },
  ];

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 dark:from-gray-900 dark:to-gray-800 p-4">
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
            <h3 className="text-xl font-bold text-white">
              Analyzing your food...
            </h3>
            <p className="text-gray-300">
              {analysisType === 'photo' ? 'Processing image' : 'Processing audio'}
            </p>
            <div className="text-sm text-blue-400 font-medium">
              ~3 seconds left
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleUnrecognizedInput}
            className="mt-4 border-white/20 text-white hover:bg-white/10"
          >
            Having trouble? Enter manually
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 pt-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-white/90">
            Log Your Food
          </h1>
          <p className="text-base lg:text-lg text-white/70">
            Choose how you'd like to log today
          </p>
        </div>

        {/* 2x4 Grid Layout */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Top Row - Primary Options (Larger Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {primaryLogOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.id}
                  className="group cursor-pointer border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden bg-white/10 backdrop-blur-sm hover:bg-white/15 aspect-square animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={option.onClick}
                >
                  <CardContent className="h-full flex flex-col items-center justify-center text-center p-4 text-white">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center mb-3 lg:mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-400/50 transition-all duration-300">
                      <Icon className="h-7 w-7 lg:h-8 lg:w-8" />
                    </div>
                    <h3 className="text-sm lg:text-base font-bold mb-1 lg:mb-2">
                      {option.title}
                    </h3>
                    <p className="text-xs lg:text-sm text-white/80 leading-tight">
                      {option.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bottom Row - Secondary Options (Slightly Smaller) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {secondaryLogOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.id}
                  className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden bg-white/5 backdrop-blur-sm hover:bg-white/10 aspect-square animate-fade-in"
                  style={{ animationDelay: `${(index + 4) * 100}ms` }}
                  onClick={option.onClick}
                >
                  <CardContent className="h-full flex flex-col items-center justify-center text-center p-3 text-white">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500/70 to-indigo-500/70 rounded-xl flex items-center justify-center mb-2 lg:mb-3 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-blue-400/30 transition-all duration-300">
                      <Icon className="h-6 w-6 lg:h-7 lg:w-7" />
                    </div>
                    <h3 className="text-xs lg:text-sm font-bold mb-1">
                      {option.title}
                    </h3>
                    <p className="text-xs text-white/70 leading-tight">
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
