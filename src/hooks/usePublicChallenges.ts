import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';

export interface PublicChallenge {
  id: string;
  title: string;
  description: string;
  goal_description: string;
  duration_days: number;
  challenge_type: string;
  difficulty_level: string;
  category: string;
  target_metric: string | null;
  target_value: number | null;
  target_unit: string | null;
  badge_icon: string;
  is_trending: boolean;
  is_new: boolean;
  is_limited_time: boolean;
  limited_time_end: string | null;
  participant_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserChallengeParticipation {
  id: string;
  user_id: string;
  challenge_id: string;
  joined_at: string;
  start_date: string;
  end_date: string;
  current_progress: number;
  total_target: number;
  daily_completions: any;
  streak_count: number;
  best_streak: number;
  completion_percentage: number;
  is_completed: boolean;
  completed_at: string | null;
  last_progress_update: string | null;
}

export const usePublicChallenges = () => {
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [userParticipations, setUserParticipations] = useState<UserChallengeParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebrationShown, setCelebrationShown] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();
  const { playChallengeWin } = useSound();

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('public_challenges')
        .select('*')
        .eq('is_active', true)
        .order('is_trending', { ascending: false })
        .order('is_new', { ascending: false })
        .order('participant_count', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast({
        title: "Error",
        description: "Failed to load challenges",
        variant: "destructive",
      });
    }
  };

  const fetchUserParticipations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_challenge_participations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserParticipations(data || []);
    } catch (error) {
      console.error('Error fetching user participations:', error);
    }
  };

  const joinChallenge = async (challengeId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join challenges",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Check if already participating
      const existingParticipation = userParticipations.find(p => p.challenge_id === challengeId);
      if (existingParticipation) {
        toast({
          title: "Already Joined",
          description: "You're already participating in this challenge",
          variant: "destructive",
        });
        return false;
      }

      // Get challenge details
      const challenge = challenges.find(c => c.id === challengeId);
      if (!challenge) throw new Error('Challenge not found');

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + challenge.duration_days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const { error } = await supabase
        .from('user_challenge_participations')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          start_date: startDate,
          end_date: endDate,
          total_target: challenge.target_value || challenge.duration_days,
        });

      if (error) throw error;

      // Refresh data
      await Promise.all([fetchChallenges(), fetchUserParticipations()]);

      toast({
        title: "Challenge Joined!",
        description: `You've joined "${challenge.title}"`,
      });

      return true;
    } catch (error) {
      console.error('Error joining challenge:', error);
      toast({
        title: "Error",
        description: "Failed to join challenge",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateProgress = async (challengeId: string, progressValue: number, notes?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const participation = userParticipations.find(p => p.challenge_id === challengeId);
      if (!participation) throw new Error('Participation not found');

      const today = new Date().toISOString().split('T')[0];
      
      // Update daily completion
      const updatedCompletions = {
        ...participation.daily_completions,
        [today]: true
      };

      // Log progress
      const { error: logError } = await supabase
        .from('challenge_progress_logs')
        .insert({
          participation_id: participation.id,
          user_id: user.id,
          challenge_id: challengeId,
          log_date: today,
          progress_value: progressValue,
          notes: notes || null,
        });

      if (logError) throw logError;

      // Update participation record
      const { error: updateError } = await supabase
        .from('user_challenge_participations')
        .update({
          daily_completions: updatedCompletions,
          last_progress_update: new Date().toISOString(),
        })
        .eq('id', participation.id);

      if (updateError) throw updateError;

      // Calculate progress using the database function
      const { error: calcError } = await supabase.rpc('calculate_challenge_progress', {
        participation_id_param: participation.id
      });

      if (calcError) throw calcError;

      // Refresh user participations
      await fetchUserParticipations();

      // Check for challenge completion and trigger celebration
      const updatedParticipation = await supabase
        .from('user_challenge_participations')
        .select('*')
        .eq('id', participation.id)
        .single();

      if (updatedParticipation.data && updatedParticipation.data.completion_percentage >= 100 && 
          !celebrationShown.has(challengeId)) {
        
        // Trigger celebration popup
        const challengeData = challenges.find(c => c.id === challengeId);
        const celebrationEvent = new CustomEvent('showCelebration', {
          detail: {
            message: `Challenge Completed! 🏆\n"${challengeData?.title || 'Challenge'}" conquered!`,
            type: 'challenge'
          }
        });
        window.dispatchEvent(celebrationEvent);
        
        // Play victory sound
        playChallengeWin();
        
        // Mark celebration as shown
        setCelebrationShown(prev => new Set([...prev, challengeId]));
      }

      toast({
        title: "Progress Updated!",
        description: "Your challenge progress has been recorded",
      });

      return true;
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
      return false;
    }
  };

  const leaveChallenge = async (challengeId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_challenge_participations')
        .delete()
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId);

      if (error) throw error;

      // Refresh data
      await Promise.all([fetchChallenges(), fetchUserParticipations()]);

      toast({
        title: "Left Challenge",
        description: "You've left the challenge",
      });

      return true;
    } catch (error) {
      console.error('Error leaving challenge:', error);
      toast({
        title: "Error",
        description: "Failed to leave challenge",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchChallenges();
      if (user) {
        await fetchUserParticipations();
      }
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Filter challenges by category
  const globalChallenges = challenges.filter(c => c.duration_days >= 7);
  const quickChallenges = challenges.filter(c => c.duration_days <= 3);
  const trendingChallenges = challenges.filter(c => c.is_trending);
  const newChallenges = challenges.filter(c => c.is_new);

  // Get user's participation status for each challenge
  const getUserParticipation = (challengeId: string) => 
    userParticipations.find(p => p.challenge_id === challengeId);

  const isUserParticipating = (challengeId: string) => 
    userParticipations.some(p => p.challenge_id === challengeId);

  return {
    challenges,
    globalChallenges,
    quickChallenges,
    trendingChallenges,
    newChallenges,
    userParticipations,
    loading,
    joinChallenge,
    updateProgress,
    leaveChallenge,
    getUserParticipation,
    isUserParticipating,
    refreshData: () => Promise.all([fetchChallenges(), fetchUserParticipations()]),
  };
};