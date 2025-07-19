import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  user_id: string;
  username: string;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  current_nutrition_streak: number;
  current_hydration_streak: number;
  current_supplement_streak: number;
}

interface PendingRequest {
  request_id: string;
  requester_id: string;
  requested_id: string;
  requester_name: string;
  requested_name: string;
  requester_email: string;
  requested_email: string;
  created_at: string;
  status: string;
  direction: 'incoming' | 'outgoing';
}

export const useFriendSearch = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const { toast } = useToast();

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_users_by_username_email', {
        search_term: searchTerm
      });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search failed",
        description: "Unable to search for users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const loadPendingRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_friend_requests');
      
      if (error) throw error;
      setPendingRequests((data || []) as PendingRequest[]);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      toast({
        title: "Failed to load requests",
        description: "Unable to load pending friend requests.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        target_user_id: userId
      });

      if (error) throw error;
      
      if (data) {
        toast({
          title: "Friend request sent",
          description: "Your friend request has been sent successfully.",
        });
        
        // Refresh the data
        loadPendingRequests();
        // Remove from search results
        setSearchResults(prev => prev.filter(user => user.user_id !== userId));
      } else {
        toast({
          title: "Request failed",
          description: "Friend request already exists or failed to send.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Request failed",
        description: "Unable to send friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) throw error;
      
      if (data) {
        toast({
          title: "Friend request accepted",
          description: "You are now friends!",
        });
        loadPendingRequests();
      } else {
        toast({
          title: "Failed to accept",
          description: "Unable to accept friend request.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Failed to accept",
        description: "Unable to accept friend request.",
        variant: "destructive",
      });
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('reject_friend_request', {
        request_id: requestId
      });

      if (error) throw error;
      
      if (data) {
        toast({
          title: "Friend request rejected",
          description: "The friend request has been rejected.",
        });
        loadPendingRequests();
      } else {
        toast({
          title: "Failed to reject",
          description: "Unable to reject friend request.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast({
        title: "Failed to reject",
        description: "Unable to reject friend request.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadPendingRequests();
  }, []);

  return {
    searchResults,
    pendingRequests,
    isSearching,
    isLoadingRequests,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    refreshRequests: loadPendingRequests,
  };
};