import { useState, useEffect } from 'react';
import { getDisplayName } from '@/lib/displayName';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

export interface Trophy {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
  description: string;
  dateEarned: string;
  badgeType: string;
}

export interface Tribute {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  message: string;
  timestamp: string;
  reactions: { emoji: string; count: number; userReacted: boolean }[];
  isPinned?: boolean;
}

export const useHallOfFame = (championUserId?: string, year: number = new Date().getFullYear()) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [tributes, setTributes] = useState<Tribute[]>([]);
  const [loading, setLoading] = useState(true);

  // Debug logging
  console.log('useHallOfFame called with:', { championUserId, year });

  // Fetch yearly trophies for champion
  const fetchTrophies = async () => {
    if (!championUserId) {
      console.log('No championUserId provided, skipping trophy fetch');
      return;
    }

    try {
      console.log('Fetching trophies for user:', championUserId);
      const { data: badges, error } = await supabase
        .from('user_badges')
        .select(`
          id,
          unlocked_at,
          badges (
            id,
            name,
            title,
            description,
            icon,
            rarity,
            tracker_type
          )
        `)
        .eq('user_id', championUserId)
        .gte('unlocked_at', `${year}-01-01`)
        .lt('unlocked_at', `${year + 1}-01-01`)
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.error('Error fetching trophies:', error);
        throw error;
      }

      console.log('Fetched badges:', badges);

      const trophyData: Trophy[] = badges?.map(badge => ({
        id: badge.id,
        name: badge.badges?.title || 'Unknown Badge',
        icon: badge.badges?.icon || '🏆',
        rarity: (badge.badges?.rarity as 'common' | 'rare' | 'legendary') || 'common',
        description: badge.badges?.description || '',
        dateEarned: badge.unlocked_at,
        badgeType: badge.badges?.tracker_type || 'general'
      })) || [];

      setTrophies(trophyData);
    } catch (error) {
      console.error('Error fetching trophies:', error);
    }
  };

  // Fetch tributes for champion
  const fetchTributes = async () => {
    if (!championUserId) {
      console.log('No championUserId provided, skipping tributes fetch');
      return;
    }

    try {
      console.log('Fetching tributes for champion:', championUserId, 'year:', year);
      // First get tributes
      const { data: tributesData, error } = await supabase
        .from('hall_of_fame_tributes')
        .select(`
          id,
          user_id,
          message,
          is_pinned,
          reactions,
          created_at
        `)
        .eq('champion_user_id', championUserId)
        .eq('champion_year', year)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tributes:', error);
        throw error;
      }

      console.log('Fetched tributes:', tributesData);

      // Then get user profiles separately
      const userIds = tributesData?.map(t => t.user_id) || [];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      console.log('Fetched profiles:', profiles);

      const formattedTributes: Tribute[] = tributesData?.map(tribute => {
        const profile = profiles?.find(p => p.user_id === tribute.user_id);
        const authorName = profile ? getDisplayName({
          first_name: profile.first_name
        }) : 'Anonymous';
        
        // Parse reactions safely
        let reactions: { emoji: string; count: number; userReacted: boolean }[] = [];
        try {
          if (tribute.reactions && typeof tribute.reactions === 'object' && Array.isArray(tribute.reactions)) {
            reactions = tribute.reactions as { emoji: string; count: number; userReacted: boolean }[];
          }
        } catch (e) {
          reactions = [];
        }
        
        return {
          id: tribute.id,
          authorId: tribute.user_id,
          authorName,
          authorAvatar: authorName.charAt(0).toUpperCase(),
          message: tribute.message,
          timestamp: tribute.created_at,
          reactions,
          isPinned: tribute.is_pinned
        };
      }) || [];

      console.log('Formatted tributes:', formattedTributes);
      setTributes(formattedTributes);
    } catch (error) {
      console.error('Error fetching tributes:', error);
    }
  };

  // Post new tribute
  const postTribute = async (message: string) => {
    if (!user || !championUserId || !message.trim()) {
      console.warn('Cannot post tribute:', { user: !!user, championUserId, message: message.trim() });
      return false;
    }

    try {
      console.log('Posting tribute:', {
        user_id: user.id,
        champion_user_id: championUserId,
        champion_year: year,
        message: message.trim()
      });

      const { data, error } = await supabase
        .from('hall_of_fame_tributes')
        .insert({
          user_id: user.id,
          champion_user_id: championUserId,
          champion_year: year,
          message: message.trim(),
          reactions: []
        })
        .select();

      if (error) {
        console.error('Error posting tribute:', error);
        throw error;
      }

      console.log('Successfully posted tribute:', data);

      toast({
        title: "Tribute Posted",
        description: "Your congratulatory message has been posted!",
      });

      // Refresh tributes
      await fetchTributes();
      return true;
    } catch (error) {
      console.error('Error posting tribute:', error);
      toast({
        title: "Error",
        description: "Failed to post tribute. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Handle reactions
  const handleReaction = async (tributeId: string, emoji: string) => {
    if (!user) return;

    try {
      const tribute = tributes.find(t => t.id === tributeId);
      if (!tribute) return;

      let updatedReactions = [...(tribute.reactions || [])];
      const existingReactionIndex = updatedReactions.findIndex(r => r.emoji === emoji);

      if (existingReactionIndex >= 0) {
        // Toggle existing reaction
        const reaction = updatedReactions[existingReactionIndex];
        if (reaction.userReacted) {
          reaction.count = Math.max(0, reaction.count - 1);
          reaction.userReacted = false;
          if (reaction.count === 0) {
            updatedReactions.splice(existingReactionIndex, 1);
          }
        } else {
          reaction.count += 1;
          reaction.userReacted = true;
        }
      } else {
        // Add new reaction
        updatedReactions.push({
          emoji,
          count: 1,
          userReacted: true
        });
      }

      const { error } = await supabase
        .from('hall_of_fame_tributes')
        .update({ reactions: updatedReactions })
        .eq('id', tributeId);

      if (error) throw error;

      // Update local state
      setTributes(prevTributes =>
        prevTributes.map(t =>
          t.id === tributeId ? { ...t, reactions: updatedReactions } : t
        )
      );
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  // Pin/unpin tribute (only for champion)
  const handlePinTribute = async (tributeId: string) => {
    if (!user || user.id !== championUserId) return;

    try {
      const tribute = tributes.find(t => t.id === tributeId);
      if (!tribute) return;

      const { error } = await supabase
        .from('hall_of_fame_tributes')
        .update({ is_pinned: !tribute.isPinned })
        .eq('id', tributeId);

      if (error) throw error;

      toast({
        title: tribute.isPinned ? "Tribute Unpinned" : "Tribute Pinned",
        description: tribute.isPinned ? "Tribute has been unpinned" : "Tribute has been pinned to the top",
      });

      // Refresh tributes to get updated order
      await fetchTributes();
    } catch (error) {
      console.error('Error pinning tribute:', error);
      toast({
        title: "Error",
        description: "Failed to update pin status",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTrophies(), fetchTributes()]);
      setLoading(false);
    };

    if (championUserId) {
      console.log('Loading data for champion:', championUserId);
      loadData();
    } else {
      console.log('No championUserId, skipping data load');
      setLoading(false);
    }
  }, [championUserId, year]);

  return {
    trophies,
    tributes,
    loading,
    postTribute,
    handleReaction,
    handlePinTribute,
    refreshData: () => Promise.all([fetchTrophies(), fetchTributes()])
  };
};
