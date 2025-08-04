import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, RefreshCw, Brain, TrendingUp, HelpCircle, Star } from 'lucide-react';
import { useMoodPrediction } from '@/hooks/useMoodPrediction';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export const MoodForecastCard = () => {
  const isMobile = useIsMobile();
  const { prediction, loading, generating, generatePrediction, ratePrediction } = useMoodPrediction();
  const [showWhyDialog, setShowWhyDialog] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);

  const handleGeneratePrediction = async () => {
    try {
      await generatePrediction(true);
      toast.success('Tomorrow\'s forecast updated!');
    } catch (error) {
      toast.error('Failed to generate forecast. Please try again.');
    }
  };

  const handleRating = async (rating: number) => {
    if (!prediction) return;
    
    try {
      setUserRating(rating);
      await ratePrediction(prediction.id, rating);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to save rating. Please try again.');
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'low': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getMoodEnergyBars = (mood: number, energy: number) => (
    <div className="flex items-center space-x-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600 dark:text-gray-400`}>
            Mood
          </span>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-gray-900 dark:text-white`}>
            {mood}/10
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(mood / 10) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600 dark:text-gray-400`}>
            Energy
          </span>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-gray-900 dark:text-white`}>
            {energy}/10
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(energy / 10) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="border-0 rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 shadow-lg">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card className="border-0 rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 hover:shadow-lg transition-all duration-300">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="text-center space-y-4">
            <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} gradient-primary rounded-full flex items-center justify-center mx-auto`}>
              <Brain className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
            </div>
            <div>
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white mb-2`}>
                Tomorrow's Forecast
              </h3>
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300 mb-4`}>
                Get AI predictions for your mood and energy based on your wellness patterns
              </p>
              <Button
                onClick={handleGeneratePrediction}
                disabled={generating}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Forecast
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 hover:shadow-lg transition-all duration-300">
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{prediction.emoji}</div>
            <div>
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                Tomorrow's Forecast
              </h3>
              <div className="flex items-center space-x-2">
                <Badge className={`text-xs ${getConfidenceColor(prediction.confidence)}`}>
                  {prediction.confidence} confidence
                </Badge>
                <TrendingUp className="h-3 w-3 text-gray-500" />
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGeneratePrediction}
            disabled={generating}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Prediction Message */}
        <div className="mb-4">
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 leading-relaxed`}>
            {prediction.message}
          </p>
        </div>

        {/* Mood & Energy Bars */}
        <div className="mb-4">
          {getMoodEnergyBars(prediction.predicted_mood, prediction.predicted_energy)}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dialog open={showWhyDialog} onOpenChange={setShowWhyDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <HelpCircle className="h-3 w-3 mr-1" />
                  Why?
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <span>Prediction Analysis</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Key Contributing Factors:</h4>
                    <div className="space-y-2">
                      {prediction.factors.map((factor, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <div className="w-2 h-2 bg-purple-500 rounded-full" />
                          <span className="capitalize">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      This prediction is based on analysis of your recent mood logs, nutrition patterns, 
                      hydration habits, supplement intake, and trigger tags from the past 7-10 days.
                    </p>
                  </div>
                  <div className="text-center">
                    <Badge className={`${getConfidenceColor(prediction.confidence)}`}>
                      {prediction.confidence} confidence prediction
                    </Badge>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* User Rating */}
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Rate accuracy:</span>
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRating(rating)}
                  className="hover:scale-110 transition-transform"
                >
                  <Star 
                    className={`h-3 w-3 ${
                      userRating && rating <= userRating 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};