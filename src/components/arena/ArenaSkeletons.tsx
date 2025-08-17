export function BillboardSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/10" />
            <div className="h-4 w-40 rounded bg-white/10" />
          </div>
          <div className="h-4 w-16 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton({ messages = 6 }: { messages?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: messages }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 rounded bg-white/10" />
            <div className="h-4 w-4/5 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}