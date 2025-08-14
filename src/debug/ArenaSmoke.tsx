import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type RowsItem = { user_id: string; display_name?: string | null; avatar_url?: string | null; joined_at?: string | null };

// The overlay is global; it does NOT depend on any specific arena component.
export default function ArenaSmokeGlobal() {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const ensureRoot = () => {
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
          pointerEvents: "none",
        });
        document.body.appendChild(el);
      }
      return el;
    };
    setRoot(ensureRoot());

    // URL / localStorage flag
    const qs = new URLSearchParams(window.location.search);
    const urlOn = qs.get("arena_smoke") === "1";
    const lsOn = localStorage.getItem("arena_smoke") === "1";
    if (urlOn) localStorage.setItem("arena_smoke", "1");
    setOn(urlOn || lsOn);

    // Dev keyboard toggle: Shift+S
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && e.shiftKey) {
        const cur = localStorage.getItem("arena_smoke") === "1";
        localStorage.setItem("arena_smoke", cur ? "" : "1");
        location.reload();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!root || !on) return null;

  // We cannot import hooks safely here (unknown page). So we just show path + query and a nudge.
  return createPortal(
    <div style={{
      background: "#FFFBCC",
      color: "#111",
      border: "2px solid #E8C400",
      borderRadius: 12,
      padding: 12,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      maxWidth: "50vw",
    }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>ARENA SMOKE (GLOBAL)</div>
      <div>path: {window.location.pathname}</div>
      <div>query: {window.location.search}</div>
      <div style={{ marginTop: 6 }}>
        Tip: check DevTools ➜ Network for <code>rpc/my_rank20_group_members</code>.
      </div>
      <div style={{ marginTop: 6 }}>
        Press <b>Shift+S</b> to toggle this overlay (dev only).
      </div>
    </div>,
    root
  );
}