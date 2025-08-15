import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare, Megaphone, Wifi, WifiOff, Smile, MoreHorizontal, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useArenaMembership } from '@/hooks/arena/useRank20Members';

interface Announcement {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string | null;
  avatar_url?: string | null;
  pending?: boolean;
  error?: boolean;
  clientId?: string;
}

interface ArenaBillboardChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  privateChallengeId?: string | null;
}

export default function ArenaBillboardChatPanel({ isOpen, onClose, privateChallengeId }: ArenaBillboardChatPanelProps) {
  const { toast } = useToast();
  // Arena membership check
  const { data: membership, isLoading: membershipLoading, isError: membershipError } = useArenaMembership();
  const { members = [], groupId, isInArena = false } = membership || {};
  
  // Anti-flicker logic
  const [openedAt] = useState(() => Date.now());
  const hasEverBeenInArena = useRef(false);
  useEffect(() => { 
    if (isInArena) hasEverBeenInArena.current = true; 
  }, [isInArena]);

  const withinGrace = Date.now() - openedAt < 600; // 600ms grace period
  const showEmpty = !membershipLoading && !isInArena && !withinGrace && !hasEverBeenInArena.current;
  
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [lastAnnouncementId, setLastAnnouncementId] = useState<string | null>(null);
  const [showNewGlow, setShowNewGlow] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [session, setSession] = useState<any>(null);
  
  // --- emoji strip state ---
  const [showEmojiStrip, setShowEmojiStrip] = useState(() => {
    return localStorage.getItem('arena-emoji-strip-visible') !== 'false';
  });
  const [emojiTapCount, setEmojiTapCount] = useState(0);
  const [emojiTapResetTimer, setEmojiTapResetTimer] = useState<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // --- scrolling refs/state ---
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<any>(null);
  const announcementChannelRef = useRef<any>(null);
  const backfillTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const BOTTOM_THRESHOLD = 60; // px
  
  // User cache for display names and avatars
  const userCache = useRef(new Map<string, {display_name?: string|null; avatar_url?: string|null}>());

  // ===== Reactions state =====
  type ReactionCount = { message_id: string; emoji: string; count: number };

  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const visibleMessageIdsRef = useRef<Set<string>>(new Set());


  // Merge helper
  function mergeReactions(rows: ReactionCount[]) {
    const byMsg: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      (byMsg[r.message_id] ??= {})[r.emoji] = Number(r.count);
    }
    setReactions(prev => ({ ...prev, ...byMsg }));
  }

  // Fetch counts for a list of message IDs
  async function loadReactionsFor(ids: string[]) {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (!unique.length) return;
    const { data, error } = await supabase.rpc('my_rank20_reactions_for', { _message_ids: unique });
    if (error) {
      console.error('[reactions] fetch error', error);
      return;
    }
    mergeReactions((data ?? []) as ReactionCount[]);
  }

  // Toggle reaction (optimistic)
  async function toggleReaction(messageId: string, emoji: string) {
    if (!messageId) return;
    // optimistic change
    setReactions(prev => {
      const m = { ...(prev[messageId] ?? {}) };
      m[emoji] = (m[emoji] ?? 0) + 1;
      return { ...prev, [messageId]: m };
    });
    const { error } = await supabase.rpc('my_rank20_react_toggle', {
      _message_id: messageId,
      _emoji: emoji,
    });
    if (error) {
      // revert optimistic change
      setReactions(prev => {
        const m = { ...(prev[messageId] ?? {}) };
        m[emoji] = Math.max(0, (m[emoji] ?? 1) - 1);
        if (m[emoji] === 0) delete m[emoji];
        return { ...prev, [messageId]: m };
      });
      console.error('[reactions] toggle error', error);
    }
  }

  // Emoji set for text input
  const EMOJI_SET = ['😀', '😂', '🥳', '🙌', '👍', '👎', '💯', '🔥', '💧', '🧠', '❤️‍🔥', '🏆', '🚀', '🌟', '😴'];

  // Dev diagnostics
  useEffect(() => {
    if (isOpen && !membershipLoading && process.env.NODE_ENV !== 'production') {
      console.info('[ArenaBillboard] Opened:', {
        groupId,
        memberCount: members.length,
        isInArena,
        chatRows: chatMessages.length,
        finalDecision: showEmpty ? 'empty' : 'content'
      });
    }
  }, [isOpen, membershipLoading, groupId, members.length, isInArena, showEmpty, chatMessages.length]);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
      setSession(session);
    };
    checkAuth();
  }, []);

  // Load initial data and setup realtime when panel opens
  useEffect(() => {
    if (isOpen && isAuthenticated && isInArena) {
      // Guarantee auto-enrollment before anything else
      const initializeArena = async () => {
        try {
          const logRpc = (name: string, err: any) => console.error('[RPC]', name, {
            code: err?.code, message: err?.message, details: err?.details, hint: err?.hint
          });

          await supabase.rpc('ensure_rank20_membership');
          console.info('[ArenaBillboard] open', { isInArena, groupId, challengeId });
          loadInitialData();
        } catch (error) {
          console.error('[ArenaBillboard] auto-enrollment failed:', error);
        }
      };
      
      initializeArena();
      
      // Telemetry
      if (process.env.NODE_ENV !== 'production') {
        console.info('arena_billboard_opened');
      }
    } else if (!isOpen) {
      // Cleanup when panel closes
      cleanupRealtimeSubscriptions();
    }
  }, [isOpen, isAuthenticated, isInArena, groupId, challengeId]);

  // Realtime subscription to reaction changes
  useEffect(() => {
    const channel = supabase
      .channel('r20-reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rank20_chat_reactions' }, (payload) => {
        const row = (payload.new ?? payload.old) as { message_id?: string; emoji?: string };
        const messageId = row?.message_id;
        const emoji = row?.emoji;
        if (!messageId || !emoji) return;
        // Update only if the message is on screen / known
        if (!visibleMessageIdsRef.current.has(messageId)) return;

        setReactions(prev => {
          const m = { ...(prev[messageId] ?? {}) };
          const delta = payload.eventType === 'INSERT' ? 1 : -1;
          m[emoji] = Math.max(0, (m[emoji] ?? 0) + delta);
          if (m[emoji] === 0) delete m[emoji];
          return { ...prev, [messageId]: m };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Keep visibleMessageIdsRef updated
  useEffect(() => {
    const ids = chatMessages.filter((m) => !!m.id && !m.pending).map((m) => m.id as string);
    visibleMessageIdsRef.current = new Set(ids);
  }, [chatMessages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRealtimeSubscriptions();
    };
  }, []);

  // Realtime functions
  const cleanupRealtimeSubscriptions = useCallback(() => {
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }
    if (announcementChannelRef.current) {
      supabase.removeChannel(announcementChannelRef.current);
      announcementChannelRef.current = null;
    }
    if (backfillTimerRef.current) {
      clearInterval(backfillTimerRef.current);
      backfillTimerRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  const setupRealtimeSubscriptions = useCallback((challengeId: string, groupId?: string) => {
    if (!challengeId) return;
    
    // Dev logging for realtime setup
    if (process.env.NODE_ENV !== 'production') {
      console.info('[Arena] Setting up realtime subscriptions:', {
        challengeId,
        groupId,
        isInArena,
        chatRows: chatMessages.length,
        members: members.length
      });
    }
    
    // Setup chat channel - use groupId for consistent subscription across accounts
    const chatTopic = `rank20-chat:${groupId}`;
    const chatChannel = supabase
      .channel(chatTopic)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'rank20_chat_messages', 
          filter: `challenge_id=eq.${challengeId}` 
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          onChatInsertFromRealtime(row);
          
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_message_received', { messageId: row.id });
          }
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[RT] chat status', status);
        }
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_subscribed', { kind: 'chat' });
          }
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_dropped', { reason: 'channel_error', kind: 'chat' });
          }
        }
      });

    chatChannelRef.current = chatChannel;

    // Setup announcement channel - use groupId for consistent subscription across accounts
    const announcementTopic = `rank20-ann:${groupId}`;
    const announcementChannel = supabase
      .channel(announcementTopic)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'rank20_billboard_messages', 
          filter: `challenge_id=eq.${challengeId}` 
        },
        (payload) => {
          const row = payload.new as Announcement;
          onAnnouncementInsertFromRealtime(row);
          
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_announcement_received', { announcementId: row.id });
          }
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[RT] announcement status', status);
        }
        
        if (status === 'SUBSCRIBED') {
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_subscribed', { kind: 'announcement' });
          }
        } else if (status === 'CHANNEL_ERROR') {
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_dropped', { reason: 'channel_error', kind: 'announcement' });
          }
        }
      });

    announcementChannelRef.current = announcementChannel;

    // Setup backfill timer
    backfillTimerRef.current = setInterval(() => {
      if (connectionStatus !== 'connected') {
        backfillMessages();
      }
    }, 45000); // 45 seconds
  }, [connectionStatus, isInArena, chatMessages.length, members.length]);

  const onChatInsertFromRealtime = useCallback(async (row: ChatMessage) => {
    // Enrich with user info from cache or fetch if missing
    let meta = userCache.current.get(row.user_id);
    if (!meta) {
      try {
        const { data } = await supabase.from('user_profiles').select('first_name, last_name, avatar_url').eq('user_id', row.user_id).maybeSingle();
        const displayName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() || null : null;
        meta = { display_name: displayName, avatar_url: data?.avatar_url };
        userCache.current.set(row.user_id, meta);
      } catch (error) {
        // Fallback if profile fetch fails
        meta = { display_name: null, avatar_url: null };
        userCache.current.set(row.user_id, meta);
      }
    }
    
    const enrichedRow: ChatMessage = { 
      ...row, 
      display_name: meta?.display_name, 
      avatar_url: meta?.avatar_url 
    };

    setChatMessages(prev => {
      // Try to find a pending temp match (same user, same body, within 3s)
      const match = prev.find(msg => 
        msg.pending && 
        msg.user_id === enrichedRow.user_id && 
        msg.body === enrichedRow.body &&
        Math.abs(new Date(msg.created_at).getTime() - new Date(enrichedRow.created_at).getTime()) < 3000
      );
      
      if (match) {
        // Replace temp message with server row
        const updated = prev.map(msg => 
          msg.id === match.id 
            ? { ...enrichedRow, pending: false, error: false }
            : msg
        );
        
        // Load reactions for the newly confirmed message
        if (enrichedRow.id) {
          visibleMessageIdsRef.current.add(enrichedRow.id);
          loadReactionsFor([enrichedRow.id]);
        }
        
        return updated;
      } else {
        // Add new message if not duplicate and sort ASC
        const exists = prev.find(msg => msg.id === enrichedRow.id);
        if (!exists) {
          const next = [...prev, { ...enrichedRow, pending: false }];
          next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          // Load reactions for the new message
          if (enrichedRow.id) {
            visibleMessageIdsRef.current.add(enrichedRow.id);
            loadReactionsFor([enrichedRow.id]);
          }
          
          return next;
        }
        return prev;
      }
    });
  }, []);

  const onAnnouncementInsertFromRealtime = useCallback((row: Announcement) => {
    setAnnouncement(current => {
      // Only replace if this announcement is newer
      if (!current || new Date(row.created_at) > new Date(current.created_at)) {
        // Check if this is a new announcement (different from last seen)
        if (lastAnnouncementId !== row.id) {
          setShowNewGlow(true);
          setLastAnnouncementId(row.id);
          // Hide glow after animation
          setTimeout(() => setShowNewGlow(false), 1500);
        }
        return row;
      }
      return current;
    });
  }, [lastAnnouncementId]);

  const backfillMessages = useCallback(async () => {
    try {
      const { data: recentData } = await supabase.rpc('my_rank20_chat_list', { 
        _limit: 10,
        _before_created_at: null,
        _before_id: null
      });
      
      if (recentData) {
        const reversedRecent = recentData.reverse();
        setChatMessages(prev => {
          const combined = [...prev];
          reversedRecent.forEach(msg => {
            if (!combined.find(existing => existing.id === msg.id)) {
              combined.push(msg);
            }
          });
          return combined;
        });
      }
    } catch (error) {
      console.error('Error during backfill:', error);
    }
  }, []);

  const loadInitialData = async () => {
    // Ensure authenticated session before any RPC calls
    const { data: sessionRes } = await supabase.auth.getSession();
    if (!sessionRes?.session) {
      console.info('No authenticated session, skipping arena data load');
      setIsLoading(false);
      return;
    }

    // Only load data if user is in arena
    if (!isInArena) {
      console.info('User not in arena, skipping data load');
      return;
    }
    
    setIsLoading(true);
    
    const logRpc = (name: string, err: any) => console.error('[RPC]', name, {
      code: err?.code, message: err?.message, details: err?.details, hint: err?.hint
    });
    
    try {
      // First ensure rank20 membership before other calls
      await supabase.rpc('ensure_rank20_membership');
      // Use provided privateChallengeId or fallback to RPC
      let challengeIdData = privateChallengeId;
      
      if (!challengeIdData) {
        // Use new helper for challenge resolution
        const { data: cidData, error: cidErr } = await supabase.rpc('my_rank20_chosen_challenge_id');
        if (cidErr) {
          logRpc('my_rank20_chosen_challenge_id', cidErr);
        }
        if (cidErr || !cidData?.[0]) {
          console.info('User not in rank20 challenge');
          setIsLoading(false);
          return;
        }
        challengeIdData = cidData[0].private_challenge_id;
      }

      setChallengeId(challengeIdData);
      console.info('[ArenaBillboard] channel', challengeIdData);

      // Load latest announcement
      const { data: announcementData, error: announcementError } = await supabase.rpc('my_rank20_latest_announcement');
      if (announcementError) {
        console.error('Error loading announcement:', announcementError);
      } else {
        const firstAnnouncement = announcementData?.[0] || null;
        setAnnouncement(firstAnnouncement);
        // Set initial announcement ID without triggering glow
        if (firstAnnouncement) {
          setLastAnnouncementId(firstAnnouncement.id);
        }
      }

      // Load initial chat messages with improved pagination
      const { data: chatData, error: chatError } = await supabase.rpc('my_rank20_chat_list', { 
        _limit: 50,
        _before_created_at: null,
        _before_id: null
      });
      if (chatError) {
        console.error('Error loading chat:', chatError);
      } else {
        const reversedMessages = (chatData || []).reverse();
        setChatMessages(reversedMessages);
        setHasMore((chatData || []).length === 50);
        setInitialLoadDone(true);
        
        // Build user cache from initial data
        reversedMessages.forEach((m: ChatMessage) => {
          if (!userCache.current.has(m.user_id)) {
            userCache.current.set(m.user_id, { 
              display_name: m.display_name, 
              avatar_url: m.avatar_url 
            });
          }
        });

        // After initial message load:
        const initialIds = reversedMessages.filter((m) => !!m.id).map((m) => m.id as string);
        visibleMessageIdsRef.current = new Set(initialIds);
        loadReactionsFor(initialIds);
      }

      // Setup realtime subscriptions
      setupRealtimeSubscriptions(challengeIdData, groupId);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOlderWithCursor = async (beforeCreatedAt: string, beforeId: string) => {
    if (loadingOlder) return;
    
    setLoadingOlder(true);
    const el = scrollAreaRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    const { data, error } = await supabase.rpc('my_rank20_chat_list', {
      _limit: 50,
      _before_created_at: beforeCreatedAt,
      _before_id: beforeId
    });
    setLoadingOlder(false);
    
    if (error || !data) {
      console.error('Error loading older messages:', error);
      return;
    }

    // data comes DESC; prepend as ASC
    const toPrepend = [...data].reverse();
    
    setChatMessages(prev => {
      const merged = [...toPrepend, ...prev];
      
      // Update user cache with any new user info
      toPrepend.forEach((m: ChatMessage) => {
        if (!userCache.current.has(m.user_id)) {
          userCache.current.set(m.user_id, { 
            display_name: m.display_name, 
            avatar_url: m.avatar_url 
          });
        }
      });
      
      // dedupe by id
      const seen = new Set<string>();
      return merged.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
    });

    setHasMore((data || []).length === 50);

    const olderIds = toPrepend.filter((m) => !!m.id).map((m) => m.id as string);
    olderIds.forEach((id) => visibleMessageIdsRef.current.add(id));
    loadReactionsFor(olderIds);

    // keep the user anchored where they were reading
    requestAnimationFrame(() => {
      const el2 = scrollAreaRef.current;
      if (!el2) return;
      const diff = el2.scrollHeight - prevScrollHeight;
      el2.scrollTop = (el2.scrollTop ?? 0) + diff;
    });
  };

  const retryMessage = useCallback(async (messageId: string) => {
    const message = chatMessages.find(msg => msg.id === messageId);
    if (!message || !message.body) return;

    // Mark as pending
    setChatMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, pending: true, error: false }
          : msg
      )
    );

    try {
      const { error } = await supabase.rpc('arena_post_message', { p_content: message.body });
      
      if (error) {
        console.error('[arena_post_message] retry failed', {
          code: error.code,
          message: error.message,   // will include "arena_post_message failed [SQLSTATE]: SQLERRM"
          details: error.details,
          hint: error.hint,
        });
        
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, pending: false, error: true }
              : msg
          )
        );
        toast({ 
          title: "Error", 
          description: error.message || "Failed to retry message", 
          variant: "destructive" 
        });
      }
      // Success will be handled by realtime insert
    } catch (error) {
      console.error('[arena_post_message] retry error:', error);
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, pending: false, error: true }
            : msg
        )
      );
      toast({ title: "Error", description: "Failed to retry message", variant: "destructive" });
    }
  }, [chatMessages]);

  const sendMessage = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || isSending || !session?.user) return;

    // Verify authenticated session before sending
    const { data: sessionRes } = await supabase.auth.getSession();
    if (!sessionRes?.session) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }

    // Client-side length validation (2000 chars max)
    if (trimmedMessage.length > 2000) {
      toast({ title: "Error", description: "Message too long (max 2000 characters)", variant: "destructive" });
      return;
    }

    setIsSending(true);
    
    // Optimistic update - add temp message immediately
    const clientId = crypto.randomUUID();
    
    // Get display name from current user's cached profile or session
    const currentUserMeta = userCache.current.get(session.user.id);
    const currentUserDisplayName = currentUserMeta?.display_name || 
                                   session.user.user_metadata?.display_name || 
                                   session.user.user_metadata?.full_name ||
                                   session.user.user_metadata?.name ||
                                   `User ${session.user.id.slice(-6)}`;
    
    const tempMessage: ChatMessage = {
      id: clientId,
      user_id: session.user.id,
      body: trimmedMessage,
      created_at: new Date().toISOString(),
      display_name: currentUserDisplayName,
      avatar_url: currentUserMeta?.avatar_url || session.user.user_metadata?.avatar_url || null,
      pending: true,
      clientId
    };

    setChatMessages(prev => {
      const next = [...prev, tempMessage];
      next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return next;
    });
    setNewMessage('');

    // if user was at bottom, keep them at bottom
    if (atBottom) {
      requestAnimationFrame(() => scrollToBottom(true));
    }

    // Telemetry
    if (process.env.NODE_ENV !== 'production') {
      console.info('arena_chat_optimistic_sent', { length: trimmedMessage.length });
    }

    try {
      const { data: messageId, error } = await supabase.rpc('arena_post_message', { p_content: trimmedMessage });
      
      if (error) {
        console.error('[arena_post_message] failed', { 
          code: error.code, 
          message: error.message, 
          details: error.details, 
          hint: error.hint 
        });
        
        // Mark message as error for retry
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === clientId 
              ? { ...msg, pending: false, error: true }
              : msg
          )
        );
        
        // Show user-friendly error with toast
        toast({ title: "Error", description: error.message || 'Failed to send message', variant: "destructive" });
        
        // Telemetry
        if (process.env.NODE_ENV !== 'production') {
          console.info('arena_chat_optimistic_fail', { error: error.message });
        }
        
        return;
      }

      // Telemetry
      if (process.env.NODE_ENV !== 'production') {
        console.info('arena_chat_message_sent', { length: trimmedMessage.length });
      }

      // Success - realtime will handle replacing the temp message
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark message as error for retry
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === clientId 
            ? { ...msg, pending: false, error: true }
            : msg
        )
      );
      
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      
      // Telemetry
      if (process.env.NODE_ENV !== 'production') {
        console.info('arena_chat_optimistic_fail', { error: 'network_error' });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    
    // near bottom?
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
    setAtBottom(nearBottom);
    
    // load older when near top
    if (el.scrollTop <= 24 && !loadingOlder && chatMessages.length > 0) {
      const oldest = chatMessages[0];
      if (oldest) {
        void loadOlderWithCursor(oldest.created_at, oldest.id);
      }
    }
  };

  const scrollToBottom = (smooth = true) => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  // after initial load finishes
  useEffect(() => {
    // only once after first load
    if (initialLoadDone && chatMessages.length > 0) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoadDone]);

  // when messages change: if user is at bottom, follow new messages
  useEffect(() => {
    if (atBottom && chatMessages.length > 0) {
      scrollToBottom(true);
    }
  }, [chatMessages.length, atBottom]);

  // Emoji strip functions
  const toggleEmojiStrip = useCallback(() => {
    const newState = !showEmojiStrip;
    setShowEmojiStrip(newState);
    localStorage.setItem('arena-emoji-strip-visible', String(newState));
    
    // Telemetry
    if (process.env.NODE_ENV !== 'production') {
      if (newState) {
        console.info('arena_emoji_strip_shown');
      } else {
        console.info('arena_emoji_strip_hidden');
      }
    }
  }, [showEmojiStrip]);

  const handleEmojiTap = useCallback((emoji: string) => {
    // Spam protection: max 10 emoji taps per 5s
    if (emojiTapCount >= 10) {
      toast({ title: "Slow down", description: "Slow down with the emojis! 😅", variant: "destructive" });
      return;
    }

    // Update spam counter
    setEmojiTapCount(prev => prev + 1);
    
    // Clear existing timer and set new one
    if (emojiTapResetTimer) {
      clearTimeout(emojiTapResetTimer);
    }
    const timer = setTimeout(() => {
      setEmojiTapCount(0);
    }, 5000);
    setEmojiTapResetTimer(timer);

    // Insert emoji at cursor position
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? newMessage.length;
    const end = input.selectionEnd ?? newMessage.length;
    const beforeCursor = newMessage.slice(0, start);
    const afterCursor = newMessage.slice(end);
    const newText = beforeCursor + emoji + afterCursor;

    // Check length limit
    if (newText.length > 2000) {
      toast({ title: "Error", description: "Message too long (max 2000 characters)", variant: "destructive" });
      return;
    }

    setNewMessage(newText);

    // Restore cursor position after emoji
    requestAnimationFrame(() => {
      const newCursorPos = start + emoji.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.focus();
    });

    // Telemetry
    if (process.env.NODE_ENV !== 'production') {
      console.info('arena_emoji_tapped', { emoji });
    }
  }, [newMessage, emojiTapCount, emojiTapResetTimer]);

  const handleEmojiLongPress = useCallback(() => {
    // Open OS emoji picker by temporarily creating an input with emoji picker
    const hiddenInput = document.createElement('input');
    hiddenInput.style.position = 'absolute';
    hiddenInput.style.left = '-9999px';
    hiddenInput.style.opacity = '0';
    hiddenInput.setAttribute('inputmode', 'none');
    document.body.appendChild(hiddenInput);
    
    // Focus and trigger emoji picker
    hiddenInput.focus();
    hiddenInput.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(hiddenInput);
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Cleanup emoji timer on unmount
  useEffect(() => {
    return () => {
      if (emojiTapResetTimer) {
        clearTimeout(emojiTapResetTimer);
      }
    };
  }, [emojiTapResetTimer]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Loading skeleton while checking membership
  if (membershipLoading || withinGrace) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="billboard-chat-loading">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Billboard & Chat
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading arena...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Empty state for non-members
  if (showEmpty) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="billboard-chat-empty">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Billboard & Chat
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Not in this Arena</h3>
            <p className="text-muted-foreground">Join a Rank-of-20 group to see announcements and chat.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Billboard & Chat
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Sign in to participate in the Billboard & Chat.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Real content for arena members
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" data-testid="billboard-chat-content">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Billboard & Chat
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Enhanced Announcement Section */}
          <motion.div
            className={`rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-emerald-500/40 transition-all duration-300 ${
              showNewGlow ? 'shadow-lg shadow-cyan-500/25 animate-pulse' : ''
            }`}
            initial={false}
            animate={showNewGlow ? { 
              boxShadow: [
                '0 0 0 rgba(34, 211, 238, 0)',
                '0 0 20px rgba(34, 211, 238, 0.4)',
                '0 0 0 rgba(34, 211, 238, 0)'
              ]
            } : {}}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <div className="rounded-2xl bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              {/* Accent bar */}
              <div className="h-[3px] bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 rounded-t-2xl"></div>
              
              <div className="py-5 md:py-6 px-4 md:px-6">
                {/* Icon + Label Row */}
                <div className="flex items-center gap-2 mb-4">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Latest Announcement</span>
                  {announcement && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40"></div>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </span>
                    </>
                  )}
                </div>

                {/* Content */}
                {isLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                ) : announcement ? (
                  <div className="space-y-3">
                    {announcement.title && (
                      <h2 
                        role="heading" 
                        aria-level={2}
                        className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight"
                      >
                        {announcement.title}
                      </h2>
                    )}
                    <p className="text-base md:text-lg leading-7 text-muted-foreground">
                      {announcement.body}
                    </p>
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground italic">No announcements yet.</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Chat Section */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Group Chat</span>
                {connectionStatus === 'reconnecting' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <WifiOff className="h-3 w-3" />
                    Reconnecting...
                  </div>
                )}
                {connectionStatus === 'connected' && challengeId && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Wifi className="h-3 w-3" />
                    Live
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Messages */}
              <div
                ref={scrollAreaRef}
                onScroll={handleScroll}
                data-chat-scroll
                className="mt-2 max-h-[65svh] sm:max-h-[70vh] overflow-y-auto pr-2"
              >
                {loadingOlder && (
                  <div className="text-center py-2">
                    <span className="text-xs text-muted-foreground">Loading older messages...</span>
                  </div>
                )}
                
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/4 mb-1"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`space-y-1 ${message.pending ? 'opacity-60' : ''} ${message.error ? 'border-l-2 border-red-500 pl-2' : ''}`}>
                        <div className="flex items-center gap-2">
                          {(message.avatar_url || userCache.current.get(message.user_id)?.avatar_url) ? (
                            <img 
                              src={message.avatar_url || userCache.current.get(message.user_id)?.avatar_url || ''} 
                              alt={message.display_name || userCache.current.get(message.user_id)?.display_name || 'User'} 
                              className="h-6 w-6 rounded-full flex-shrink-0" 
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-muted-foreground">
                                {(message.display_name || 
                                  userCache.current.get(message.user_id)?.display_name || 
                                  message.user_id.slice(-6))[0]?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-xs font-medium text-foreground">
                            {message.display_name || 
                             userCache.current.get(message.user_id)?.display_name || 
                             `User ${message.user_id.slice(-6)}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                          {message.pending && (
                            <span className="text-xs text-blue-500">Sending...</span>
                          )}
                          {message.error && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryMessage(message.id)}
                              className="h-4 px-2 text-xs text-red-500 hover:text-red-700"
                            >
                              Retry
                            </Button>
                          )}
                        </div>
                        <p className={`text-sm ${message.error ? 'text-red-700' : ''}`}>
                          {message.body}
                          {message.error && <span className="text-xs text-red-500 ml-2">(Failed to send)</span>}
                        </p>
                        
                        {/* Reactions row (compact) */}
                        {!message.pending && message.id && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {/* Top 3 reactions by count */}
                            {Object.entries(reactions[message.id] ?? {})
                              .sort((a,b) => (b[1] ?? 0) - (a[1] ?? 0))
                              .slice(0,3)
                              .map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(message.id as string, emoji)}
                                  className="px-2 h-6 rounded-full bg-muted hover:bg-muted/70 text-xs flex items-center gap-1"
                                  aria-label={`Remove ${emoji}`}
                                  title={`${emoji} ${count}`}
                                >
                                  <span>{emoji}</span>
                                  <span>{count}</span>
                                </button>
                              ))}

                            {/* If more than 3, show remaining reaction count */}
                            {(() => {
                              const messageReactions = reactions[message.id] ?? {};
                              const allEntries = Object.entries(messageReactions);
                              if (allEntries.length <= 3) return null;
                              
                              // Calculate total count of reactions not shown in top 3
                              const topThree = allEntries.sort((a,b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3);
                              const remainingEntries = allEntries.sort((a,b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(3);
                              const remainingCount = remainingEntries.reduce((sum, [, count]) => sum + (count ?? 0), 0);
                              
                              return (
                                <span className="px-2 h-6 rounded-full bg-muted/50 text-xs flex items-center">
                                  +{remainingCount}
                                </span>
                              );
                            })()}

                            {/* Add reaction: '+' chip opens popover - always show */}
                            <ReactionAddButton
                              messageId={message.id as string}
                              onPick={(e) => toggleReaction(message.id as string, e)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={bottomAnchorRef} />
                  </div>
                )}
              </div>

              {/* Send Message */}
              <div className="space-y-2">
                {false && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleEmojiStrip}
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Smile className="h-3 w-3" />
                    Emoji
                  </Button>
                )}
                <div className="flex items-center justify-between">
                  {newMessage.length > 1800 && (
                    <div className="text-xs text-muted-foreground">
                      {newMessage.length}/2000 characters
                    </div>
                  )}
                </div>

                {/* Emoji Strip */}
                {showEmojiStrip && (
                  <div 
                    className="mt-2 flex items-center gap-1 overflow-x-auto no-scrollbar py-1 emoji-strip"
                    data-testid="arena-emoji-bar"
                    onWheel={(e) => {
                      // Allow horizontal scroll with wheel on desktop
                      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                        e.currentTarget.scrollLeft += e.deltaY;
                        e.preventDefault();
                      }
                    }}
                  >
                    {EMOJI_SET.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiTap(emoji)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleEmojiLongPress();
                        }}
                        onTouchStart={(e) => {
                          // Long press on mobile
                          const timer = setTimeout(() => {
                            handleEmojiLongPress();
                          }, 500);
                          
                          const cleanup = () => {
                            clearTimeout(timer);
                            e.currentTarget.removeEventListener('touchend', cleanup);
                            e.currentTarget.removeEventListener('touchmove', cleanup);
                          };
                          
                          e.currentTarget.addEventListener('touchend', cleanup);
                          e.currentTarget.addEventListener('touchmove', cleanup);
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all duration-150 flex-shrink-0"
                        aria-label={`Insert ${emoji} emoji`}
                        type="button"
                      >
                        <span className="text-base">{emoji}</span>
                      </button>
                    ))}
                    <button
                      onClick={handleEmojiLongPress}
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all duration-150 flex-shrink-0"
                      aria-label="Open emoji picker"
                      type="button"
                    >
                      <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2" data-testid="arena-composer">
                  <Input
                    ref={inputRef}
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSending}
                    className="flex-1"
                    maxLength={2000}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={isSending || newMessage.trim().length > 2000}
                    size="icon"
                    data-testid="arena-plus-tab"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const REACTION_EMOJIS = ['👍','🔥','🎉','💧','🙌','😂','🥳','❤️','😮','👏'];

function ReactionAddButton({
  messageId,
  onPick,
}: { messageId: string; onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [showAbove, setShowAbove] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Check positioning when opening
  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      
      // Find the chat scroll container
      const chatContainer = document.querySelector('[data-chat-scroll]') as HTMLElement;
      if (chatContainer) {
        const containerRect = chatContainer.getBoundingClientRect();
        const spaceBelow = containerRect.bottom - rect.bottom;
        const popoverHeight = 120; // Approximate height of the emoji grid
        
        setShowAbove(spaceBelow < popoverHeight);
      } else {
        // Fallback to viewport calculation
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const popoverHeight = 120;
        
        setShowAbove(spaceBelow < popoverHeight);
      }
    }
    setOpen(v => !v);
  };

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Add reaction"
        onClick={handleToggle}
        className="px-2 h-6 rounded-full bg-muted/60 hover:bg-muted text-xs"
        title="Add reaction"
      >
        +
      </button>

      {open && (
        <div
          ref={panelRef}
          className={`absolute z-50 w-44 rounded-xl border border-border bg-popover shadow-lg p-2 ${
            showAbove ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          <div className="grid grid-cols-6 gap-1">
            {REACTION_EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                className="h-8 w-8 rounded-lg hover:bg-muted/60 flex items-center justify-center"
                onClick={() => { onPick(e); setOpen(false); }}
                aria-label={`React ${e}`}
                title={`React ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}