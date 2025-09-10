import React, { useEffect, useState } from "react";
import { AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { FlaggedIngredient, IngredientAlertProps } from "@/types/ingredients";

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case "high":
      return "bg-destructive text-destructive-foreground";
    case "moderate":
      return "bg-yellow-500 text-white";
    case "low":
      return "bg-yellow-300 text-yellow-800";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "harmful":
      return "☠️";
    case "allergen":
      return "🚨";
    case "gmo":
      return "🧬";
    case "hormone":
      return "💊";
    case "environmental":
      return "🌍";
    case "seed_oil":
      return "🛢️";
    default:
      return "⚠️";
  }
};

export function IngredientAlert({ 
  flaggedIngredients, 
  onDismiss, 
  autoHideDuration = 7000 
}: IngredientAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (flaggedIngredients.length > 0) {
      // Show animation
      setIsVisible(true);
      
      // Auto-hide timer
      const hideTimer = setTimeout(() => {
        handleDismiss();
      }, autoHideDuration);

      // Progress bar animation
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const decrement = 100 / (autoHideDuration / 100);
          return Math.max(0, prev - decrement);
        });
      }, 100);

      return () => {
        clearTimeout(hideTimer);
        clearInterval(progressInterval);
      };
    }
  }, [flaggedIngredients, autoHideDuration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
      setProgress(100);
    }, 300);
  };

  if (flaggedIngredients.length === 0) return null;

  const highSeverityCount = flaggedIngredients.filter(
    (ing) => ing.severity.toLowerCase() === "high"
  ).length;

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-50 transition-all duration-300 ease-out ${
        isVisible 
          ? "transform translate-y-0 opacity-100" 
          : "transform -translate-y-full opacity-0"
      }`}
    >
      <Card className="modern-action-card border-2 border-destructive/30 shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-muted/20 overflow-hidden">
          <div 
            className="h-full bg-destructive transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  ⚠️ Flagged Ingredients Detected
                  {highSeverityCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {highSeverityCount} High Risk
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Found {flaggedIngredients.length} concerning ingredient{flaggedIngredients.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0 hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Summary */}
          <div className="flex flex-wrap gap-2 mb-3">
            {flaggedIngredients.slice(0, 3).map((ingredient, index) => (
              <Badge 
                key={index}
                className={`${getSeverityColor(ingredient.severity)} text-xs`}
              >
                {getCategoryIcon(ingredient.category)} {ingredient.name}
              </Badge>
            ))}
            {flaggedIngredients.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{flaggedIngredients.length - 3} more
              </Badge>
            )}
          </div>

          {/* Expanded Details */}
          <div className={`transition-all duration-300 ease-out overflow-hidden ${
            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}>
            <div className="space-y-3 pt-2 border-t border-border/50">
              {flaggedIngredients.map((ingredient, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="text-lg">{getCategoryIcon(ingredient.category)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{ingredient.name}</h4>
                      <Badge 
                        className={`${getSeverityColor(ingredient.severity)} text-xs`}
                      >
                        {ingredient.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-destructive dark:text-muted-foreground mb-1 capitalize">
                      📂 {ingredient.category.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-destructive dark:text-foreground/80 leading-relaxed">
                      {ingredient.description}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => {
                    // TODO: Implement detailed modal or navigation
                    console.log("See details clicked");
                  }}
                >
                  See Detailed Information
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default IngredientAlert;