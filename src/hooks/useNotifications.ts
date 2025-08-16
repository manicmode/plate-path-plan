import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useNotifications(limit = 20) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotifs() {
    const { data, error } = await supabase
      .from("app_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error) setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    fetchNotifs();

    // Get user for filtering realtime events
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const ch = supabase
        .channel("notifs")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "app_notifications" },
          (payload) => {
            if (!mounted) return;
            // Only add notifications for the current user
            if (payload.new.user_id !== user?.id) return;
            setRows(prev => [payload.new, ...prev].slice(0, limit));
          }
        )
        .subscribe();

      return () => { 
        mounted = false; 
        supabase.removeChannel(ch); 
      };
    };

    const cleanup = setupRealtimeSubscription();
    
    return () => {
      cleanup.then(fn => fn());
    };
  }, [limit]);

  return { rows, loading, refresh: fetchNotifs };
}