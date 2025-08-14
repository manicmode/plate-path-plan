import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRank20Members } from "@/hooks/arena/useRank20Members";

export default function ArenaSmoke() {
  const { members, loading, error } = useRank20Members();

  const rows = useMemo(
    () =>
      (Array.isArray(members) ? members : []).map((m) => ({
        id: m.user_id,
        name:
          (m.display_name && m.display_name.trim()) ||
          `User ${String(m.user_id).slice(0, 5)}`,
      })),
    [members]
  );

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs rounded-md border border-yellow-500 bg-yellow-500/10 p-2">
        <div className="font-semibold mb-1">ARENA SMOKE</div>
        <div>loading: <b>{String(loading)}</b></div>
        <div>error: <b>{error ?? "none"}</b></div>
        <div>members: <b>{Array.isArray(members) ? members.length : "n/a"}</b></div>
        <div>rows: <b>{rows.length}</b></div>
        <pre className="mt-2 whitespace-pre-wrap break-all max-h-40 overflow-auto">
{JSON.stringify(rows.slice(0, 5), null, 2)}
        </pre>
      </div>

      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle className="text-sm">{r.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {r.id}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}