import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBillboardEvents(challengeId?: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sb: any = supabase as any;

  const load = useCallback(async () => {
    if (!challengeId) { setEvents([]); return; }
    setIsLoading(true);
    const { data, error } = await sb
      .from("billboard_events")
      .select("id,challenge_id,author_system,author_user_id,kind,title,body,meta,created_at,pinned")
      .eq("challenge_id", challengeId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setEvents(data as any);
    setIsLoading(false);
  }, [challengeId, sb]);

  useEffect(() => { load(); }, [load]);

  return { events, isLoading, refresh: load };
}
