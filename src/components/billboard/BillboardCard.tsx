import React, { useMemo } from "react";
import BillboardReactions from "./BillboardReactions";
import BillboardComments from "./BillboardComments";

export type BillboardEvent = {
  id: string;
  challenge_id: string;
  author_system: boolean;
  author_user_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  meta: any;
  created_at: string;
  pinned: boolean;
};

export default function BillboardCard({ event }: { event: BillboardEvent }) {
  const ts = useMemo(() => new Date(event.created_at).toLocaleString(), [event.created_at]);
  const badge = useMemo(() => {
    const m: any = event.meta || {};
    switch (event.kind) {
      case 'streak':
        return m.streak ? `${m.streak}-day streak` : null;
      case 'rank_jump':
        if (m.delta) return `+${m.delta} jump`;
        if (m.newRank) return `#${m.newRank}`;
        return null;
      case 'group_record':
        return m.avg_steps ? `Avg ${Number(m.avg_steps).toLocaleString()}` : null;
      case 'milestone':
        return m.distance_km ? `${m.distance_km} km` : null;
      case 'comeback':
        return m.newRank ? `#${m.newRank}` : null;
      default:
        return null;
    }
  }, [event]);
  const kindBorderClass = useMemo(() => {
    switch (event.kind) {
      case 'rank_jump':
        return 'border-emerald-500';
      case 'lead_change':
        return 'border-amber-500';
      case 'streak':
        return 'border-sky-500';
      case 'group_record':
        return 'border-violet-500';
      case 'milestone':
        return 'border-rose-500';
      case 'comeback':
        return 'border-orange-500';
      default:
        return 'border-primary';
    }
  }, [event.kind]);
  return (
    <article className={`relative rounded-2xl border bg-card/80 backdrop-blur text-card-foreground shadow-lg border-l-4 ${kindBorderClass}`}>
      <header className="relative px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-xl md:text-2xl font-bold">
          {event.title}
        </h3>
        <time className="text-xs opacity-70">{ts}</time>
        {badge && (
          <span className="absolute top-2 right-3 text-xs px-2 py-0.5 rounded-full bg-muted/60">
            {badge}
          </span>
        )}
      </header>
      {event.body && (
        <div className="px-4 py-3 text-sm md:text-base text-muted-foreground">
          {event.body}
        </div>
      )}
      <div className="px-3 pb-2">
        <BillboardReactions eventId={event.id} />
      </div>
      <div className="px-3 pb-4">
        <BillboardComments eventId={event.id} />
      </div>
    </article>
  );
}
