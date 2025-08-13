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
  return (
    <article className="rounded-2xl border bg-card text-card-foreground shadow-sm">
      <header className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {event.title}
        </h3>
        <time className="text-xs opacity-70">{ts}</time>
      </header>
      {event.body && (
        <div className="px-4 py-3 text-sm opacity-90">
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
