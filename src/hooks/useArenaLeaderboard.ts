// NEW rollup-backed leaderboard (with graceful legacy fallback)
import { supabase } from "@/integrations/supabase/client";

export async function fetchArenaLeaderboard(opts?: {
  challengeId?: string | null;
  section?: string;   // 'global' default
  limit?: number;     // 20 default
}) {
  const section = opts?.section ?? "global";
  const params = { p_challenge_id: opts?.challengeId ?? null, p_section: section };

  // Prefer server-side profile-joined RPC
  const rpc = await supabase.rpc("arena_get_leaderboard_with_profiles", params);
  if (!rpc.error && Array.isArray(rpc.data)) {
    const rows = (opts?.limit ? rpc.data.slice(0, opts.limit) : rpc.data) as any[];
    return { rows, source: "rollups" as const };
  }

  // Fallback (legacy live-sum path) — use only if needed
  console.warn("[Arena] RPC fallback due to:", rpc.error?.message);
  
  // If we can't get rollups, try the direct leaderboard view
  const view = await supabase.from("arena_leaderboard_view").select("*").limit(opts?.limit ?? 20);
  if (view.error) throw view.error;
  
  const rows = view.data as any[];
  return { rows, source: "live" as const };
}