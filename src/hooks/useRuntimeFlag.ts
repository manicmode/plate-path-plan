import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Options = {
  defaultValue?: boolean;
  subscribe?: boolean;
  refreshOnFocus?: boolean;
};

export function useRuntimeFlag(
  name: string,
  opts: Options = { defaultValue: false, subscribe: true, refreshOnFocus: true }
) {
  const { defaultValue = false, subscribe = true, refreshOnFocus = true } = opts;

  const [value, setValue] = useState<boolean>(defaultValue);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const fetchFlag = async () => {
    setLoading(true);
    setError(undefined);
    const { data, error } = await supabase
      .from("runtime_flags")
      .select("enabled, updated_at")
      .eq("name", name)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[runtime_flag] fetch error", name, error);
      setError(error as Error);
    } else if (data) {
      setValue(Boolean(data.enabled));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFlag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Realtime: update immediately when the row changes
  useEffect(() => {
    if (!subscribe) return;
    const channel = supabase
      .channel(`runtime_flags:${name}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "runtime_flags", filter: `name=eq.${name}` },
        (payload) => {
          const row: any = (payload as any).new ?? (payload as any).record ?? {};
          if (typeof row.enabled === "boolean") setValue(row.enabled);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [name, subscribe]);

  // Refresh when window/tab is focused (prevents stale cache after toggling flag)
  useEffect(() => {
    if (!refreshOnFocus) return;
    const handler = () => fetchFlag();
    window.addEventListener("focus", handler);
    document.addEventListener("visibilitychange", handler);
    return () => {
      window.removeEventListener("focus", handler);
      document.removeEventListener("visibilitychange", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, refreshOnFocus]);

  return { value, loading, error, refresh: fetchFlag };
}