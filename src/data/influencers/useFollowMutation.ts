import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useFollowMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ influencerId, isFollowing }: { influencerId: string; isFollowing: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to follow');

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('influencer_follow')
          .delete()
          .eq('influencer_id', influencerId)
          .eq('follower_id', user.id);
        
        if (error) throw error;
        return { action: 'unfollowed' };
      } else {
        // Follow
        const { error } = await supabase
          .from('influencer_follow')
          .insert({
            influencer_id: influencerId,
            follower_id: user.id,
          });
        
        if (error) throw error;
        return { action: 'followed' };
      }
    },
    onMutate: async ({ influencerId, isFollowing }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['influencer'] });
      await queryClient.cancelQueries({ queryKey: ['influencers'] });

      // Optimistically update influencer profile
      queryClient.setQueryData(['influencer', influencerId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isFollowing: !isFollowing,
          stats: {
            ...old.stats,
            totalFollowers: old.stats.totalFollowers + (isFollowing ? -1 : 1),
          },
          followerCount: old.followerCount + (isFollowing ? -1 : 1),
        };
      });

      // Optimistically update search results
      queryClient.setQueriesData({ queryKey: ['influencers'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((influencer: any) => 
              influencer.id === influencerId
                ? {
                    ...influencer,
                    isFollowing: !isFollowing,
                    followerCount: influencer.followerCount + (isFollowing ? -1 : 1),
                  }
                : influencer
            ),
          })),
        };
      });
    },
    onSuccess: (result) => {
      toast({
        title: result.action === 'followed' ? 'Following!' : 'Unfollowed',
        description: result.action === 'followed' ? 'You are now following this influencer.' : 'You have unfollowed this influencer.',
      });
    },
    onError: (error) => {
      // Revert optimistic updates
      queryClient.invalidateQueries({ queryKey: ['influencer'] });
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      
      toast({
        title: 'Error',
        description: 'Failed to update follow status. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['influencer'] });
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
    },
  });
}