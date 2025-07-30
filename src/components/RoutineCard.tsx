import React, { useState } from 'react';
import { Edit, Share, Calendar, Clock, Play, History, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { RoutineHistoryModal } from '@/components/routine/RoutineHistoryModal';
import { WorkoutCompleteButton } from '@/components/workout/WorkoutCompleteButton';
import { shareRoutine, type ShareableRoutine } from '@/utils/shareUtils';
import { toast } from 'sonner';

interface RoutineCardProps {
  routine: {
    id: string | number;
    title: string;
    emoji: string;
    type: string;
    duration: string;
    gradient: string;
    weeklyPlan: Record<string, string> | any;
    notes?: string;
    createdAt: string;
    status?: 'not-started' | 'in-progress' | 'completed';
    currentDay?: number;
    routineType?: string;
    source?: 'custom' | 'ai-generated' | 'ai-legacy' | 'mock';
    canDelete?: boolean;
    isActive?: boolean;
    daysPerWeek?: number;
  };
  onEdit: (routine: any) => void;
  onDuplicate: (routine: any) => void;
  onDelete?: (routine: any) => void;
}

const handleShareRoutine = async (routine: any) => {
  try {
    const shareableRoutine: ShareableRoutine = {
      id: routine.id.toString(),
      name: routine.title,
      goal: routine.routineType || 'general_fitness',
      splitType: routine.type,
      daysPerWeek: routine.daysPerWeek || 3,
      duration: parseInt(routine.duration.match(/\d+/)?.[0] || '45')
    };

    const wasNativeShare = await shareRoutine(shareableRoutine);
    
    if (wasNativeShare) {
      toast.success('Routine shared successfully! 🚀');
    } else {
      toast.success('Share link copied to clipboard! 📋');
    }
  } catch (error) {
    console.error('Error sharing routine:', error);
    toast.error('Failed to share routine');
  }
};

export function RoutineCard({ routine, onEdit, onDuplicate, onDelete }: RoutineCardProps) {
  const navigate = useNavigate();
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleDeleteRoutine = () => {
    if (!window.confirm('Are you sure you want to delete this routine? This action cannot be undone.')) {
      return;
    }
    
    if (onDelete) {
      onDelete(routine);
      toast.success('Routine deleted successfully');
    }
  };
  
  const getActiveDays = () => {
    if (!routine.weeklyPlan || typeof routine.weeklyPlan !== 'object') return [];
    return Object.entries(routine.weeklyPlan).filter(([_, exercises]) => 
      exercises && typeof exercises === 'string' && exercises.trim().length > 0
    );
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
      exercises: typeof exercises === 'string' && exercises.length > 50 
        ? `${exercises.slice(0, 50)}...` 
        : String(exercises || '')
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
    <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 border-border bg-card mb-0 !mb-0 w-full max-w-lg shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden min-h-[460px]">
      <CardContent className="p-0 relative h-full">
        {/* Gradient Header with more breathing room */}
        <div className={`bg-gradient-to-r ${routine.gradient} p-6 rounded-t-2xl`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <span className="text-4xl drop-shadow-md">{routine.emoji}</span>
              <div>
                <h3 className="text-xl font-bold text-white drop-shadow-md mb-2">{routine.title}</h3>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {routine.type}
                </Badge>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                size="icon"
                variant="secondary"
                disabled
                className="h-7 w-7 bg-white/20 border-white/30 text-white/50 cursor-not-allowed"
                title="👉 Coming soon: Track past workouts, progress, and milestones."
              >
                <History className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const activeDays = getActiveDays();
                  if (activeDays.length === 0) {
                    toast.error('👉 This routine has no generated content yet. Create some workouts first.');
                    return;
                  }
                  onEdit(routine);
                }}
                onTouchStart={(e) => e.stopPropagation()}
                className="h-7 w-7 bg-white/20 border-white/30 text-white hover:bg-white/30 active:bg-white/40 transition-colors"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShareRoutine(routine);
                }}
                onTouchStart={(e) => e.stopPropagation()}
                className="h-7 w-7 bg-white/20 border-white/30 text-white hover:bg-white/30 active:bg-white/40 transition-colors"
                title="Share Routine"
              >
                <Share className="h-3.5 w-3.5" />
              </Button>
              {onDelete && routine.canDelete && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteRoutine();
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="h-7 w-7 bg-red-500/20 border-red-300/30 text-white hover:bg-red-500/30 active:bg-red-500/40 transition-colors"
                  title="Delete Routine"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content with improved spacing */}
        <div className="p-7 space-y-6 flex-1">
          {/* Status and Current Day with more spacing */}
          <div className="flex items-center justify-between mb-1">
            <Badge className={`${getStatusColor(routine.status || 'not-started')} border-0`}>
              {getStatusText(routine.status || 'not-started')}
            </Badge>
            {currentDayInfo && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Day {currentDayInfo.dayNumber}:</span> {currentDayInfo.dayName}
              </div>
            )}
          </div>

          {/* Current Day's Workout Preview with more spacing */}
          {currentDayInfo && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Today's Focus:</span> {currentDayInfo.exercises}
              </p>
            </div>
          )}

          {/* Weekly Breakdown with improved spacing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Weekly Plan</span>
            </div>
            
            <div className="space-y-3">
              {getActiveDays().length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {getActiveDays().slice(0, 3).map(([day, exercises]) => (
                    <div key={day} className="flex justify-between items-start text-sm py-1">
                      <span className="font-medium text-foreground min-w-[60px]">{day.slice(0, 3)}:</span>
                      <span className="text-muted-foreground text-right flex-1 line-clamp-1 ml-2">
                        {typeof exercises === 'string' && exercises.length > 40 
                          ? `${exercises.slice(0, 40)}...` 
                          : String(exercises || '')}
                      </span>
                    </div>
                  ))}
                  {getActiveDays().length > 3 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      +{getActiveDays().length - 3} more days
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-3">
                  No workouts planned yet
                </div>
              )}
            </div>
          </div>

          {/* Stats and Actions with improved spacing */}
          <div className="flex items-center justify-between pt-5 border-t border-border/50 mt-auto">
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
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartRoutine}
                className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 px-4 py-2"
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
              
              <WorkoutCompleteButton
                routine_id={routine.id.toString()}
                intensity={routine.routineType === 'hiit' ? 'high' : routine.routineType === 'cardio' ? 'medium' : 'medium'}
                duration_minutes={parseInt(routine.duration.match(/\d+/)?.[0] || '45')}
                difficulty_multiplier={routine.routineType === 'strength' ? 1.2 : 1.0}
                className="text-xs px-3 py-2"
                compact={true}
              />
            </div>
          </div>

          {/* Notes Preview with more spacing */}
          {routine.notes && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 line-clamp-2 mt-4">
              {routine.notes}
            </div>
          )}
        </div>

      </CardContent>
      
      {/* Routine History Modal */}
      <RoutineHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        routineId={routine.id.toString()}
        routineName={routine.title}
      />
    </Card>
  );
}