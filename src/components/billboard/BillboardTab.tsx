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

  // Fetch challenge details to determine if it's Rank-of-20
  useEffect(() => {
    (async () => {
      if (!challengeId) {
        setChallengeInfo(null);
        return;
      }
      console.log('[diag] billboard challenge', challengeId);
      
      const { data: challenge } = await supabase
        .from("private_challenges")
        .select("title, challenge_type")
        .eq("id", challengeId)
        .single();
      
      setChallengeInfo(challenge || null);
    })();
  }, [challengeId]);

  // Determine if this is a Rank-of-20 challenge
  const isRank20 = challengeInfo && challengeInfo.challenge_type === 'rank_of_20';

  // Auto-assign to Rank-of-20 and default selection
  useEffect(() => {
    (async () => {
      // Log current user for diagnostics
      const { data: user } = await supabase.auth.getUser();
      console.log('[diag] user', user);
      
      if (!selectedChatroomId) {
        // First try to find an existing Rank-of-20 challenge
        const { data: rank20Challenge } = await supabase
          .from("private_challenges")
          .select("id")
          .eq("challenge_type", "rank_of_20")
          .single();
        
        if (rank20Challenge) {
          selectChatroom(rank20Challenge.id);
        } else {
          // Fallback to assign_rank20 if no existing challenge
          const chId = await ensureRank20ChallengeForMe();
          if (chId) {
            selectChatroom(chId);
            
            // Auto-seed demo events in dev mode if billboard is empty
            if (isDev) {
              setTimeout(async () => {
                await seedBillboardForChallenge(chId, refresh);
                await refresh();
              }, 1000);
            }
          }
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
                      const { data, error } = await (supabase as any).rpc('diag_rank20');
                      if (error) {
                        console.log("[diag] diag_rank20 RPC not available:", error.message);
                      } else {
                        console.log("[diag] rank20 diagnostics:", data);
                      }
                    } catch (err) {
                      console.log("[diag] diagnostics unavailable - optional feature");
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
