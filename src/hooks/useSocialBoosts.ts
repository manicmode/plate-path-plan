import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';

interface SocialBoostFunctions {
  handleFriendRequestSent: (friendId: string, friendName: string) => Promise<void>;
  handleFriendRequestAccepted: (friendId: string, friendName: string) => Promise<{ showModal: boolean; friendName?: string; friendId?: string }>;
  showTrendingChallengeToast: (challengeName: string, friendCount: number) => void;
  showMomentumBoostToast: (friendName: string) => void;
  showDailyMotivationToast: (friendName: string) => void;
}

export const useSocialBoosts = (): SocialBoostFunctions => {
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

      // Check for trending challenges and suggest one
      setTimeout(() => {
        showTrendingChallengeToast("7-Day Clean Eating", 3);
      }, 3000);

    } catch (error) {
      console.error('Error handling friend request sent:', error);
    }
  };

  // Track friend request accepted - return modal data and send challenge suggestions
  const handleFriendRequestAccepted = async (friendId: string, friendName: string) => {
    try {
      // Send challenge suggestions to both parties
      setTimeout(() => {
        toast({
          title: "🎯 Perfect Timing!",
          description: `You and ${friendName} are now friends! Ready to start a challenge together?`,
          duration: 8000,
        });
      }, 2000);

      // Suggest trending challenges
      setTimeout(() => {
        showTrendingChallengeToast("7-Day Clean Eating", 3);
      }, 5000);

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

  // Show trending challenge suggestion
  const showTrendingChallengeToast = (challengeName: string, friendCount: number) => {
    toast({
      title: `🔥 '${challengeName}' challenge has ${friendCount} friends in it already`,
      description: "Join them and make it even more fun!",
      duration: 8000,
    });
  };

  // Show momentum boost message
  const showMomentumBoostToast = (friendName: string) => {
    toast({
      title: "🔥 Keep the momentum going!",
      description: `You and ${friendName} both crushed a challenge recently. Ready to try another one together?`,
      duration: 8000,
    });
  };

  // Show daily motivation
  const showDailyMotivationToast = (friendName: string) => {
    toast({
      title: `🌟 You and ${friendName} are both on fire this week!`,
      description: "Ready to crush something together again?",
      duration: 8000,
    });
  };

  return {
    handleFriendRequestSent,
    handleFriendRequestAccepted,
    showTrendingChallengeToast,
    showMomentumBoostToast,
    showDailyMotivationToast,
  };
};