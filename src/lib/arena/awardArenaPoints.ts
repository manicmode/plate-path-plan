import { supabase } from "@/integrations/supabase/client";

export async function awardArenaPoints(opts: {
  points: number;
  kind: string;
  challengeId: string | null;    // pass null to auto-resolve active challenge (server checks)
  idemKey?: string | null;       // pass a UUID or null
}) {
  const { error } = await supabase.rpc("arena_award_points", {
    p_points: opts.points,
    p_kind: opts.kind,
    p_challenge_id: opts.challengeId,
    p_idem_key: opts.idemKey ?? null
  });
  if (error) throw error;
}