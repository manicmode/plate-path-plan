import { supabase } from "@/integrations/supabase/client";

async function getSessionUserId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

/** Returns the user's Rank-of-20 challenge_id, assigning them if needed. */
export async function ensureRank20ChallengeForMe(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  // Do I already participate in a Rank-of-20 challenge?
  const { data: parts, error: partsErr } = await supabase
    .from("private_challenge_participations")
    .select(`private_challenge_id, private_challenges(name)`)
    .eq("user_id", userId)
    .limit(100);

  if (!partsErr) {
    const r20 = (parts ?? []).find(
      (p: any) => (p.private_challenges?.name || "").toLowerCase().startsWith("rank of 20")
    );
    if (r20) return r20.private_challenge_id as string;
  }

  // If not, ask the server to assign me
  const { data: assigned, error } = await supabase.rpc("assign_rank20", { _user_id: userId });
  if (error) {
    console.error("assign_rank20 error", error);
    return null;
  }
  return assigned?.[0]?.challenge_id ?? null;
}