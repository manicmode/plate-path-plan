import React, { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useBillboardEvents } from "./useBillboard";
import BillboardCard from "./BillboardCard";
import { ChallengeRankings } from "./ChallengeRankings";
import { seedBillboardForChallenge, seedBillboardDemoEventsFor } from "@/dev/seedBillboard";
import { ensureRank20ChallengeForMe } from "@/hooks/useEnsureRank20";
import { isDev } from "@/utils/dev";
import { supabase } from "@/integrations/supabase/client";
import { requireSession } from "@/lib/ensureAuth";
import { useSearchParams, useLocation } from 'react-router-dom';

type BillboardContext = 'rank_of_20' | 'private' | 'public';

interface BillboardTabProps {
  contextType?: BillboardContext;
  challengeId?: string;
}

export default function BillboardTab(props: BillboardTabProps = {}) {
  const { contextType, challengeId: propChallengeId } = props;
  const { selectedChatroomId, selectChatroom } = useChatStore();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Determine challenge ID and context from props or URL params
  const urlContextType = searchParams.get("type") as BillboardContext;
  const urlChallengeId = searchParams.get("private_challenge_id") || searchParams.get("public_challenge_id");
  
  const finalContextType = contextType || urlContextType || 'private';
  const finalChallengeId = propChallengeId || urlChallengeId || selectedChatroomId || "";
  
  const { events, isLoading, refresh } = useBillboardEvents(finalChallengeId);
  const [seeding, setSeeding] = useState(false);
  const [challengeInfo, setChallengeInfo] = useState<{title: string, challenge_type?: string} | null>(null);
  const [hasLoggedEmpty, setHasLoggedEmpty] = useState(false);

  // Fetch challenge details and add console tracing
  useEffect(() => {
    (async () => {
      try {
        await requireSession();
        
        // Console tracing at mount
        console.info('[diag] billboard challenge', finalChallengeId);
        
        const { data: user } = await supabase.auth.getUser();
        console.info('[diag] user', user?.user?.id);

        // V2: No more legacy diag_rank20 diagnostics needed
        console.info('[diag] Billboard V2 - using arena groups');

      if (!finalChallengeId) {
        setChallengeInfo(null);
        return;
      }
      
      // Query the appropriate table based on context type
      const tableName = finalContextType === 'public' ? 'public_challenges' : 'private_challenges';
      const { data: challenge } = await supabase
        .from(tableName)
        .select("title, challenge_type")
        .eq("id", finalChallengeId)
        .single();
      
        setChallengeInfo(challenge || null);
      } catch (err) {
        console.warn('[billboard] Authentication required');
      }
    })();
  }, [finalChallengeId, finalContextType]);

  // Determine if this is a Rank-of-20 challenge (only check challenge_type)
  const isRank20 = challengeInfo && challengeInfo.challenge_type === 'rank_of_20';


  // Auto-select first available challenge if none selected
  useEffect(() => {
    const loadDefaultChallenge = async () => {
      try {
        await requireSession();
        console.info('[billboard] resolving default via my_billboard_challenges');
        
        const { data, error } = await supabase.rpc('my_billboard_challenges');
        if (error) {
          console.error('[billboard] rpc error', error);
          return;
        }
      
      const items = (data ?? []) as any[];
      
      // Defensive filter: should never trigger but protects against rank_of_20 leakage
      const safeItems = items.filter(i => i.challenge_type !== 'rank_of_20');
      if (safeItems.length !== items.length) {
        if (process.env.NODE_ENV !== 'production') console.warn('Filtered rank_of_20 from billboard');
      }
      
      // Sort existing items by newest first (no rank_of_20 challenges)
      safeItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      
      // Log telemetry
      console.info('[telemetry] billboard_loaded', { count: safeItems.length });
      
        if (safeItems.length > 0) {
          selectChatroom(safeItems[0].id);
          console.info('[billboard] default selected', safeItems[0]);
        }
      } catch (err) {
        console.warn('[billboard] Authentication required for challenge loading');
      }
    };

    (async () => {
      // Log current user for diagnostics
      const { data: user } = await supabase.auth.getUser();
      console.log('[diag] user', user);
      
      if (!selectedChatroomId) {
        await loadDefaultChallenge();
        
        // Auto-seed demo events in dev mode if billboard is empty
        if (isDev && finalChallengeId) {
          setTimeout(async () => {
            await seedBillboardDemoEventsFor(finalContextType, finalChallengeId);
            await refresh();
          }, 1000);
        }
      }
      
      // Verify membership when challenge is selected
      if (finalChallengeId && user?.user?.id) {
        try {
          const participationTable = finalContextType === 'public' ? 'public_challenge_participations' : 'private_challenge_participations';
          const challengeIdField = finalContextType === 'public' ? 'public_challenge_id' : 'private_challenge_id';
          
          const { data: membership } = await supabase
            .from(participationTable as any)
            .select("user_id")
            .eq(challengeIdField, finalChallengeId)
            .eq("user_id", user.user.id)
            .single();
          
          console.log('[diag] user is member:', !!membership);
        } catch (membershipError) {
          console.log('[diag] membership check failed:', membershipError);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatroomId, finalChallengeId, finalContextType]);

  // Log telemetry for empty state
  useEffect(() => {
    if (!finalChallengeId && !hasLoggedEmpty && !isLoading) {
      console.info('[telemetry] billboard_empty_shown');
      setHasLoggedEmpty(true);
    } else if (finalChallengeId && hasLoggedEmpty) {
      setHasLoggedEmpty(false);
    }
  }, [finalChallengeId, hasLoggedEmpty, isLoading]);

  // Dev flag check
  const showDebug = process.env.NODE_ENV !== 'production' || 
                   new URLSearchParams(location.search).get('dev') === '1';

  return (
    <div id="billboard-root" className="relative min-h-[100dvh] flex flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 sm:px-4 md:px-6 lg:px-8 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : !finalChallengeId ? (
            // Polished empty state when no challenge is selected
            <div className="flex flex-col items-center justify-center gap-6 py-16 px-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No Billboard challenges yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Create or join a private challenge to see it here.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                  onClick={() => {
                    console.info('[telemetry] billboard_create_clicked');
                    // Create challenge logic would go here
                  }}
                >
                  Create Private Challenge
                </button>
                <button 
                  className="px-6 py-2 border border-border rounded-full hover:bg-accent transition-colors"
                  onClick={() => {
                    console.info('[telemetry] billboard_arena_link_clicked');
                    // Navigate to Arena tab - you can customize this based on your routing
                    window.dispatchEvent(new CustomEvent("switch-to-arena-tab"));
                  }}
                >
                  Go to Arena (Rank-of-20)
                </button>
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
              <div>No highlights yet. Check back later or refresh.</div>
              <div className="flex items-center justify-center gap-2">
                <button onClick={refresh} className="px-3 py-1 rounded-full border text-sm">Refresh</button>
                {showDebug && (
                  <button
                    className="rounded-xl px-3 py-2 border hover:bg-accent disabled:opacity-50"
                    disabled={!finalChallengeId || seeding}
                    onClick={async () => {
                      if (!finalChallengeId) return;
                      try {
                        setSeeding(true);
                        await seedBillboardDemoEventsFor(finalContextType, finalChallengeId);
                        await refresh();
                      } finally {
                        setSeeding(false);
                      }
                    }}
                  >
                    {seeding ? "Seeding…" : "Seed demo events"}
                  </button>
                )}
              </div>
              {showDebug && (
                <button
                  className="text-xs underline opacity-70"
                  onClick={() => console.debug('[diag] Arena V2 diagnostics - see Arena panel')}
                >
                  Arena V2 diagnostics
                </button>
              )}
              {!finalChallengeId && (
                <div className="text-xs">Select a challenge above first</div>
              )}
            </div>
          ) : (
            <>
              {isRank20 && <ChallengeRankings challengeId={finalChallengeId} />}
              {events.map((ev) => <BillboardCard key={ev.id} event={ev} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
