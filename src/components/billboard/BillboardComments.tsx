import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";

type Comment = {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
};

export default function BillboardComments({ eventId }: { eventId: string }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [items, setItems] = useState<Comment[]>([]);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(true);

  

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('my_billboard_comments_list', {
      _event_id: eventId,
      _limit: 50
    });
    setItems((data as Comment[]) || []);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!userId || !value.trim()) return;
    const optimistic: Comment = { 
      id: crypto.randomUUID(), 
      event_id: eventId, 
      user_id: userId, 
      body: value, 
      created_at: new Date().toISOString(),
      display_name: "You" // Temporary optimistic name
    };
    setItems((prev) => [...prev, optimistic]);
    setValue("");
    
    const { data, error } = await supabase.rpc('my_billboard_comment_post', {
      _event_id: eventId,
      _body: optimistic.body
    });
    
    if (!error && data && data[0]) {
      setItems((prev) => prev.map(i => i.id === optimistic.id ? data[0] as Comment : i));
    }
  };

  return (
    <div className="border-t pt-2 mt-2">
      <button className="text-xs opacity-70 mb-2" onClick={() => setOpen((o) => !o)}>
        {open ? "Hide comments" : `View comments (${items.length})`}
      </button>
      {open && (
        <>
          <div className="space-y-2 mb-2">
            {items.map((c) => {
              const displayName = c.display_name ?? `User ${c.user_id.slice(0,5)}`;
              return (
                <div key={c.id} className="text-sm">
                  <span className="opacity-70 mr-2">{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                  <span className="font-medium mr-2">{displayName}:</span>
                  <span>{c.body}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Add a comment"
              className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
            />
            <button onClick={send} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm">Send</button>
          </div>
        </>
      )}
    </div>
  );
}
