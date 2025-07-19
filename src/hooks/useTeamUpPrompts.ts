import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AccountabilityBuddy {
  buddy_user_id: string;
  buddy_name: string;
  buddy_email: string;
  challenge_name: string;
  challenge_id: string;
  completion_date: string;
  shared_ranking_group: boolean;
  buddy_rank_position: number;
  current_user_rank_position: number;
}

export const useTeamUpPrompts = () => {
  const [potentialBuddies, setPotentialBuddies] = useState<AccountabilityBuddy[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<AccountabilityBuddy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadPotentialBuddies = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_potential_accountability_buddies', {
        current_user_id: user.id
      });

      if (error) throw error;

      const buddies = (data || []) as AccountabilityBuddy[];
      setPotentialBuddies(buddies);

      // Show the first buddy as a prompt if available and from same ranking group
      const topBuddy = buddies.find(buddy => buddy.shared_ranking_group);
      if (topBuddy && !currentPrompt) {
        setCurrentPrompt(topBuddy);
      }
    } catch (error) {
      console.error('Error loading potential buddies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequestFromPrompt = async (buddy: AccountabilityBuddy) => {
    try {
      // Send friend request
      const { data: requestSent, error: requestError } = await supabase.rpc('send_friend_request', {
        target_user_id: buddy.buddy_user_id
      });

      if (requestError) throw requestError;

      // Record the action
      await supabase.rpc('record_team_up_prompt_action', {
        buddy_user_id_param: buddy.buddy_user_id,
        challenge_id_param: buddy.challenge_id,
        action_param: 'friend_request_sent'
      });

      if (requestSent) {
        toast({
          title: "Accountability buddy request sent! 💪",
          description: `Your friend request has been sent to ${buddy.buddy_name}`,
        });
      } else {
        toast({
          title: "Request already exists",
          description: "A friend request already exists with this user.",
          variant: "destructive",
        });
      }

      // Hide current prompt and remove from list
      setCurrentPrompt(null);
      setPotentialBuddies(prev => prev.filter(b => b.buddy_user_id !== buddy.buddy_user_id));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Failed to send request",
        description: "Unable to send friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const dismissPrompt = async (buddy: AccountabilityBuddy) => {
    try {
      // Record the dismissal
      await supabase.rpc('record_team_up_prompt_action', {
        buddy_user_id_param: buddy.buddy_user_id,
        challenge_id_param: buddy.challenge_id,
        action_param: 'dismissed'
      });

      // Hide current prompt and remove from list
      setCurrentPrompt(null);
      setPotentialBuddies(prev => prev.filter(b => b.buddy_user_id !== buddy.buddy_user_id));

      // Show next available prompt from same ranking group
      const nextBuddy = potentialBuddies.find(
        b => b.buddy_user_id !== buddy.buddy_user_id && b.shared_ranking_group
      );
      if (nextBuddy) {
        setCurrentPrompt(nextBuddy);
      }
    } catch (error) {
      console.error('Error dismissing prompt:', error);
    }
  };

  const clearCurrentPrompt = () => {
    setCurrentPrompt(null);
  };

  useEffect(() => {
    loadPotentialBuddies();
    
    // Check for new potential buddies every 5 minutes
    const interval = setInterval(loadPotentialBuddies, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    potentialBuddies,
    currentPrompt,
    isLoading,
    sendFriendRequestFromPrompt,
    dismissPrompt,
    clearCurrentPrompt,
    refreshBuddies: loadPotentialBuddies,
  };
};