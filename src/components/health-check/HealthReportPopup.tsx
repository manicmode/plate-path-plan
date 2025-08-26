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
          className="text-border"
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
    if (score >= 8) return { label: 'Healthy', icon: '✅', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/30' };
    if (score >= 4) return { label: 'Caution', icon: '⚠️', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' };
    return { label: 'Avoid', icon: '❌', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/30' };
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
            className="absolute top-0 right-0 p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-foreground hover:text-primary" />
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
            <div className="text-sm text-foreground font-medium mb-6">Health Score</div>
            
            {/* Star Rating */}
            <div className="flex justify-center space-x-1 mb-6">
              {[...Array(5)].map((_, i) => (
                  <Star 
                  key={i} 
                  className={`w-7 h-7 transition-all duration-200 ${
                    i < starCount 
                      ? 'text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400 drop-shadow-lg' 
                      : 'text-foreground/40'
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
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
              Flagged Ingredients
              {result.ingredientFlags.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {result.ingredientFlags.length} warning{result.ingredientFlags.length > 1 ? 's' : ''}
                </Badge>
              )}
            </h3>
          </CardHeader>
          <CardContent>
            {result.ingredientFlags.length > 0 ? (
              <div className="space-y-4">
                {/* Warning Summary */}
                <div className="p-4 bg-destructive/10 border-l-4 border-destructive rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
                    <p className="text-destructive-foreground font-semibold">
                      This product contains {result.ingredientFlags.length} ingredient{result.ingredientFlags.length > 1 ? 's' : ''} 
                      that may not align with your health profile.
                    </p>
                  </div>
                </div>

                {/* Detailed Flagged Ingredients */}
                <div className="space-y-3">
                  {result.ingredientFlags.map((flag, index) => {
                    const getSeverityColor = (severity: string) => {
                      switch (severity.toLowerCase()) {
                        case 'high': return { bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive-foreground', icon: 'text-destructive' };
                        case 'medium': return { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', icon: 'text-orange-500' };
                        default: return { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', icon: 'text-yellow-500' };
                      }
                    };

                    const colors = getSeverityColor(flag.severity);
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border ${colors.bg}`}
                      >
                        <div className="flex items-start space-x-3">
                          <XCircle className={`w-5 h-5 ${colors.icon} mt-0.5 flex-shrink-0`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`font-bold ${colors.text} capitalize`}>
                                {flag.ingredient || flag.flag}
                              </h4>
                              <Badge 
                                variant={flag.severity === 'high' ? 'destructive' : flag.severity === 'medium' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {flag.severity} risk
                              </Badge>
                            </div>
                            <p className={`${colors.text} text-sm leading-relaxed`}>
                              {flag.reason || flag.flag || `This ingredient may be concerning based on your health conditions.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Health Condition Context */}
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-primary-foreground text-sm">
                    💡 <strong>Note:</strong> These warnings are personalized based on your health profile. 
                    Consult with your healthcare provider for specific dietary guidance.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-primary" />
                <div>
                  <span className="text-primary-foreground font-medium">No concerning ingredients detected for your health profile!</span>
                  <p className="text-primary-foreground text-sm mt-1">This product appears to be safe based on your health conditions.</p>
                </div>
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
                    <div key={key} className="text-center p-4 bg-accent/20 border border-accent/30 rounded-xl">
                      <div className="text-3xl font-bold text-foreground mb-1">
                        {typeof value === 'number' ? value : value}
                      </div>
                      <div className="text-sm text-foreground font-medium mb-1">{unit}</div>
                      <div className="text-xs text-foreground font-semibold uppercase tracking-wide">{displayKey}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-foreground font-medium">
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
            <div className="p-4 bg-muted/50 border border-border rounded-lg">
              <p className="text-foreground leading-relaxed">
                <span className="font-semibold">Ingredients: </span>
                {/* Now using full ingredient list from legacy adapter instead of additives only */}
                  <span className="text-foreground">
                    {result.ingredientsText || 'Ingredient list not available from scan data'}
                  </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 💬 5. AI COACH COMMENTARY */}
        <Card className="bg-card border-border backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <Zap className="w-6 h-6 text-primary mr-3" />
              AI Coach Insights
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Personalized Warnings */}
              {result.personalizedWarnings.length > 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-destructive-foreground mb-2">Health Warnings</h4>
                      <ul className="space-y-1">
                        {result.personalizedWarnings.map((warning, index) => (
                          <li key={index} className="text-destructive-foreground">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-primary-foreground mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {result.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-foreground">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enhanced Default commentary */}
              {result.personalizedWarnings.length === 0 && result.suggestions.length === 0 && (
                <div className="p-4 bg-muted border border-border rounded-lg">
                  <div className="space-y-3">
                    {result.healthScore >= 8 ? (
                      <>
                        <p className="text-foreground font-medium">
                          "This is a great option if you're avoiding added sugars and processed ingredients."
                        </p>
                        <p className="text-foreground">
                          "Keep up the excellent work with mindful food choices - your body will thank you!"
                        </p>
                      </>
                    ) : result.healthScore >= 4 ? (
                      <>
                        <p className="text-foreground font-medium">
                          "This product is okay in moderation, but consider alternatives with cleaner ingredients."
                        </p>
                        <p className="text-foreground">
                          "Some users prefer products without artificial additives for optimal health benefits."
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-foreground font-medium">
                          "Consider avoiding this product regularly - it contains several concerning ingredients."
                        </p>
                        <p className="text-foreground">
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
            className="bg-primary hover:bg-primary/90 text-primary-foreground py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-xl mr-2">💾</span>
            Save
          </Button>
          
          <Button
            onClick={() => {/* Handle flag item */}}
            variant="outline"
            className="border-2 border-destructive/50 text-destructive hover:bg-destructive/10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Flag className="w-5 h-5 mr-2" />
            Flag Item
          </Button>
          
          <Button
            onClick={onScanAnother}
            variant="outline"
            className="border-2 border-primary/50 text-primary hover:bg-primary/10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Scan Another
          </Button>

          <Button
            onClick={onClose}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground py-4 px-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};