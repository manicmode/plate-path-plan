import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";

const EMOJIS = ["🔥","👏","💯","😂","😮","❤️"] as const;

type Reaction = {
  id: string;
  event_id: string;
  user_id: string;
  emoji: string;
};

type Props = { eventId: string };

export default function BillboardReactions({ eventId }: Props) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reactions) map[r.emoji] = (map[r.emoji] || 0) + 1;
    return map;
  }, [reactions]);

  const sb: any = supabase as any;

  const load = useCallback(async () => {
    const { data, error } = await sb
      .from("billboard_reactions")
      .select("id,event_id,user_id,emoji")
      .eq("event_id", eventId);
    if (!error && data) setReactions(data as any);
  }, [eventId, sb]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (emoji: string) => {
    if (!userId) return;
    const { data: existing } = await sb
      .from("billboard_reactions")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      setReactions((prev) => prev.filter((r) => !(r.id === existing.id)));
      await sb.from("billboard_reactions").delete().eq("id", existing.id);
    } else {
      const optimistic: Reaction = { id: crypto.randomUUID(), event_id: eventId, user_id: userId, emoji } as any;
      setReactions((prev) => [...prev, optimistic]);
      const { data, error } = await sb
        .from("billboard_reactions")
        .insert({ event_id: eventId, user_id: userId, emoji })
        .select("id,event_id,user_id,emoji")
        .single();
      if (!error && data) {
        setReactions((prev) => [...prev.filter(r => r.id !== optimistic.id), data as any]);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => toggle(e)}
          className="px-2 py-1 rounded-full border text-sm hover:bg-muted"
          aria-label={`React ${e}`}
        >
          <span className="mr-1">{e}</span>
          <span className="opacity-70">{counts[e] || 0}</span>
        </button>
      ))}
    </div>
  );
}
