import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Save,
  Flag,
  RotateCcw,
  Star,
  ShieldCheck,
  Zap,
  X
} from 'lucide-react';
import { HealthAnalysisResult } from './HealthCheckModal';

// Circular Progress Component with Animation
const CircularProgress: React.FC<{ 
  percentage: number; 
  size?: number; 
  strokeWidth?: number;
}> = ({ percentage, size = 120, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Color based on percentage ranges
  const getColor = (pct: number) => {
    if (pct >= 80) return '#10B981'; // Green
    if (pct >= 40) return '#F59E0B'; // Yellow  
    return '#EF4444'; // Red
  };

  const color = getColor(percentage);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        {/* Progress circle with animation */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out animate-pulse"
          style={{
            filter: `drop-shadow(0 0 8px ${color}60)`
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{percentage}%</span>
      </div>
    </div>
  );
};

interface HealthReportPopupProps {
  result: HealthAnalysisResult;
  onScanAnother: () => void;
  onClose: () => void;
}

export const HealthReportPopup: React.FC<HealthReportPopupProps> = ({
  result,
  onScanAnother,
  onClose
}) => {
  
  // Helper functions for score-based ratings
  const getScoreLabel = (score: number) => {
    if (score >= 8) return { label: 'Healthy', icon: '✅', color: 'text-green-500', bgColor: 'bg-green-50 border-green-200' };
    if (score >= 4) return { label: 'Caution', icon: '⚠️', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' };
    return { label: 'Avoid', icon: '❌', color: 'text-red-500', bgColor: 'bg-red-50 border-red-200' };
  };

  const getScoreMessage = (score: number) => {
    if (score >= 8) return 'Looking good! Healthy choice.';
    if (score >= 4) return 'Some concerns to keep in mind.';
    return 'We recommend avoiding this product.';
  };

  const getStarRating = (score: number) => {
    return Math.round((score / 10) * 5);
  };

  const hasValidNutrition = (nutrition: any): boolean => {
    return nutrition && 
           typeof nutrition === 'object' && 
           !Array.isArray(nutrition) &&
           Object.keys(nutrition).length > 0 &&
           Object.values(nutrition).some(value => value !== null && value !== undefined);
  };

  const scoreLabel = getScoreLabel(result.healthScore);
  const starCount = getStarRating(result.healthScore);

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* 🧬 Health Report Title */}
        <div className="relative text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center">
            <span className="text-4xl mr-3">🧬</span>
            Health Report
          </h1>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-0 right-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* 🔬 1. TOP SECTION — Summary Card */}
        <Card className={`${scoreLabel.bgColor} border-2 backdrop-blur-sm transition-all duration-300 shadow-xl`}>
          <CardContent className="p-8 text-center">
            {/* Product Name */}
            <h1 className="text-2xl font-bold text-foreground mb-6">{result.itemName}</h1>
            
            {/* Health Score Circular Progress */}
            <div className="mb-4">
              <CircularProgress percentage={result.healthScore * 10} size={140} strokeWidth={10} />
            </div>
            <div className="text-sm text-muted-foreground mb-6">Health Score</div>
            
            {/* Star Rating */}
            <div className="flex justify-center space-x-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-7 h-7 transition-all duration-200 ${
                    i < starCount 
                      ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
            </div>
            
            {/* Large Status Label */}
            <div className={`inline-flex items-center space-x-3 px-8 py-4 rounded-2xl ${scoreLabel.bgColor} border-2 mb-6 shadow-lg`}>
              <span className="text-3xl">{scoreLabel.icon}</span>
              <span className={`text-2xl font-bold ${scoreLabel.color}`}>{scoreLabel.label}</span>
            </div>
            
            {/* Friendly Message */}
            <p className={`text-lg ${scoreLabel.color} font-medium leading-relaxed`}>
              {getScoreMessage(result.healthScore)}
            </p>
          </CardContent>
        </Card>

        {/* 🚩 2. FLAGGED INGREDIENTS SECTION */}
        <Card className="bg-card border-border backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <AlertTriangle className="w-6 h-6 text-orange-500 mr-3" />
              Flagged Ingredients
            </h3>
          </CardHeader>
          <CardContent>
            {result.ingredientFlags.length > 0 ? (
              <div className="space-y-3">
                {result.ingredientFlags.map((flag, index) => {
                  const isLowSeverity = flag.severity.toLowerCase() === 'low';
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center space-x-3 p-3 rounded-lg ${
                        isLowSeverity 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      {isLowSeverity ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className={`font-semibold ${isLowSeverity ? 'text-green-800' : 'text-red-800'}`}>
                          {flag.flag}: 
                        </span>
                        <span className={`${isLowSeverity ? 'text-green-700' : 'text-red-700'}`}>
                          {flag.ingredient}
                        </span>
                      </div>
                      <Badge 
                        variant={isLowSeverity ? "secondary" : "destructive"} 
                        className="text-xs"
                      >
                        {flag.severity}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-green-800 font-medium">No harmful ingredients detected. Great choice!</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 📊 3. NUTRITION FACTS */}
        <Card className="bg-card border-border backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <div className="text-2xl mr-3">📊</div>
              NUTRITION FACTS
            </h3>
          </CardHeader>
          <CardContent>
            {hasValidNutrition(result.nutritionData) ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(result.nutritionData).map(([key, value]) => {
                  if (value === undefined || value === null || value === 0) return null;
                  
                  const getUnit = (nutrientKey: string) => {
                    if (nutrientKey === 'calories') return '';
                    if (nutrientKey === 'sodium') return 'g';
                    return 'g';
                  };
                  
                  const getDisplayKey = (nutrientKey: string) => {
                    if (nutrientKey === 'carbs') return 'Carbs';
                    return nutrientKey.charAt(0).toUpperCase() + nutrientKey.slice(1);
                  };
                  
                  const unit = getUnit(key);
                  const displayKey = getDisplayKey(key);
                  
                  return (
                    <div key={key} className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                      <div className="text-3xl font-bold text-blue-800 mb-1">
                        {typeof value === 'number' ? value : value}
                      </div>
                      <div className="text-sm text-blue-600 font-medium mb-1">{unit}</div>
                      <div className="text-xs text-blue-700 font-semibold uppercase tracking-wide">{displayKey}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Nutrition facts not available from scan data
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🧪 4. INGREDIENT LIST */}
        <Card className="bg-card border-border backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <div className="text-2xl mr-3">🧪</div>
              Ingredient List
            </h3>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-800 leading-relaxed">
                <span className="font-semibold">Ingredients: </span>
                {/* This would come from the API - for now showing a placeholder */}
                <span className="text-gray-700">
                  {result.healthProfile.additives && result.healthProfile.additives.length > 0 
                    ? result.healthProfile.additives.join(', ')
                    : 'Ingredient list not available from scan data'
                  }
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 💬 5. AI COACH COMMENTARY */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h3 className="text-xl font-bold text-purple-800 flex items-center">
              <Zap className="w-6 h-6 text-purple-600 mr-3" />
              AI Coach Insights
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Personalized Warnings */}
              {result.personalizedWarnings.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-800 mb-2">Health Warnings</h4>
                      <ul className="space-y-1">
                        {result.personalizedWarnings.map((warning, index) => (
                          <li key={index} className="text-red-700">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {result.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-blue-700">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enhanced Default commentary */}
              {result.personalizedWarnings.length === 0 && result.suggestions.length === 0 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="space-y-3">
                    {result.healthScore >= 8 ? (
                      <>
                        <p className="text-purple-800 font-medium">
                          "This is a great option if you're avoiding added sugars and processed ingredients."
                        </p>
                        <p className="text-purple-700">
                          "Keep up the excellent work with mindful food choices - your body will thank you!"
                        </p>
                      </>
                    ) : result.healthScore >= 4 ? (
                      <>
                        <p className="text-purple-800 font-medium">
                          "This product is okay in moderation, but consider alternatives with cleaner ingredients."
                        </p>
                        <p className="text-purple-700">
                          "Some users prefer products without artificial additives for optimal health benefits."
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-purple-800 font-medium">
                          "Consider avoiding this product regularly - it contains several concerning ingredients."
                        </p>
                        <p className="text-purple-700">
                          "Look for simpler alternatives with whole food ingredients and fewer additives."
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
          <Button
            onClick={() => {/* Handle save to log */}}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-xl mr-2">💾</span>
            Save
          </Button>
          
          <Button
            onClick={() => {/* Handle flag item */}}
            variant="outline"
            className="border-2 border-red-400 text-red-600 hover:bg-red-50 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Flag className="w-5 h-5 mr-2" />
            Flag Item
          </Button>
          
          <Button
            onClick={onScanAnother}
            variant="outline"
            className="border-2 border-blue-400 text-blue-600 hover:bg-blue-50 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Scan Another
          </Button>

          <Button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white py-4 px-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};