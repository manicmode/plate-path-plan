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

  async function markAsRead(notificationIds: string[]) {
    const { error } = await supabase.rpc("app_notifs_mark_read", { 
      p_ids: notificationIds 
    });
    if (!error) {
      setRows(prev => prev.map(row => 
        notificationIds.includes(row.id) ? { ...row, read_at: new Date().toISOString() } : row
      ));
    }
    return { error };
  }

  async function markAllAsRead() {
    const { error } = await supabase.rpc("app_notifs_mark_all_read");
    if (!error) {
      setRows(prev => prev.map(row => ({ ...row, read_at: new Date().toISOString() })));
    }
    return { error };
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
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "app_notifications" },
          (payload) => {
            if (!mounted) return;
            // Update notification in place
            if (payload.new.user_id !== user?.id) return;
            setRows(prev => prev.map(row => 
              row.id === payload.new.id ? payload.new : row
            ));
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

  return { 
    rows, 
    loading, 
    refresh: fetchNotifs, 
    markAsRead, 
    markAllAsRead 
  };
}