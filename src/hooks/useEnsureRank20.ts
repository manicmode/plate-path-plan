import { supabase } from "@/integrations/supabase/client";

async function getSessionUserId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

/** Returns the user's Rank-of-20 challenge_id, assigning them if needed. */
export async function ensureRank20ChallengeForMe(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  // Auto-enroll using the new RPC function (idempotent)
  const { error: enrollError } = await supabase.rpc("rank20_enroll_me");
  if (enrollError) {
    console.error("rank20_enroll_me error", enrollError);
  }

  // Get current rank-of-20 challenge ID
  const { data: challengeId, error: challengeError } = await supabase.rpc("current_rank20_challenge_id");
  if (challengeError) {
    console.error("current_rank20_challenge_id error", challengeError);
    return null;
  }

  return challengeId || null;
}