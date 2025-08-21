import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to join challenge');

      // Check if challenge is published and not full
      const { data: challenge, error: challengeError } = await supabase
        .from('challenge')
        .select('id, title, published_at, max_participants')
        .eq('id', challengeId)
        .single();

      if (challengeError) throw challengeError;
      if (!challenge.published_at) throw new Error('Challenge is not published');

      // Join challenge (upsert to handle duplicates gracefully)
      const { error } = await supabase
        .from('challenge_join')
        .upsert(
          {
            challenge_id: challengeId,
            user_id: user.id,
          },
          {
            onConflict: 'challenge_id,user_id',
            ignoreDuplicates: true,
          }
        );

      if (error) {
        // Handle specific error messages
        if (error.message.includes('Challenge is full')) {
          throw new Error('This challenge is full and no longer accepting participants.');
        }
        throw error;
      }

      return { challengeTitle: challenge.title };
    },
    onSuccess: (result) => {
      toast({
        title: 'Joined Challenge!',
        description: `You have successfully joined "${result.challengeTitle}".`,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join challenge';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Invalidate relevant queries to refresh challenge data
      queryClient.invalidateQueries({ queryKey: ['influencer'] });
    },
  });
}