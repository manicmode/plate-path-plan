import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { requireSession } from '@/lib/ensureAuth';
import { toast } from '@/hooks/use-toast';

export interface StripeStatus {
  connect_account_id: string | null;
  payouts_enabled: boolean;
  default_currency: string | null;
}

export const useStripeStatus = () => {
  return useQuery({
    queryKey: ['stripe-status'],
    queryFn: async (): Promise<StripeStatus> => {
      const user = await requireSession();
      
      const { data, error } = await supabase
        .from('influencer')
        .select('connect_account_id, payouts_enabled, default_currency')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching Stripe status:', error);
      }
      
      return data || {
        connect_account_id: null,
        payouts_enabled: false,
        default_currency: null,
      };
    },
  });
};

export const useCreateOnboardingLink = () => {
  return useMutation({
    mutationFn: async (): Promise<{ url: string }> => {
      const { data, error } = await supabase.functions.invoke('create-onboarding-link');
      
      if (error) {
        console.error('Error creating onboarding link:', error);
        throw new Error('Failed to create onboarding link');
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe onboarding
      window.open(data.url, '_blank');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create Stripe onboarding link. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useRefreshPayoutStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-payout-status');
      
      if (error) {
        console.error('Error refreshing payout status:', error);
        throw new Error('Failed to refresh payout status');
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch the Stripe status
      queryClient.invalidateQueries({ queryKey: ['stripe-status'] });
      toast({
        title: 'Success',
        description: 'Payout status refreshed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to refresh payout status. Please try again.',
        variant: 'destructive',
      });
    },
  });
};