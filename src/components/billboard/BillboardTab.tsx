import React, { useState, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useBillboardEvents } from "./useBillboard";
import BillboardCard from "./BillboardCard";
import ChallengeRankings from "./ChallengeRankings";
import { seedBillboardForChallenge } from "@/dev/seedBillboard";
import { ensureRank20ChallengeForMe } from "@/hooks/useEnsureRank20";
import { isDev } from "@/utils/dev";
import { supabase } from "@/integrations/supabase/client";

export default function BillboardTab() {
  const { selectedChatroomId, selectChatroom } = useChatStore();
  const challengeId = selectedChatroomId || "";
  const { events, isLoading, refresh } = useBillboardEvents(challengeId);
  const [seeding, setSeeding] = useState(false);
  const [challengeInfo, setChallengeInfo] = useState<{title: string, challenge_type?: string} | null>(null);

  // Fetch challenge details and add console tracing
  useEffect(() => {
    (async () => {
      // Console tracing at mount
      console.info('[diag] billboard challenge', challengeId);
      
      const { data: user } = await supabase.auth.getUser();
      console.info('[diag] user', user?.user?.id);

      // Test diagnostics RPC
      const d = await supabase.rpc('diag_rank20');
      console.info('[diag] diag_rank20', d.error, d.data);

      if (!challengeId) {
        setChallengeInfo(null);
        return;
      }
      
      const { data: challenge } = await supabase
        .from("private_challenges")
        .select("title, challenge_type")
        .eq("id", challengeId)
        .single();
      
      setChallengeInfo(challenge || null);
    })();
  }, [challengeId]);

  // Determine if this is a Rank-of-20 challenge (only check challenge_type)
  const isRank20 = challengeInfo && challengeInfo.challenge_type === 'rank_of_20';

  // Client-side auto-assign safeguard
  const ensureRank20ClientSide = async (userId: string) => {
    try {
      console.info('[rank20] auto-assigning user', userId);
      const { error } = await supabase.rpc('assign_rank20', { _user_id: userId });
      if (error) console.error('[rank20] assign rpc error', error);
    } catch (e) {
      console.error('[rank20] assign exception', e);
    }
  };

  // Auto-select first available challenge if none selected
  useEffect(() => {
    const loadDefaultChallenge = async () => {
      console.info('[billboard] resolving default via my_billboard_challenges');
      
      // Get current user for auto-assignment
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      const { data, error } = await supabase.rpc('my_billboard_challenges');
      if (error) {
        console.error('[billboard] rpc error', error);
        return;
      }
      
      const items = (data ?? []) as any[];
      
      // Sort existing items by newest first (no rank_of_20 challenges)
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      console.info('[billboard] default candidates', items);
      if (items.length > 0) {
        selectChatroom(items[0].id);
        console.info('[billboard] default selected', items[0]);
      }
    };

    (async () => {
      // Log current user for diagnostics
      const { data: user } = await supabase.auth.getUser();
      console.log('[diag] user', user);
      
      if (!selectedChatroomId) {
        await loadDefaultChallenge();
        
        // Auto-seed demo events in dev mode if billboard is empty
        if (isDev && selectedChatroomId) {
          setTimeout(async () => {
            await seedBillboardForChallenge(selectedChatroomId, refresh);
            await refresh();
          }, 1000);
        }
      }
      
      // Verify membership when challenge is selected
      if (challengeId) {
        const { data: membership } = await supabase
          .from("private_challenge_participations")
          .select("user_id")
          .eq("private_challenge_id", challengeId)
          .eq("user_id", user?.user?.id)
          .single();
        
        console.log('[diag] user is member:', !!membership);
      }
    })();
  }, [selectedChatroomId, selectChatroom, refresh, challengeId]);

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
          ) : !challengeId ? (
            <div className="text-center text-sm opacity-80 py-8">Select a challenge to view its Billboard.</div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
              <div>No highlights yet. Check back later or refresh.</div>
              <div className="flex items-center justify-center gap-2">
                <button onClick={refresh} className="px-3 py-1 rounded-full border text-sm">Refresh</button>
                <button
                  className="rounded-xl px-3 py-2 border hover:bg-accent disabled:opacity-50"
                  disabled={!challengeId || seeding}
                  onClick={async () => {
                    if (!challengeId) return;
                    try {
                      setSeeding(true);
                      await seedBillboardForChallenge(challengeId, refresh);
                      await refresh();
                    } finally {
                      setSeeding(false);
                    }
                  }}
                >
                  {seeding ? "Seeding…" : "Seed demo events"}
                </button>
              </div>
              {process.env.NODE_ENV !== "production" && (
                <button
                  className="text-xs underline opacity-70"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.rpc('diag_rank20');
                      console.debug('[diag] diag_rank20', { data, error });
                    } catch (diagError) {
                      console.debug('[diag] diag_rank20 unavailable - optional feature', diagError);
                    }
                  }}
                >
                  Run Rank-of-20 diagnostics
                </button>
              )}
              {!challengeId && (
                <div className="text-xs">Select a challenge above first</div>
              )}
            </div>
          ) : (
            <>
              {isRank20 && <ChallengeRankings challengeId={challengeId} />}
              {events.map((ev) => <BillboardCard key={ev.id} event={ev} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
