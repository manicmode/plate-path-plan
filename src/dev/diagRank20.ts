import { supabase } from "@/integrations/supabase/client";

export async function diagRank20() {
  try {
    const url = (supabase as any)?.rest?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    console.log("[diag] Supabase URL:", url);

    // Check tables exist
    const { data: exists, error: existsErr } = await supabase.rpc("sql", {
      // use the built-in SQL edge function if available; otherwise run a safe select
    } as any);

  } catch (e) {
    console.warn("[diag] rpc(sql) not available, using lightweight checks");
  }

  // Lightweight checks without SQL edge function:
  const check = async (table: string) => {
    const { error } = await supabase.from(table as any).select("*", { count: "exact", head: true }).limit(1);
    return { table, ok: !error, error };
  };

  const checks = await Promise.all([
    check("rank20_groups"),
    check("rank20_members"),
    check("billboard_events"),
    check("private_challenges"),
    check("private_challenge_participations"),
  ]);

  console.table(checks);
  return checks;
}