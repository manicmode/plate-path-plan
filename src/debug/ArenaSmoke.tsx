import React from "react";
import { useRank20Members } from "@/hooks/arena/useRank20Members";

export default function ArenaSmoke() {
  const { members, loading, error } = useRank20Members();
  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h1>Arena Smoke Test</h1>
      <div>loading: {String(loading)}</div>
      <div>error: {error ? String(error) : "none"}</div>
      <div>members_len: {Array.isArray(members) ? members.length : "n/a"}</div>
      <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#0f0", padding: 12 }}>
        {JSON.stringify(members, null, 2)}
      </pre>
    </div>
  );
}