
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Mic, Edit, Clock, ScanLine, Save, Droplets, Pill, Upload } from 'lucide-react';
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

  // Define the 8 logging options - top row (primary) and bottom row (secondary)
  const topRowOptions = [
    {
      id: 'photo',
      title: 'Upload Photo',
      icon: Upload,
      onClick: handlePhotoCapture,
    },
    {
      id: 'voice',
      title: 'Speak to Log',
      icon: Mic,
      onClick: handleVoiceLog,
    },
    {
      id: 'manual',
      title: 'Manual Entry',
      icon: Edit,
      onClick: handleManualEntry,
    },
    {
      id: 'barcode',
      title: 'Scan Barcode',
      icon: ScanLine,
      onClick: handleBarcodeScan,
    },
  ];

  const bottomRowOptions = [
    {
      id: 'saved',
      title: 'Saved Logs',
      icon: Save,
      onClick: handleSaved,
    },
    {
      id: 'recent',
      title: 'Recent Logs',
      icon: Clock,
      onClick: handleRecent,
    },
    {
      id: 'hydration',
      title: 'Hydration Log',
      icon: Droplets,
      onClick: handleHydration,
    },
    {
      id: 'supplements',
      title: 'Supplement Log',
      icon: Pill,
      onClick: handleSupplements,
    },
  ];

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              {analysisType === 'photo' ? (
                <Camera className="h-10 w-10 text-white" />
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-4 border-teal-200 border-t-teal-500 animate-spin"></div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-white">
              Analyzing your food...
            </h3>
            <p className="text-gray-300">
              {analysisType === 'photo' ? 'Processing image' : 'Processing audio'}
            </p>
            <div className="text-sm text-teal-400 font-medium">
              ~3 seconds left
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleUnrecognizedInput}
            className="mt-6 border-teal-400 text-teal-400 hover:bg-teal-500/10"
          >
            Having trouble? Enter manually
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 pt-6">
          <h1 className="text-3xl font-bold text-white">
            Log Your Food
          </h1>
          <p className="text-slate-400">
            Choose how you'd like to log today
          </p>
        </div>

        {/* Main Container - Gray Background */}
        <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl">
          {/* Top Row - Primary Actions (Larger) */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {topRowOptions.map((option) => {
              const Icon = option.icon;
              
              return (
                <div
                  key={option.id}
                  className="group cursor-pointer bg-slate-700/50 hover:bg-slate-600/50 rounded-2xl p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  onClick={option.onClick}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-200">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white leading-tight">
                      {option.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Row - Secondary Actions (Slightly Smaller) */}
          <div className="grid grid-cols-4 gap-4">
            {bottomRowOptions.map((option) => {
              const Icon = option.icon;
              
              return (
                <div
                  key={option.id}
                  className="group cursor-pointer bg-slate-700/50 hover:bg-slate-600/50 rounded-2xl p-3 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  onClick={option.onClick}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-200">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-white leading-tight">
                      {option.title}
                    </span>
                  </div>
                </div>
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
