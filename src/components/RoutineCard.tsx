import React from 'react';
import { Edit, Copy, Calendar, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface RoutineCardProps {
  routine: {
    id: number;
    title: string;
    emoji: string;
    type: string;
    duration: string;
    gradient: string;
    weeklyPlan: Record<string, string>;
    notes?: string;
    createdAt: string;
    status?: 'not-started' | 'in-progress' | 'completed';
    currentDay?: number;
    routineType?: 'strength' | 'cardio' | 'hiit' | 'yoga' | 'flexibility';
  };
  onEdit: (routine: any) => void;
  onDuplicate: (routine: any) => void;
}

export function RoutineCard({ routine, onEdit, onDuplicate }: RoutineCardProps) {
  const navigate = useNavigate();
  
  const getActiveDays = () => {
    return Object.entries(routine.weeklyPlan).filter(([_, exercises]) => exercises.trim().length > 0);
  };

  const getWeeklyBreakdown = () => {
    const activeDays = getActiveDays();
    if (activeDays.length === 0) return 'No days planned';
    if (activeDays.length <= 3) {
      return activeDays.map(([day]) => day.slice(0, 3)).join(', ');
    }
    return `${activeDays.length} days/week`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  const getCurrentDayInfo = () => {
    const activeDays = getActiveDays();
    const currentDay = routine.currentDay || 1;
    
    if (activeDays.length === 0) return null;
    
    const dayIndex = (currentDay - 1) % activeDays.length;
    const [dayName, exercises] = activeDays[dayIndex];
    
    return {
      dayNumber: currentDay,
      dayName,
      exercises: exercises.length > 50 ? `${exercises.slice(0, 50)}...` : exercises
    };
  };

  const handleStartRoutine = () => {
    navigate(`/routine-execution?routineId=${routine.id}`);
  };

  const getRoutineTypeIcon = (type: string) => {
    switch (type) {
      case 'strength':
        return '🏋️';
      case 'cardio':
        return '🏃';
      case 'hiit':
        return '⚡';
      case 'yoga':
        return '🧘';
      case 'flexibility':
        return '🤸';
      default:
        return routine.emoji;
    }
  };

  const currentDayInfo = getCurrentDayInfo();

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 border-border bg-card mb-0 !mb-0">
      <CardContent className="p-0">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${routine.gradient} p-4 rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{routine.emoji}</span>
              <div>
                <h3 className="text-xl font-bold text-white drop-shadow-md">{routine.title}</h3>
                <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-white/30">
                  {routine.type}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => onEdit(routine)}
                className="h-8 w-8 bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => onDuplicate(routine)}
                className="h-8 w-8 bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status and Current Day */}
          <div className="flex items-center justify-between">
            <Badge className={`${getStatusColor(routine.status || 'not-started')} border-0`}>
              {getStatusText(routine.status || 'not-started')}
            </Badge>
            {currentDayInfo && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Day {currentDayInfo.dayNumber}:</span> {currentDayInfo.dayName}
              </div>
            )}
          </div>

          {/* Current Day's Workout Preview */}
          {currentDayInfo && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Today's Focus:</span> {currentDayInfo.exercises}
              </p>
            </div>
          )}

          {/* Weekly Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Weekly Plan</span>
            </div>
            
            <div className="space-y-2">
              {getActiveDays().length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {getActiveDays().slice(0, 3).map(([day, exercises]) => (
                    <div key={day} className="flex justify-between items-start text-sm">
                      <span className="font-medium text-foreground min-w-[60px]">{day.slice(0, 3)}:</span>
                      <span className="text-muted-foreground text-right flex-1 line-clamp-1">
                        {exercises.length > 40 ? `${exercises.slice(0, 40)}...` : exercises}
                      </span>
                    </div>
                  ))}
                  {getActiveDays().length > 3 && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      +{getActiveDays().length - 3} more days
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No workouts planned yet
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{routine.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{getActiveDays().length}/7 days</span>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartRoutine}
              className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
            >
              <Play className="h-3 w-3 mr-1" />
              Start Today's Session
            </Button>
          </div>

          {/* Notes Preview */}
          {routine.notes && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2 line-clamp-2">
              {routine.notes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}