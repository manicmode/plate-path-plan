import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';

interface SocialBoost {
  id: string;
  type: 'challenge_suggestion' | 'trending_challenge' | 'momentum_boost' | 'daily_motivation';
  friend_id: string;
  friend_name: string;
  challenge_id?: string;
  challenge_name?: string;
  triggered_at: string;
  shown: boolean;
}

interface FriendRequestEvent {
  friend_id: string;
  friend_name: string;
  action: 'sent' | 'accepted';
}

interface ChallengeCompletion {
  user_id: string;
  challenge_id: string;
  completed_at: string;
}

export const useSocialBoosts = () => {
  const [pendingBoosts, setPendingBoosts] = useState<SocialBoost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Track friend request sent - trigger challenge suggestion toast
  const handleFriendRequestSent = async (friendId: string, friendName: string) => {
    try {
      // Show immediate toast suggestion
      toast({
        title: "🎯 Want to do a challenge together?",
        description: `Start a challenge with ${friendName} to keep each other motivated!`,
        duration: 6000,
      });

      // Track the boost for future reference
      await recordSocialBoost({
        type: 'challenge_suggestion',
        friend_id: friendId,
        friend_name: friendName,
        triggered_at: new Date().toISOString(),
        shown: true,
      });

      // Also check for trending challenges with friends
      await suggestTrendingChallenge(friendId, friendName);
    } catch (error) {
      console.error('Error handling friend request sent:', error);
    }
  };

  // Track friend request accepted - trigger modal
  const handleFriendRequestAccepted = async (friendId: string, friendName: string) => {
    try {
      await recordSocialBoost({
        type: 'challenge_suggestion',
        friend_id: friendId,
        friend_name: friendName,
        triggered_at: new Date().toISOString(),
        shown: false, // Will be shown as modal
      });

      return {
        showModal: true,
        friendName,
        friendId,
      };
    } catch (error) {
      console.error('Error handling friend request accepted:', error);
      return { showModal: false };
    }
  };

  // Suggest trending challenge with friends already in it
  const suggestTrendingChallenge = async (friendId: string, friendName: string) => {
    try {
      if (!user) return;

      // Get trending challenges
      const { data: trendingChallenges } = await supabase
        .from('public_challenges')
        .select('*')
        .eq('is_trending', true)
        .eq('is_active', true)
        .limit(3);

      if (!trendingChallenges?.length) return;

      // Check which challenges have friends in them
      for (const challenge of trendingChallenges) {
        const { data: friendsInChallenge } = await supabase
          .from('user_challenge_participations')
          .select('user_id')
          .eq('challenge_id', challenge.id);

        const friendCount = friendsInChallenge?.length || 0;
        
        if (friendCount >= 2) {
          toast({
            title: `🔥 '${challenge.title}' challenge has ${friendCount} friends in it already`,
            description: "Join them and make it even more fun!",
            duration: 8000,
          });

          await recordSocialBoost({
            type: 'trending_challenge',
            friend_id: friendId,
            friend_name: friendName,
            challenge_id: challenge.id,
            challenge_name: challenge.title,
            triggered_at: new Date().toISOString(),
            shown: true,
          });
          break; // Only show one suggestion
        }
      }
    } catch (error) {
      console.error('Error suggesting trending challenge:', error);
    }
  };

  // Check for momentum boost opportunities
  const checkMomentumBoost = async () => {
    try {
      if (!user) return;

      // Get user's friends
      const { data: friends } = await supabase
        .from('user_friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (!friends?.length) return;

      const friendIds = friends.map(f => f.friend_id);

      // Get recent challenge completions (last 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: userCompletions } = await supabase
        .from('user_challenge_participations')
        .select('challenge_id, completed_at')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('completed_at', threeDaysAgo.toISOString());

      const { data: friendCompletions } = await supabase
        .from('user_challenge_participations')
        .select('user_id, challenge_id, completed_at')
        .in('user_id', friendIds)
        .eq('is_completed', true)
        .gte('completed_at', threeDaysAgo.toISOString());

      // Find overlapping completions within 3-day window
      const matches = findMomentumMatches(userCompletions || [], friendCompletions || []);
      
      for (const match of matches) {
        const { data: friendProfile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', match.friend_id)
          .single();

        const friendName = friendProfile 
          ? `${friendProfile.first_name} ${friendProfile.last_name}`.trim()
          : 'Your friend';

        toast({
          title: "🔥 Keep the momentum going!",
          description: `You and ${friendName} both crushed a challenge recently. Ready to try another one together?`,
          duration: 8000,
        });

        await recordSocialBoost({
          type: 'momentum_boost',
          friend_id: match.friend_id,
          friend_name: friendName,
          challenge_id: match.challenge_id,
          triggered_at: new Date().toISOString(),
          shown: true,
        });
      }
    } catch (error) {
      console.error('Error checking momentum boost:', error);
    }
  };

  // Check for daily motivation opportunities
  const checkDailyMotivation = async () => {
    try {
      if (!user) return;

      // Get recent team-ups (last 1-2 days)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const { data: recentBoosts } = await supabase
        .from('social_boosts')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'challenge_suggestion')
        .gte('triggered_at', twoDaysAgo.toISOString())
        .lte('triggered_at', yesterday.toISOString());

      for (const boost of recentBoosts || []) {
        // Check if we haven't sent daily motivation yet
        const { data: existingMotivation } = await supabase
          .from('social_boosts')
          .select('id')
          .eq('user_id', user.id)
          .eq('friend_id', boost.friend_id)
          .eq('type', 'daily_motivation')
          .gte('triggered_at', yesterday.toISOString());

        if (!existingMotivation?.length) {
          toast({
            title: `🌟 You and ${boost.friend_name} are both on fire this week!`,
            description: "Ready to crush something together again?",
            duration: 8000,
          });

          await recordSocialBoost({
            type: 'daily_motivation',
            friend_id: boost.friend_id,
            friend_name: boost.friend_name,
            triggered_at: new Date().toISOString(),
            shown: true,
          });
        }
      }
    } catch (error) {
      console.error('Error checking daily motivation:', error);
    }
  };

  // Helper function to find momentum matches
  const findMomentumMatches = (userCompletions: any[], friendCompletions: any[]) => {
    const matches = [];
    
    for (const userCompletion of userCompletions) {
      for (const friendCompletion of friendCompletions) {
        if (userCompletion.challenge_id === friendCompletion.challenge_id) {
          const userDate = new Date(userCompletion.completed_at);
          const friendDate = new Date(friendCompletion.completed_at);
          const timeDiff = Math.abs(userDate.getTime() - friendDate.getTime());
          const daysDiff = timeDiff / (1000 * 3600 * 24);
          
          if (daysDiff <= 3) {
            matches.push({
              friend_id: friendCompletion.user_id,
              challenge_id: userCompletion.challenge_id,
              user_completed_at: userCompletion.completed_at,
              friend_completed_at: friendCompletion.completed_at,
            });
          }
        }
      }
    }
    
    return matches;
  };

  // Record social boost in database
  const recordSocialBoost = async (boost: Omit<SocialBoost, 'id'>) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('social_boosts')
        .insert({
          user_id: user.id,
          type: boost.type,
          friend_id: boost.friend_id,
          friend_name: boost.friend_name,
          challenge_id: boost.challenge_id,
          challenge_name: boost.challenge_name,
          triggered_at: boost.triggered_at,
          shown: boost.shown,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording social boost:', error);
    }
  };

  // Get pending boosts that need to be shown
  const loadPendingBoosts = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('social_boosts')
        .select('*')
        .eq('user_id', user.id)
        .eq('shown', false)
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      setPendingBoosts(data || []);
    } catch (error) {
      console.error('Error loading pending boosts:', error);
    }
  };

  // Mark boost as shown
  const markBoostAsShown = async (boostId: string) => {
    try {
      const { error } = await supabase
        .from('social_boosts')
        .update({ shown: true })
        .eq('id', boostId);

      if (error) throw error;
      
      setPendingBoosts(prev => prev.filter(b => b.id !== boostId));
    } catch (error) {
      console.error('Error marking boost as shown:', error);
    }
  };

  // Periodic checks for boosts
  useEffect(() => {
    if (!user) return;

    loadPendingBoosts();
    
    // Check for momentum and daily motivation opportunities
    const interval = setInterval(() => {
      checkMomentumBoost();
      checkDailyMotivation();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  return {
    pendingBoosts,
    isLoading,
    handleFriendRequestSent,
    handleFriendRequestAccepted,
    suggestTrendingChallenge,
    checkMomentumBoost,
    checkDailyMotivation,
    markBoostAsShown,
    loadPendingBoosts,
  };
};