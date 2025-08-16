import { useEffect, useState } from "react";
import { fetchArenaLeaderboard, type LeaderboardMode } from "@/hooks/useArenaLeaderboard";
import { Button } from "@/components/ui/button";

export default function ArenaLeaderboard() {
  const [mode, setMode] = useState<LeaderboardMode>("global");
  const [rows, setRows] = useState<any[]>([]);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchArenaLeaderboard({ mode, section: "global", limit: 20 });
      setRows(res.rows);
      setSource(res.source);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load leaderboard");
      setRows([]);
      setSource("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={mode==='global'?'default':'secondary'} onClick={()=>setMode('global')}>
          Global
        </Button>
        <Button size="sm" variant={mode==='friends'?'default':'secondary'} onClick={()=>setMode('friends')}>
          Friends
        </Button>
      </div>

      <div className="text-xs opacity-60">source: {source || "—"}</div>

      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {err && <div className="text-xs text-red-600">Error: {err}</div>}

      {!loading && !err && (
        rows.length > 0 ? (
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
        ) : (
          <div className="text-xs opacity-70">
            {mode === "friends"
              ? "No friends on the board yet. Add friends or earn points!"
              : "No entries yet."}
          </div>
        )
      )}
    </div>
  );
}