// Replace your existing fetch with rollup-backed hook
import { useEffect, useState } from "react";
import { fetchArenaLeaderboard } from "@/hooks/useArenaLeaderboard";

export default function ArenaLeaderboard() {
  const [rows, setRows] = useState<any[]>([]);
  const [source, setSource] = useState<"rollups" | "live" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchArenaLeaderboard({ section: "global", limit: 20 });
        if (!mounted) return;
        setRows(res.rows);
        setSource(res.source);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="text-sm opacity-70">Loading leaderboard…</div>;

  return (
    <div className="space-y-2">
      <div className="text-xs opacity-60">source: {source}</div>
      <ol className="space-y-1">
        {rows.map((r:any, i:number) => (
          <li key={i} className="flex items-center justify-between border rounded p-2">
            <div className="flex items-center gap-2">
              <span className="w-6 text-right">{r.rank ?? i+1}</span>
              <img src={r.avatar_url ?? "/placeholder.svg"} className="w-6 h-6 rounded-full" alt="Avatar" />
              <span>{r.display_name ?? r.username ?? r.user_id}</span>
            </div>
            <div className="font-semibold">{r.score}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}