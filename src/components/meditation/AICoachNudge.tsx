import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, X, Play } from "lucide-react";
import { useMeditationNudges } from '@/hooks/useMeditationNudges';
import { useNavigate } from 'react-router-dom';

interface AICoachNudgeProps {
  onDismiss?: () => void;
}

export const AICoachNudge: React.FC<AICoachNudgeProps> = ({ onDismiss }) => {
  const navigate = useNavigate();
  const { checkAICoachNudge, logNudgeInteraction } = useMeditationNudges();
  const [nudgeData, setNudgeData] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkForNudge = async () => {
      const result = await checkAICoachNudge();
      if (result.shouldShow) {
        setNudgeData(result);
        setIsVisible(true);
      }
    };

    checkForNudge();
  }, [checkAICoachNudge]);

  const handleAccept = async () => {
    if (nudgeData) {
      await logNudgeInteraction(
        'ai_coach',
        nudgeData.reason,
        'accepted',
        nudgeData.message
      );
    }
    
    setIsVisible(false);
    onDismiss?.();
    
    // Navigate to guided meditation
    navigate('/guided-meditation');
  };

  const handleDismiss = async () => {
    if (nudgeData) {
      await logNudgeInteraction(
        'ai_coach',
        nudgeData.reason,
        'dismissed',
        nudgeData.message
      );
    }
    
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || !nudgeData) {
    return null;
  }

  return (
    <Card className="mb-6 !mb-0 border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5 animate-fade-in">
      <CardContent className="!p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  🤖 AI Coach
                </h4>
                <p className="text-sm text-muted-foreground">
                  {nudgeData.message}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground mb-2 p-2 bg-background/50 rounded">
                <strong>Debug:</strong> Reason: {nudgeData.reason} | 
                Exercise: {nudgeData.conditions.hasIntenseExercise ? 'Yes' : 'No'} | 
                Low Mood: {nudgeData.conditions.hasLowMood ? 'Yes' : 'No'} | 
                Days Since Meditation: {nudgeData.conditions.daysSinceLastMeditation}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleAccept}
                size="sm"
                className="gap-2"
              >
                <Play className="h-3 w-3" />
                Let's Meditate
              </Button>
              <Button 
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};