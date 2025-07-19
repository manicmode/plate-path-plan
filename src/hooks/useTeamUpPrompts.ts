import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSmartTiming } from '@/contexts/SmartTimingContext';

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
  const { shouldShowTeamUpPrompt, registerDismissal } = useSmartTiming();

  const checkPromptAlreadyShown = async (buddyUserId: string, challengeId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return true; // Don't show if not authenticated

      const { data, error } = await supabase
        .from('team_up_prompts_shown')
        .select('id')
        .eq('user_id', user.id)
        .eq('buddy_user_id', buddyUserId)
        .eq('challenge_id', challengeId)
        .maybeSingle();

      if (error) {
        console.error('Error checking prompt history:', error);
        return false; // Show prompt if we can't check
      }

      return !!data; // Return true if a record exists (prompt was already shown)
    } catch (error) {
      console.error('Error checking prompt history:', error);
      return false;
    }
  };

  const loadPotentialBuddies = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_potential_accountability_buddies', {
        current_user_id: user.id
      });

      if (error) throw error;

      const allBuddies = (data || []) as AccountabilityBuddy[];
      
      // Filter out buddies that have already been shown
      const filteredBuddies = [];
      for (const buddy of allBuddies) {
        const alreadyShown = await checkPromptAlreadyShown(buddy.buddy_user_id, buddy.challenge_id);
        if (!alreadyShown) {
          filteredBuddies.push(buddy);
        }
      }

      setPotentialBuddies(filteredBuddies);

      // Only show prompt if timing conditions are met
      if (shouldShowTeamUpPrompt()) {
        const topBuddy = filteredBuddies.find(buddy => buddy.shared_ranking_group);
        if (topBuddy && !currentPrompt) {
          setCurrentPrompt(topBuddy);
        }
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
          title: "🎉 Friend request sent to " + buddy.buddy_name.split(' ')[0] + "!",
          description: "Great choice! You'll make excellent accountability partners 💪",
        });
      } else {
        toast({
          title: "Already connected! 🤝",
          description: "You already have a pending or accepted friend request with this user.",
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
      // Register dismissal for timing control
      registerDismissal();

      // Record the dismissal
      await supabase.rpc('record_team_up_prompt_action', {
        buddy_user_id_param: buddy.buddy_user_id,
        challenge_id_param: buddy.challenge_id,
        action_param: 'dismissed'
      });

      // Hide current prompt and remove from list
      setCurrentPrompt(null);
      setPotentialBuddies(prev => prev.filter(b => b.buddy_user_id !== buddy.buddy_user_id));

      // Only show next prompt if timing conditions allow it
      if (shouldShowTeamUpPrompt()) {
        const nextBuddy = potentialBuddies.find(
          b => b.buddy_user_id !== buddy.buddy_user_id && b.shared_ranking_group
        );
        if (nextBuddy) {
          setCurrentPrompt(nextBuddy);
        }
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
    
    // Check for new potential buddies and timing constraints every 30 seconds
    const interval = setInterval(() => {
      // Only check if timing allows showing prompts
      if (shouldShowTeamUpPrompt()) {
        loadPotentialBuddies();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [shouldShowTeamUpPrompt]);

  // Separate effect to monitor timing changes and show/hide prompt accordingly
  useEffect(() => {
    if (!shouldShowTeamUpPrompt() && currentPrompt) {
      // Hide current prompt if timing no longer allows it
      setCurrentPrompt(null);
    } else if (shouldShowTeamUpPrompt() && !currentPrompt && potentialBuddies.length > 0) {
      // Show prompt if timing allows and we have available buddies
      const topBuddy = potentialBuddies.find(buddy => buddy.shared_ranking_group);
      if (topBuddy) {
        setCurrentPrompt(topBuddy);
      }
    }
  }, [shouldShowTeamUpPrompt, currentPrompt, potentialBuddies]);

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