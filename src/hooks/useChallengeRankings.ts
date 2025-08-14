import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChallengeParticipant {
  user_id: string;
  user_email: string;
  score: number;
  rank: number;
}

export const useChallengeRankings = (challengeId: string | null) => {
  const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRankings = async () => {
    if (!challengeId) {
      setParticipants([]);
      return;
    }

    setLoading(true);
    try {
      // Check if this is a Rank-of-20 challenge
      const { data: challengeData, error: challengeError } = await supabase
        .from('private_challenges')
        .select('challenge_type')
        .eq('id', challengeId)
        .single();

      if (challengeError) throw challengeError;

      // If it's a Rank-of-20 challenge, use the new RPC for peer visibility
      if (challengeData?.challenge_type === 'rank_of_20') {
        const { data: membersData, error: membersError } = await supabase
          .rpc('my_rank20_group_members');

        if (membersError) throw membersError;

        if (!membersData || membersData.length === 0) {
          setParticipants([]);
          setLoading(false);
          return;
        }

        // Calculate rankings based on joined date (for now, until we have better scoring)
        const participantsWithScores = membersData.map((member: any, index: number) => ({
          user_id: member.user_id,
          user_email: member.display_name || `User ${member.user_id.slice(0, 8)}`,
          score: Math.random() * 100, // Temporary random scoring
          rank: index + 1
        }));

        // Sort by score descending and reassign ranks
        participantsWithScores.sort((a, b) => b.score - a.score);
        participantsWithScores.forEach((participant, index) => {
          participant.rank = index + 1;
        });

        setParticipants(participantsWithScores);
      } else {
        // Regular challenge - use original logic
        const { data: membersData, error: membersError } = await supabase
          .from('private_challenge_participations')
          .select(`
            user_id,
            progress_value,
            completed_days,
            completion_percentage
          `)
          .eq('private_challenge_id', challengeId);

        if (membersError) throw membersError;

        if (!membersData || membersData.length === 0) {
          setParticipants([]);
          setLoading(false);
          return;
        }

        // Get user emails from auth schema
        const userIds = membersData.map(m => m.user_id);
        const userEmailsMap = new Map<string, string>();

        // For now, we'll use mock emails since we can't directly access auth.users
        // In a real implementation, you'd have a user_profiles table with display names
        userIds.forEach(userId => {
          userEmailsMap.set(userId, `user-${userId.slice(0, 8)}@example.com`);
        });

        // Calculate rankings based on completion percentage and progress
        const participantsWithScores = membersData.map(member => ({
          user_id: member.user_id,
          user_email: userEmailsMap.get(member.user_id) || 'Unknown',
          score: (member.completion_percentage || 0) * 10 + (member.completed_days || 0) * 5,
          rank: 0 // Will be calculated after sorting
        }));

        // Sort by score descending and assign ranks
        participantsWithScores.sort((a, b) => b.score - a.score);
        participantsWithScores.forEach((participant, index) => {
          participant.rank = index + 1;
        });

        setParticipants(participantsWithScores);
      }
    } catch (error) {
      console.error('Error fetching challenge rankings:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [challengeId]);

  return {
    participants,
    loading,
    refetch: fetchRankings
  };
};