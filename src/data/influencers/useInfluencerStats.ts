import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { requireSession } from '@/lib/ensureAuth';

export interface InfluencerStats {
  followers: number;
  views: number;
  engagement_rate: number;
  monthly_growth: number;
  last_30d_views: number[];
}

export const useInfluencerStats = () => {
  return useQuery({
    queryKey: ['influencer-stats'],
    queryFn: async (): Promise<InfluencerStats> => {
      const user = await requireSession();
      
      // For demo purposes, return mock data since we don't have these tables
      // In a real app, you would query your analytics tables here
      const mockStats: InfluencerStats = {
        followers: 2341,
        views: 45231,
        engagement_rate: 4.8,
        monthly_growth: 12,
        last_30d_views: [
          850, 920, 780, 1100, 950, 1200, 890,
          1050, 870, 980, 1150, 920, 1080, 750,
          990, 1250, 1100, 880, 1020, 940, 1180,
          850, 970, 1300, 1050, 820, 1150, 990,
          1280, 1400
        ]
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return mockStats;
    },
  });
};

export const useMonthlyRevenue = () => {
  return useQuery({
    queryKey: ['monthly-revenue'],
    queryFn: async () => {
      const user = await requireSession();
      
      // Mock revenue data for the last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const baseRevenue = 200 + Math.random() * 300;
        const dayOfWeek = (new Date().getDay() + i) % 7;
        // Higher revenue on weekends
        const weekendBonus = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1;
        return Math.round(baseRevenue * weekendBonus);
      });

      const thisMonthTotal = last30Days.reduce((sum, day) => sum + day, 0);
      const lastMonthTotal = thisMonthTotal * (0.8 + Math.random() * 0.4); // Random variation
      const growthPercentage = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;

      return {
        last30dRevenue: last30Days,
        thisMonthTotal: thisMonthTotal * 100, // Convert to cents
        lastMonthTotal: Math.round(lastMonthTotal * 100),
        growthPercentage: Math.round(growthPercentage * 10) / 10
      };
    },
  });
};