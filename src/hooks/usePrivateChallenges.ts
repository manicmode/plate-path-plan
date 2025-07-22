import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

export interface PrivateChallenge {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  category: string;
  challenge_type: string;
  target_metric: string | null;
  target_value: number | null;
  target_unit: string | null;
  duration_days: number;
  start_date: string;
  max_participants: number;
  invited_user_ids: string[];
  status: string;
  badge_icon: string;
  created_at: string;
  updated_at: string;
}

export interface PrivateChallengeParticipation {
  id: string;
  private_challenge_id: string;
  user_id: string;
  joined_at: string;
  is_creator: boolean;
  progress_value: number;
  streak_count: number;
  completed_days: number;
  completion_percentage: number;
  daily_completions: any;
  completed_at: string | null;
  last_progress_update: string | null;
}

export interface ChallengeInvitation {
  id: string;
  private_challenge_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  invited_at: string;
  responded_at: string | null;
}

export const usePrivateChallenges = () => {
  const [privateChallenges, setPrivateChallenges] = useState<PrivateChallenge[]>([]);
  const [userPrivateParticipations, setUserPrivateParticipations] = useState<PrivateChallengeParticipation[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<ChallengeInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPrivateChallenges = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('private_challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrivateChallenges(data || []);
    } catch (error) {
      console.error('Error fetching private challenges:', error);
      toast({
        title: "Error",
        description: "Failed to load private challenges",
        variant: "destructive",
      });
    }
  };

  const fetchUserPrivateParticipations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('private_challenge_participations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserPrivateParticipations(data || []);
    } catch (error) {
      console.error('Error fetching user private participations:', error);
    }
  };

  const fetchPendingInvitations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('challenge_invitations')
        .select('*')
        .eq('invitee_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  };

  const createPrivateChallenge = async (challengeData: {
    title: string;
    description: string;
    category: string;
    challenge_type: string;
    target_metric?: string;
    target_value?: number;
    target_unit?: string;
    duration_days: number;
    start_date: string;
    max_participants: number;
    invited_user_ids: string[];
    badge_icon: string;
  }): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create challenges",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data: challenge, error: challengeError } = await supabase
        .from('private_challenges')
        .insert({
          ...challengeData,
          creator_id: user.id,
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Create creator participation
      const { error: participationError } = await supabase
        .from('private_challenge_participations')
        .insert({
          private_challenge_id: challenge.id,
          user_id: user.id,
          is_creator: true,
        });

      if (participationError) throw participationError;

      // Create invitations
      if (challengeData.invited_user_ids.length > 0) {
        const invitations = challengeData.invited_user_ids.map(inviteeId => ({
          private_challenge_id: challenge.id,
          inviter_id: user.id,
          invitee_id: inviteeId,
        }));

        const { error: invitationError } = await supabase
          .from('challenge_invitations')
          .insert(invitations);

        if (invitationError) throw invitationError;
      }

      // Refresh data
      await Promise.all([
        fetchPrivateChallenges(),
        fetchUserPrivateParticipations()
      ]);

      toast({
        title: "Challenge Created!",
        description: `"${challengeData.title}" has been created and invitations sent`,
      });

      return true;
    } catch (error) {
      console.error('Error creating private challenge:', error);
      toast({
        title: "Error",
        description: "Failed to create challenge",
        variant: "destructive",
      });
      return false;
    }
  };

  const acceptInvitation = async (invitationId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('accept_challenge_invitation', {
        invitation_id_param: invitationId
      });

      if (error) throw error;

      if (data) {
        // Refresh data
        await Promise.all([
          fetchPrivateChallenges(),
          fetchUserPrivateParticipations(),
          fetchPendingInvitations()
        ]);

        toast({
          title: "Invitation Accepted!",
          description: "You've joined the challenge",
        });

        return true;
      } else {
        toast({
          title: "Error",
          description: "Failed to accept invitation - challenge may be full",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
      return false;
    }
  };

  const declineInvitation = async (invitationId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('challenge_invitations')
        .update({ 
          status: 'declined', 
          responded_at: new Date().toISOString() 
        })
        .eq('id', invitationId)
        .eq('invitee_id', user.id);

      if (error) throw error;

      // Refresh pending invitations
      await fetchPendingInvitations();

      toast({
        title: "Invitation Declined",
        description: "You've declined the challenge invitation",
      });

      return true;
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast({
        title: "Error",
        description: "Failed to decline invitation",
        variant: "destructive",
      });
      return false;
    }
  };

  const updatePrivateProgress = async (challengeId: string, progressValue: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const participation = userPrivateParticipations.find(p => p.private_challenge_id === challengeId);
      if (!participation) throw new Error('Participation not found');

      const today = new Date().toISOString().split('T')[0];
      
      // Update daily completion
      const updatedCompletions = {
        ...participation.daily_completions,
        [today]: true
      };

      // Update participation record
      const { error: updateError } = await supabase
        .from('private_challenge_participations')
        .update({
          daily_completions: updatedCompletions,
          last_progress_update: new Date().toISOString(),
        })
        .eq('id', participation.id);

      if (updateError) throw updateError;

      // Calculate progress using the database function
      const { error: calcError } = await supabase.rpc('calculate_private_challenge_progress', {
        participation_id_param: participation.id
      });

      if (calcError) throw calcError;

      // Refresh user participations
      await fetchUserPrivateParticipations();

      toast({
        title: "Progress Updated!",
        description: "Your challenge progress has been recorded",
      });

      return true;
    } catch (error) {
      console.error('Error updating private progress:', error);
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (user) {
        await Promise.all([
          fetchPrivateChallenges(),
          fetchUserPrivateParticipations(),
          fetchPendingInvitations()
        ]);
      }
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Get user's participation for a specific challenge
  const getUserPrivateParticipation = (challengeId: string) =>
    userPrivateParticipations.find(p => p.private_challenge_id === challengeId);

  // Get challenges the user is participating in
  const userActiveChallenges = privateChallenges.filter(challenge =>
    userPrivateParticipations.some(p => p.private_challenge_id === challenge.id)
  );

  // Get challenges with detailed participation info
  const challengesWithParticipation = userActiveChallenges.map(challenge => ({
    ...challenge,
    participation: getUserPrivateParticipation(challenge.id)
  }));

  return {
    privateChallenges,
    userPrivateParticipations,
    pendingInvitations,
    userActiveChallenges,
    challengesWithParticipation,
    loading,
    createPrivateChallenge,
    acceptInvitation,
    declineInvitation,
    updatePrivateProgress,
    getUserPrivateParticipation,
    refreshData: () => Promise.all([
      fetchPrivateChallenges(),
      fetchUserPrivateParticipations(),
      fetchPendingInvitations()
    ]),
  };
};