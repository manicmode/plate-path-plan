import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Brain, TrendingUp } from 'lucide-react';
import { useMoodPrediction } from '@/hooks/useMoodPrediction';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export const MoodForecastCard = () => {
  const isMobile = useIsMobile();
  const { prediction, loading, generating, generatePrediction } = useMoodPrediction();

  const handleGeneratePrediction = async () => {
    try {
      await generatePrediction(true);
      toast.success('Tomorrow\'s forecast updated!');
    } catch (error) {
      toast.error('Failed to generate forecast. Please try again.');
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
      <Card className="border-0 rounded-3xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
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
      <Card className="border-0 rounded-3xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 hover:shadow-lg transition-all duration-300">
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
    <Card className="border-0 rounded-3xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 hover:shadow-lg transition-all duration-300">
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

        {/* Factors */}
        {prediction.factors && prediction.factors.length > 0 && (
          <div className="space-y-2">
            <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider`}>
              Key Factors
            </h4>
            <div className="flex flex-wrap gap-2">
              {prediction.factors.slice(0, 3).map((factor, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300"
                >
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};