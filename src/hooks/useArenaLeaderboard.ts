// NEW rollup-backed leaderboard (with graceful legacy fallback)
import { supabase } from "@/integrations/supabase/client";

export type LeaderboardMode = "global" | "friends";

export async function fetchArenaLeaderboard(opts?: {
  mode?: LeaderboardMode;      // NEW
  challengeId?: string | null;
  section?: string;            // default 'global'
  limit?: number;              // default 20
}) {
  const section = opts?.section ?? "global";
  const limit = opts?.limit ?? 20;

  const rpcName =
    opts?.mode === "friends"
      ? "arena_get_friends_leaderboard_with_profiles"
      : "arena_get_leaderboard_with_profiles";

  const rpc = await supabase.rpc(rpcName, {
    p_challenge_id: opts?.challengeId ?? null,
    p_section: section,
    p_limit: limit,
  });
  if (!rpc.error && Array.isArray(rpc.data)) {
    return { rows: rpc.data ?? [], source: rpcName };
  }

  // Fallback (legacy live-sum path) — use only if needed
  console.warn("[Arena] RPC fallback due to:", rpc.error?.message);
  
  // If we can't get rollups, try the direct leaderboard view
  const view = await supabase.from("arena_leaderboard_view").select("*").limit(opts?.limit ?? 20);
  if (view.error) throw view.error;
  
  const rows = view.data as any[];
  return { rows, source: "live" as const };
}