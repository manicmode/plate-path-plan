import React, { useState, useRef, useEffect } from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Clock, Flame, Activity, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useSound } from '@/hooks/useSound';
import { useToast } from '@/hooks/use-toast';

export interface ExerciseData {
  type: string;
  duration: number;
  intensity: 'low' | 'moderate' | 'high';
  caloriesBurned: number;
}

interface ExerciseConfirmationCardProps {
  exercise: ExerciseData;
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

const EXERCISE_EMOJIS: Record<string, string> = {
  'running': '🏃',
  'cycling': '🚴',
  'swimming': '🏊',
  'walking': '🚶',
  'weightlifting': '🏋️',
  'yoga': '🧘',
  'pilates': '🤸',
  'hiit': '⚡',
  'dancing': '💃',
  'basketball': '🏀',
  'tennis': '🎾',
  'other': '💪'
};

const INTENSITY_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

const INTENSITY_MULTIPLIERS = {
  low: 0.7,
  moderate: 1.0,
  high: 1.3
};

export const ExerciseConfirmationCard = ({ 
  exercise, 
  isOpen, 
  onClose, 
  onConfirm 
}: ExerciseConfirmationCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playProgressUpdate } = useSound();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [duration, setDuration] = useState(exercise.duration);
  const [intensity, setIntensity] = useState<'low' | 'moderate' | 'high'>(exercise.intensity);
  const [isLogging, setIsLogging] = useState(false);

  // Calculate adjusted calories based on duration and intensity
  const adjustedCalories = Math.round(
    (exercise.caloriesBurned / exercise.duration) * duration * INTENSITY_MULTIPLIERS[intensity]
  );

  // Get exercise emoji
  const exerciseEmoji = EXERCISE_EMOJIS[exercise.type.toLowerCase()] || EXERCISE_EMOJIS.other;

  // Format exercise name
  const exerciseName = exercise.type.split(/[_-]/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  const handleConfirmLog = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to track exercises",
        variant: "destructive"
      });
      return;
    }

    setIsLogging(true);
    try {
      const { error } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: user.id,
          activity_type: exercise.type,
          duration_minutes: duration,
          intensity_level: intensity,
          calories_burned: adjustedCalories,
        });

      if (error) {
        console.error('Error logging exercise:', error);
        toast({
          title: "Error logging exercise",
          description: "Please try again",
          variant: "destructive"
        });
        return;
      }

      // Play success sound
      playProgressUpdate();
      
      toast({
        title: "Exercise logged! 🔥",
        description: `${duration} minutes of ${exerciseName} - ${adjustedCalories} calories burned`,
      });

      onConfirm?.();
      onClose();
    } catch (error) {
      console.error('Error logging exercise:', error);
      toast({
        title: "Error",
        description: "Failed to log exercise. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLogging(false);
    }
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-2xl z-50 flex items-center justify-center p-4"
         style={{
           top: 'calc(-1 * env(safe-area-inset-top))',
           bottom: 'calc(-1 * env(safe-area-inset-bottom))',
           left: 'calc(-1 * env(safe-area-inset-left))',
           right: 'calc(-1 * env(safe-area-inset-right))',
           paddingTop: `calc(env(safe-area-inset-top) + 1rem)`,
           paddingBottom: `calc(env(safe-area-inset-bottom) + 1rem)`,
           paddingLeft: `calc(env(safe-area-inset-left) + 1rem)`,
           paddingRight: `calc(env(safe-area-inset-right) + 1rem)`,
         }}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md"
        >
          <Card ref={cardRef} className="shadow-2xl border-border bg-card">
            <VisuallyHidden>
              <h2>Confirm Exercise Log</h2>
              <p>Review and confirm your exercise details before logging.</p>
            </VisuallyHidden>
            <CardContent className="p-0">
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{exerciseEmoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{exerciseName}</h3>
                      <Badge className={INTENSITY_COLORS[intensity]}>
                        {intensity.charAt(0).toUpperCase() + intensity.slice(1)} Intensity
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Duration Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Duration</span>
                    <span className="text-sm font-bold text-foreground">{duration} min</span>
                  </div>
                  <Slider
                    value={[duration]}
                    onValueChange={([value]) => setDuration(value)}
                    max={180}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Intensity Selection */}
                <div className="space-y-3 mt-4">
                  <span className="text-sm font-medium text-muted-foreground">Intensity Level</span>
                  <div className="flex gap-2">
                    {(['low', 'moderate', 'high'] as const).map((level) => (
                      <Button
                        key={level}
                        variant={intensity === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIntensity(level)}
                        className="flex-1"
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Stats Preview */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-sm font-medium text-foreground">{duration} min</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <Flame className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-sm font-medium text-foreground">{adjustedCalories}</div>
                    <div className="text-xs text-muted-foreground">Calories</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tabs */}
              <div className="p-6 pt-4">
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="benefits">Benefits</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="summary" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Activity Type</span>
                        <span className="text-sm font-medium text-foreground">{exerciseName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="text-sm font-medium text-foreground">{duration} minutes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Intensity</span>
                        <Badge className={INTENSITY_COLORS[intensity]} variant="secondary">
                          {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Calories Burned</span>
                        <span className="text-sm font-medium text-foreground">{adjustedCalories} kcal</span>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="benefits" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-foreground">Improves cardiovascular health</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-foreground">Boosts energy levels</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-foreground">Burns calories effectively</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="p-6 pt-4">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={isLogging}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmLog}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={isLogging}
                    aria-busy={isLogging}
                    style={isLogging ? { pointerEvents: 'none' } : {}}
                  >
                    {isLogging ? 'Logging...' : 'Log Exercise'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};