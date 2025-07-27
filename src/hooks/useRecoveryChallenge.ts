import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { useRecoveryChallengeCoach } from '@/hooks/useRecoveryChallengeCoach';

interface RecoveryActivity {
  category: 'meditation' | 'breathing' | 'yoga' | 'sleep' | 'thermotherapy';
  sessionId: string;
  completedAt: string;
  duration?: number;
  notes?: string;
}

export interface RecoveryChallengeProgress {
  challengeId: string;
  category: string;
  sessionsCompleted: number;
  streakDays: number;
  targetSessions: number;
  completionPercentage: number;
}

export const useRecoveryChallenge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendProgressMessage } = useRecoveryChallengeCoach();
  const [activeChallenges, setActiveChallenges] = useState<RecoveryChallengeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Track recovery activity and update relevant challenges
  const trackRecoveryActivity = async (activity: RecoveryActivity): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get active recovery challenges for this user and category
      const { data: challenges, error: challengeError } = await supabase
        .from('private_challenges')
        .select(`
          id, title, category, challenge_type, duration_days, start_date,
          private_challenge_participations!inner(
            id, user_id, progress_value, daily_completions, streak_count
          )
        `)
        .eq('private_challenge_participations.user_id', user.id)
        .eq('status', 'active')
        .eq('category', activity.category);

      if (challengeError) throw challengeError;

      const publicChallengesRes = await supabase
        .from('public_challenges')
        .select(`
          id, title, category, challenge_type, duration_days,
          user_challenge_participations!inner(
            id, user_id, progress_value, daily_completions, streak_count
          )
        `)
        .eq('user_challenge_participations.user_id', user.id)
        .eq('is_active', true)
        .eq('category', activity.category);

      if (publicChallengesRes.error) throw publicChallengesRes.error;

      // Update progress for each relevant challenge
      const today = new Date().toISOString().split('T')[0];
      
      // Update private challenges
      for (const challenge of challenges || []) {
        const participation = (challenge as any).private_challenge_participations[0];
        if (!participation) continue;

        const updatedCompletions = {
          ...participation.daily_completions,
          [today]: true
        };

        await supabase
          .from('private_challenge_participations')
          .update({
            daily_completions: updatedCompletions,
            last_progress_update: new Date().toISOString(),
          })
          .eq('id', participation.id);

        // Recalculate progress
        await supabase.rpc('calculate_private_challenge_progress', {
          participation_id_param: participation.id
        });
      }

      // Update public challenges
      for (const challenge of publicChallengesRes.data || []) {
        const participation = (challenge as any).user_challenge_participations[0];
        if (!participation) continue;

        const updatedCompletions = {
          ...participation.daily_completions,
          [today]: true
        };

        await supabase
          .from('user_challenge_participations')
          .update({
            daily_completions: updatedCompletions,
            last_progress_update: new Date().toISOString(),
          })
          .eq('id', participation.id);

        // Recalculate progress
        await supabase.rpc('calculate_challenge_progress', {
          participation_id_param: participation.id
        });
      }

      // Show success message if any challenges were updated
      const totalChallenges = (challenges?.length || 0) + (publicChallengesRes.data?.length || 0);
      if (totalChallenges > 0) {
        toast({
          title: "Challenge Progress Updated! 🎯",
          description: `Your ${activity.category} session counts toward ${totalChallenges} active challenge${totalChallenges > 1 ? 's' : ''}`,
        });
      }

      // Send coach commentary for progress
      await sendProgressMessage(activity);

      // Refresh active challenges
      await fetchActiveChallenges();
      
      return true;
    } catch (error) {
      console.error('Error tracking recovery activity:', error);
      toast({
        title: "Error",
        description: "Failed to update challenge progress",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get all active recovery challenges for the user
  const fetchActiveChallenges = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch private recovery challenges
      const { data: privateChallenges, error: privateError } = await supabase
        .from('private_challenges')
        .select(`
          id, title, category, challenge_type, target_value, duration_days, start_date,
          private_challenge_participations!inner(
            id, user_id, progress_value, streak_count, completion_percentage, daily_completions
          )
        `)
        .eq('private_challenge_participations.user_id', user.id)
        .eq('status', 'active')
        .in('category', ['meditation', 'breathing', 'yoga', 'sleep', 'thermotherapy']);

      if (privateError) throw privateError;

      // Fetch public recovery challenges
      const { data: publicChallenges, error: publicError } = await supabase
        .from('public_challenges')
        .select(`
          id, title, category, challenge_type, target_value, duration_days,
          user_challenge_participations!inner(
            id, user_id, progress_value, streak_count, completion_percentage, daily_completions
          )
        `)
        .eq('user_challenge_participations.user_id', user.id)
        .eq('is_active', true)
        .in('category', ['meditation', 'breathing', 'yoga', 'sleep', 'thermotherapy']);

      if (publicError) throw publicError;

      // Combine and format challenge data
      const allChallenges = [
        ...(privateChallenges || []).map(c => ({ ...c, type: 'private' })),
        ...(publicChallenges || []).map(c => ({ ...c, type: 'public' }))
      ];

      const formattedChallenges: RecoveryChallengeProgress[] = allChallenges.map(challenge => {
        const participation = challenge.type === 'private' 
          ? (challenge as any).private_challenge_participations[0]
          : (challenge as any).user_challenge_participations[0];

        return {
          challengeId: challenge.id,
          category: challenge.category,
          sessionsCompleted: participation.progress_value || 0,
          streakDays: participation.streak_count || 0,
          targetSessions: challenge.target_value || challenge.duration_days,
          completionPercentage: participation.completion_percentage || 0,
        };
      });

      setActiveChallenges(formattedChallenges);
    } catch (error) {
      console.error('Error fetching active challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get recovery challenge statistics
  const getRecoveryStats = () => {
    const totalChallenges = activeChallenges.length;
    const completedChallenges = activeChallenges.filter(c => c.completionPercentage >= 100).length;
    const averageCompletion = totalChallenges > 0 
      ? activeChallenges.reduce((sum, c) => sum + c.completionPercentage, 0) / totalChallenges 
      : 0;
    
    const challengesByCategory = activeChallenges.reduce((acc, challenge) => {
      acc[challenge.category] = (acc[challenge.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalChallenges,
      completedChallenges,
      averageCompletion: Math.round(averageCompletion),
      challengesByCategory,
      longestStreak: Math.max(...activeChallenges.map(c => c.streakDays), 0)
    };
  };

  useEffect(() => {
    if (user) {
      fetchActiveChallenges();
    }
  }, [user]);

  return {
    activeChallenges,
    loading,
    trackRecoveryActivity,
    fetchActiveChallenges,
    getRecoveryStats,
  };
};