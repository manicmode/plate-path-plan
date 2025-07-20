
import { useState, useEffect } from 'react';
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

  console.log('useHallOfFame initialized with:', { championUserId, year, userId: user?.id });

  // Fetch yearly trophies for champion
  const fetchTrophies = async () => {
    if (!championUserId) {
      console.log('Skipping trophy fetch - no championUserId');
      return;
    }

    try {
      console.log('Fetching trophies for champion:', championUserId, 'year:', year);
      
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

      console.log('Fetched badges data:', badges);

      const trophyData: Trophy[] = badges?.map(badge => ({
        id: badge.id,
        name: badge.badges?.title || 'Unknown Badge',
        icon: badge.badges?.icon || '🏆',
        rarity: (badge.badges?.rarity as 'common' | 'rare' | 'legendary') || 'common',
        description: badge.badges?.description || '',
        dateEarned: badge.unlocked_at,
        badgeType: badge.badges?.tracker_type || 'general'
      })) || [];

      console.log('Processed trophy data:', trophyData);
      setTrophies(trophyData);
    } catch (error) {
      console.error('Error fetching trophies:', error);
    }
  };

  // Fetch tributes for champion
  const fetchTributes = async () => {
    if (!championUserId) {
      console.log('Skipping tribute fetch - no championUserId');
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

      console.log('Fetched tributes data:', tributesData);

      // Then get user profiles separately
      const userIds = tributesData?.map(t => t.user_id) || [];
      console.log('Fetching profiles for user IDs:', userIds);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      console.log('Fetched profiles data:', profiles);

      const formattedTributes: Tribute[] = tributesData?.map(tribute => {
        const profile = profiles?.find(p => p.user_id === tribute.user_id);
        const authorName = profile ? 
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Anonymous' : 
          'Anonymous';
        
        // Parse reactions safely
        let reactions: { emoji: string; count: number; userReacted: boolean }[] = [];
        try {
          if (tribute.reactions && typeof tribute.reactions === 'object' && Array.isArray(tribute.reactions)) {
            reactions = tribute.reactions as { emoji: string; count: number; userReacted: boolean }[];
          }
        } catch (e) {
          console.error('Error parsing reactions for tribute:', tribute.id, e);
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

      console.log('Processed tribute data:', formattedTributes);
      setTributes(formattedTributes);
    } catch (error) {
      console.error('Error fetching tributes:', error);
    }
  };

  // Post new tribute
  const postTribute = async (message: string) => {
    if (!user || !championUserId || !message.trim()) {
      console.error('Cannot post tribute - missing requirements:', {
        hasUser: !!user,
        championUserId,
        hasMessage: !!message.trim()
      });
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
        console.error('Supabase error posting tribute:', error);
        throw error;
      }

      console.log('Tribute posted successfully:', data);

      toast({
        title: "Tribute Posted",
        description: "Your congratulatory message has been posted!",
      });

      // Immediately add the new tribute to the local state for instant feedback
      if (data && data[0]) {
        const newTribute: Tribute = {
          id: data[0].id,
          authorId: user.id,
          authorName: 'You',
          authorAvatar: 'Y',
          message: message.trim(),
          timestamp: data[0].created_at,
          reactions: [],
          isPinned: false
        };
        
        setTributes(prevTributes => [newTribute, ...prevTributes]);
      }

      // Also refresh tributes to get the proper author name
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
    if (!user) {
      console.error('Cannot handle reaction - no user');
      return;
    }

    try {
      console.log('Handling reaction:', { tributeId, emoji, userId: user.id });
      
      const tribute = tributes.find(t => t.id === tributeId);
      if (!tribute) {
        console.error('Tribute not found:', tributeId);
        return;
      }

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

      if (error) {
        console.error('Error updating reactions:', error);
        throw error;
      }

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
    if (!user || user.id !== championUserId) {
      console.error('Cannot pin tribute - unauthorized', { userId: user?.id, championUserId });
      return;
    }

    try {
      const tribute = tributes.find(t => t.id === tributeId);
      if (!tribute) {
        console.error('Tribute not found for pinning:', tributeId);
        return;
      }

      console.log('Pinning/unpinning tribute:', { tributeId, currentlyPinned: tribute.isPinned });

      const { error } = await supabase
        .from('hall_of_fame_tributes')
        .update({ is_pinned: !tribute.isPinned })
        .eq('id', tributeId);

      if (error) {
        console.error('Error pinning tribute:', error);
        throw error;
      }

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
      console.log('Loading Hall of Fame data...');
      setLoading(true);
      await Promise.all([fetchTrophies(), fetchTributes()]);
      setLoading(false);
      console.log('Hall of Fame data loading complete');
    };

    if (championUserId) {
      loadData();
    } else {
      console.log('No championUserId provided, skipping data load');
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
