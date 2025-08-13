import React from "react";
import { useChatStore } from "@/store/chatStore";
import { useBillboardEvents } from "./useBillboard";
import BillboardCard from "./BillboardCard";

export default function BillboardTab() {
  const { selectedChatroomId } = useChatStore();
  const challengeId = selectedChatroomId || "";
  const { events, isLoading, refresh } = useBillboardEvents(challengeId);

  return (
    <div id="billboard-root" className="relative min-h-[100dvh] flex flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 sm:px-4 md:px-6 lg:px-8 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : !challengeId ? (
            <div className="text-center text-sm opacity-80 py-8">Select a challenge to view its Billboard.</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm opacity-80 mb-3">No highlights yet. Check back later or refresh.</div>
              <button onClick={refresh} className="px-3 py-1 rounded-full border text-sm">Refresh</button>
            </div>
          ) : (
            events.map((ev) => <BillboardCard key={ev.id} event={ev} />)
          )}
        </div>
      </div>
    </div>
  );
}
