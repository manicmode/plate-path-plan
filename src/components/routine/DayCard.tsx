import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, RotateCcw } from 'lucide-react';

interface WorkoutDay {
  day: number;
  dayName: string;
  workout?: {
    title: string;
    muscleGroups: string[];
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      rest: string;
      notes?: string;
    }>;
    duration: number;
    difficulty: string;
  };
  isRestDay: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  adaptation?: {
    type: string;
    badge: string;
    tip: string;
  };
}

interface DayCardProps {
  day: WorkoutDay;
  week: number;
  onClick: () => void;
  onMarkComplete: (day: WorkoutDay) => void;
}

export const DayCard = ({ day, week, onClick, onMarkComplete }: DayCardProps) => {
  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkComplete(day);
  };

  if (day.isRestDay) {
    return (
      <Card className="h-32 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-3 h-full flex flex-col items-center justify-center text-center">
          <div className="text-2xl mb-1">🧘</div>
          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Rest Day</p>
          <p className="text-xs text-purple-600 dark:text-purple-400">{day.dayName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`h-32 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
        day.isCompleted 
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' 
          : 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{day.dayName}</p>
            {day.workout && (
              <h4 className="text-sm font-semibold text-foreground truncate">
                {day.workout.title}
              </h4>
            )}
          </div>
          
          {/* Status Icons */}
          <div className="flex gap-1 ml-1">
            {day.isLocked && (
              <div className="p-1 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Lock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
              </div>
            )}
            {day.isCompleted && (
              <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
              </div>
            )}
          </div>
        </div>

        {/* Adaptation Badge */}
        {day.adaptation && (
          <div className="mb-2">
            <div className="px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded text-xs font-medium text-center">
              {day.adaptation.badge}
            </div>
          </div>
        )}

        {/* Muscle Groups */}
        {day.workout && (
          <div className="flex-1 mb-2">
            <div className="flex flex-wrap gap-1">
              {day.workout.muscleGroups.slice(0, 2).map((muscle, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs px-1 py-0 h-4"
                >
                  {muscle}
                </Badge>
              ))}
              {day.workout.muscleGroups.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                  +{day.workout.muscleGroups.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {day.workout && (
          <div className="flex justify-between items-center">
            <Button
              size="sm"
              variant={day.isCompleted ? "default" : "outline"}
              onClick={handleMarkComplete}
              className={`h-6 px-2 text-xs ${
                day.isCompleted 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
              }`}
            >
              <Check className="h-3 w-3 mr-1" />
              {day.isCompleted ? 'Done' : 'Mark'}
            </Button>
            
            {day.workout.duration && (
              <span className="text-xs text-muted-foreground">
                {day.workout.duration}min
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};