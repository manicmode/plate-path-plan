import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';

export interface PublicChallenge {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  visibility: string;
  duration_days: number;
  cover_emoji: string | null;
  invite_code: string | null;
  owner_user_id: string;
  created_at: string;
  participant_count: number;
}

export interface UserChallengeParticipation {
  challenge_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
}

export const usePublicChallenges = () => {
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [userParticipations, setUserParticipations] = useState<UserChallengeParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [celebrationShown, setCelebrationShown] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();
  const { playChallengeWin } = useSound();

  const fetchChallenges = async () => {
    try {
      setError(null);
      // Use the challenges_with_counts view for efficient querying with computed end_at
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("challenges_with_counts")
        .select("*")
        .eq("visibility", "public")
        .gt("end_at", nowIso) // Only active challenges - use ISO, not "now()"
        .order("created_at", { ascending: false });

      if (error) {
        setError(error);
        console.error('Error fetching challenges:', error);
        toast({
          title: "Error",
          description: "Failed to load challenges: " + error.message,
          variant: "destructive",
        });
        return;
      }
      
      setChallenges((data || []).map(challenge => ({
        ...challenge,
        participant_count: challenge.participants || 0
      })));
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching challenges:', error);
      toast({
        title: "Error",
        description: "Failed to load challenges",
        variant: "destructive",
      });
    }
  };

  const fetchUserParticipations = async () => {
    // Guard against missing user, but don't throw
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('challenge_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'joined');

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

      const { error } = await supabase
        .from('challenge_members')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          role: 'member',
          status: 'joined',
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

      // Log progress
      const { error: logError } = await supabase
        .from('challenge_progress_logs')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          log_date: today,
          progress_value: progressValue,
          notes: notes || null,
        });

      if (logError) throw logError;

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
        .from('challenge_members')
        .update({ status: 'left' })
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
      // Always call fetchUserParticipations, but it will guard internally
      await fetchUserParticipations();
      setLoading(false);
    };

    loadData();

    // Set up real-time subscriptions for challenges_with_counts view
    const challengesChannel = supabase
      .channel('public-challenges-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
          filter: 'visibility=eq.public'
        },
        () => {
          fetchChallenges();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_members'
        },
        () => {
          fetchChallenges();
          // Always call, but it guards internally
          fetchUserParticipations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(challengesChannel);
    };
  }, [user]);

  // Filter challenges by category
  const globalChallenges = challenges.filter(c => c.duration_days >= 7);
  const quickChallenges = challenges.filter(c => c.duration_days <= 3);
  const trendingChallenges = challenges.filter(c => c.participant_count > 5);
  const newChallenges = challenges.filter(c => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(c.created_at) > weekAgo;
  });

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
    error,
    joinChallenge,
    updateProgress,
    leaveChallenge,
    getUserParticipation,
    isUserParticipating,
    refreshData: () => Promise.all([fetchChallenges(), fetchUserParticipations()]),
  };
};