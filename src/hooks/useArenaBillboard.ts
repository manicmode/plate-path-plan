import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useArenaBillboard(limit = 10) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase
        .from("arena_billboard_with_profiles")
        .select("*")
        .limit(limit);
      if (!mounted) return;
      if (error) setErr(error.message);
      setRows(data ?? []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [limit]);

  return { rows, loading, err };
}

export function useArenaMyRank() {
  const [rank, setRank] = useState<number | undefined>();
  const [score, setScore] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("arena_get_my_rank", {});
      if (!mounted) return;
      if (!error && data && data.length) {
        setRank(data[0].rank ?? undefined);
        setScore(data[0].score ?? undefined);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return { rank, score, loading };
}