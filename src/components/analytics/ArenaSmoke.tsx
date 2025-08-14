import React from "react";
import { useRank20Members } from "@/hooks/arena/useRank20Members";

export default function ArenaSmoke() {
  const { members, loading, error } = useRank20Members();
  const rows = (Array.isArray(members) ? members : []).map(m => ({
    user_id: m.user_id,
    display_name: m.display_name || `User ${String(m.user_id).slice(0,5)}`,
    joined_at: m.joined_at,
    avatar_url: m.avatar_url ?? null,
  }));
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[ARENA_SMOKE] members:", members?.length ?? 0, "rows:", rows.length, rows.slice(0,3));
  }
  return (
    <div style={{
      background: "#FFFBCC",
      color: "#111",
      border: "2px solid #E8C400",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      fontFamily: "monospace",
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>ARENA SMOKE</div>
      <div>members: {Array.isArray(members) ? members.length : 0}</div>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
{JSON.stringify((Array.isArray(members) ? members.slice(0,3) : []), null, 2)}
      </pre>
      <div>rows: {rows.length}</div>
      <div style={{ marginTop: 12 }}>
        {rows.map(r => (
          <div key={r.user_id} style={{ padding: 6, border: "1px dashed #888", borderRadius: 8, marginBottom: 6 }}>
            {r.display_name} — {r.user_id}
          </div>
        ))}
      </div>
    </div>
  );
}