
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Trophy, Zap } from 'lucide-react';
import { useChallengeRealtime } from '@/hooks/useChallengeRealtime';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';

interface EnhancedChallengeCardProps {
  challenge: {
    id: string;
    name: string;
    type: 'public' | 'private' | 'micro';
    progress: number;
    streakCount: number;
    durationDays: number;
    endDate: Date;
    participants?: Array<{ id: string; name: string; progress: number }>;
  };
  onUpdateProgress?: (challengeId: string, progress: number) => void;
  onComplete?: (challengeId: string) => void;
}

export const EnhancedChallengeCard: React.FC<EnhancedChallengeCardProps> = ({
  challenge,
  onUpdateProgress,
  onComplete
}) => {
  const { user } = useAuth();
  const { updates, broadcastProgress } = useChallengeRealtime([challenge.id]);
  const { sendNotification } = useNotificationSystem();
  const [localProgress, setLocalProgress] = useState(challenge.progress);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local progress when real-time updates come in
  useEffect(() => {
    const latestUpdate = updates.find(u => u.challengeId === challenge.id && u.userId !== user?.id);
    if (latestUpdate && latestUpdate.type === 'progress') {
      // This would update progress for other participants
      console.log('Real-time progress update:', latestUpdate);
    }
  }, [updates, challenge.id, user?.id]);

  const handleProgressUpdate = async () => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const newProgress = Math.min(100, localProgress + (100 / challenge.durationDays));
      
      // Call the challenge progress tracker
      const { data, error } = await supabase.functions.invoke('challenge-progress-tracker', {
        body: {
          challenge_id: challenge.id,
          user_id: user.id,
          progress_value: 1, // Daily completion
          is_public_challenge: challenge.type === 'public'
        }
      });

      if (error) throw error;

      setLocalProgress(data.completion_percentage);
      
      // Broadcast real-time update
      await broadcastProgress(challenge.id, data.completion_percentage);
      
      // Send completion notification
      if (data.is_completed && !challenge.progress >= 100) {
        await sendNotification(
          user.id,
          'challenge_complete',
          'Challenge Completed! 🎉',
          `Congratulations on completing "${challenge.name}"!`,
          { challenge_id: challenge.id }
        );
        onComplete?.(challenge.id);
      }
      
      onUpdateProgress?.(challenge.id, data.completion_percentage);
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const daysRemaining = Math.ceil((challenge.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isCompleted = localProgress >= 100;
  const isExpired = daysRemaining <= 0;

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-lg",
      challenge.type === 'micro' && "border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50",
      isCompleted && "border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50",
      isExpired && !isCompleted && "opacity-60"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {challenge.type === 'micro' && <Zap className="h-4 w-4 text-yellow-600" />}
            {challenge.type !== 'micro' && <Trophy className="h-4 w-4 text-primary" />}
            <h3 className="font-semibold text-lg">{challenge.name}</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={challenge.type === 'private' ? 'secondary' : 'default'}>
              {challenge.type}
            </Badge>
            {isCompleted && <Badge variant="default" className="bg-green-500">Completed</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(localProgress)}%</span>
          </div>
          <Progress value={localProgress} className="h-2" />
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {isExpired ? 'Expired' : `${daysRemaining} days left`}
          </div>
          
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {challenge.streakCount} day streak
          </div>

          {challenge.participants && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {challenge.participants.length} participants
            </div>
          )}
        </div>

        {/* Action Button */}
        {!isCompleted && !isExpired && (
          <Button
            onClick={handleProgressUpdate}
            disabled={isUpdating}
            className="w-full"
            variant={challenge.type === 'micro' ? 'default' : 'outline'}
          >
            {isUpdating ? 'Updating...' : 'Mark Today Complete'}
          </Button>
        )}

        {/* Participants Progress (for team challenges) */}
        {challenge.participants && challenge.participants.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Team Progress</h4>
            <div className="space-y-1">
              {challenge.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">{participant.name}</span>
                  <span className="font-medium">{Math.round(participant.progress)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
