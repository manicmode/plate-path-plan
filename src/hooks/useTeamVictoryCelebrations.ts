import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useSound } from '@/hooks/useSound';
import { supabase } from '@/integrations/supabase/client';

export const useTeamVictoryCelebrations = () => {
  const [celebrationShown, setCelebrationShown] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { playChallengeWin } = useSound();

  // Check for team victories in accountability groups
  const checkAccountabilityGroupVictories = async () => {
    if (!user) return;

    try {
      // Check if user's accountability groups have completed challenges
      // For now, this is a placeholder - would need proper database function
      console.log('Checking accountability group victories for user:', user.id);
      
      // This would be implemented when the proper database schema is available
      // const { data: groupWins, error } = await supabase
      //   .from('accountability_group_victories')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('created_at', { ascending: false });
      
    } catch (error) {
      console.error('Error checking accountability group victories:', error);
    }
  };

  // Check for team victories in challenge teams
  const checkChallengeTeamVictories = async () => {
    if (!user) return;

    try {
      // Check if user's challenge teams have won
      const { data: teamWins, error } = await supabase
        .from('challenge_teams')
        .select('*')
        .contains('member_ids', [user.id])
        .eq('team_rank', 1)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (teamWins && Array.isArray(teamWins)) {
        teamWins.forEach((team: any) => {
          const victoryKey = `team-${team.id}-${team.updated_at}`;
          
          if (!celebrationShown.has(victoryKey)) {
            // Trigger celebration popup
            const celebrationEvent = new CustomEvent('showCelebration', {
              detail: {
                message: `Team Victory! 👥\n"${team.name}" ranked #1!`,
                type: 'team_challenge_victory'
              }
            });
            window.dispatchEvent(celebrationEvent);
            
            // Play victory sound
            playChallengeWin();
            
            // Mark celebration as shown
            setCelebrationShown(prev => new Set([...prev, victoryKey]));
          }
        });
      }
    } catch (error) {
      console.error('Error checking challenge team victories:', error);
    }
  };

  // Periodically check for team victories
  useEffect(() => {
    if (!user) return;

    // Check immediately
    checkAccountabilityGroupVictories();
    checkChallengeTeamVictories();

    // Check every 5 minutes
    const interval = setInterval(() => {
      checkAccountabilityGroupVictories();
      checkChallengeTeamVictories();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  return {
    checkAccountabilityGroupVictories,
    checkChallengeTeamVictories
  };
};