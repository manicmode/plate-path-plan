import { useArenaBillboard } from "@/hooks/useArenaBillboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ArenaBillboard() {
  const { rows, loading, err } = useArenaBillboard(10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Top 10</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <div className="text-sm opacity-70">Loading…</div>}
        {err && <div className="text-xs text-red-600">{err}</div>}
        {!loading && !err && (
          rows.length ? (
            <ol className="space-y-1">
              {rows.map((r:any, i:number) => (
                <li key={i} className="flex items-center justify-between border rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-right">{r.rank}</span>
                    <img src={r.avatar_url ?? "/avatar.png"} className="w-6 h-6 rounded-full" />
                    <span>{r.display_name ?? r.user_id}</span>
                  </div>
                  <div className="font-semibold">{r.score}</div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-xs opacity-70">No entries yet.</div>
          )
        )}
      </CardContent>
    </Card>
  );
}