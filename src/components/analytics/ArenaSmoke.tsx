import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRank20Members } from "@/hooks/arena/useRank20Members";

function ensureRoot(): HTMLElement {
  const id = "arena-smoke-root";
  let el = document.getElementById(id) as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    Object.assign(el.style, {
      position: "fixed",
      top: "12px",
      left: "12px",
      zIndex: "99999",
      maxWidth: "44vw",
      pointerEvents: "none",
    });
    document.body.appendChild(el);
  }
  return el;
}

export default function ArenaSmoke() {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const { members, loading, error } = useRank20Members();

  useEffect(() => {
    if (typeof window !== "undefined") setRoot(ensureRoot());
  }, []);

  const rows = useMemo(
    () => (Array.isArray(members) ? members : []).map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name?.trim() || `User ${String(m.user_id).slice(0,5)}`,
      joined_at: m.joined_at,
      avatar_url: m.avatar_url ?? null,
    })),
    [members]
  );

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[ARENA_SMOKE] { members:", members?.length ?? 0, ", rows:", rows.length, " } sample:", rows.slice(0,3));
  }

  if (!root) return null;

  return createPortal(
    <div style={{
      background: "#FFFBCC",
      color: "#111",
      border: "2px solid #E8C400",
      borderRadius: 12,
      padding: 12,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>ARENA SMOKE</div>
      <div>members: {Array.isArray(members) ? members.length : 0}</div>
      <div>rows: {rows.length}</div>
      {loading && <div>loading…</div>}
      {error && <div style={{ color: "#B00020" }}>error: {String(error)}</div>}
      <pre style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
        {JSON.stringify(rows.slice(0,3), null, 2)}
      </pre>
    </div>,
    root
  );
}