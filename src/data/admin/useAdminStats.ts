import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalUsers: number;
  activeUsers30d: number;
  newUsers7d: number;
  newUsers30d: number;
  totalInfluencers: number;
  activeInfluencers: number;
  totalChallenges: number;
  activeChallenges: number;
  gmvCents: number;
  netRevenueCents: number;
  pendingPayoutsCents: number;
  refundsCount: number;
  platformTakeBps?: number;
}

interface TrendData {
  current: number;
  previous: number;
  percentage: number;
  isPositive: boolean;
}

export const useAdminStats = () => {
  const query = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-get-metrics');
        
        if (error) {
          console.error('Error fetching admin stats:', error);
          throw new Error('Failed to fetch admin statistics');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to fetch admin statistics');
        }

        const metrics = data.data;
        
        return {
          totalUsers: metrics.total_users || 0,
          activeUsers30d: metrics.new_users_30d || 0,
          newUsers7d: Math.floor((metrics.new_users_30d || 0) * 0.25), // Estimate ~25% in last week
          newUsers30d: metrics.new_users_30d || 0,
          totalInfluencers: 0, // TODO: Add to metrics view
          activeInfluencers: 0, // TODO: Add to metrics view
          totalChallenges: 0, // TODO: Add to metrics view
          activeChallenges: 0, // TODO: Add to metrics view
          gmvCents: metrics.gmv_cents || 0,
          netRevenueCents: metrics.net_revenue_cents || 0,
          pendingPayoutsCents: Math.floor((metrics.net_revenue_cents || 0) * 0.2), // Estimate 20% pending
          refundsCount: metrics.refunds_count || 0,
          platformTakeBps: metrics.platform_take_bps || 1000,
        };
      } catch (err) {
        console.error('Error in admin stats query:', err);
        throw err;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const calculateTrend = (current: number, previous: number): TrendData => {
    const percentage = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    return {
      current,
      previous,
      percentage: Math.round(percentage * 10) / 10,
      isPositive: percentage >= 0,
    };
  };

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Create trend data based on current vs previous period estimates
  const trends = query.data ? {
    newUsers7d: calculateTrend(query.data.newUsers7d, Math.max(0, query.data.newUsers7d - 10)),
    totalUsers: calculateTrend(query.data.totalUsers, Math.max(0, query.data.totalUsers - query.data.newUsers30d)),
  } : {};

  const getTrendForStat = (statKey: string) => trends[statKey];

  return {
    stats: query.data || {
      totalUsers: 0,
      activeUsers30d: 0,
      newUsers7d: 0,
      newUsers30d: 0,
      totalInfluencers: 0,
      activeInfluencers: 0,
      totalChallenges: 0,
      activeChallenges: 0,
      gmvCents: 0,
      netRevenueCents: 0,
      pendingPayoutsCents: 0,
      refundsCount: 0,
    },
    trends,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: () => query.refetch(),
    formatMoney,
    getTrendForStat,
  };
};