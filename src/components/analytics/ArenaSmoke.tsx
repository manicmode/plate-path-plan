import React from "react";
import { useRank20Members } from "@/hooks/arena/useRank20Members";

export default function ArenaSmoke() {
  const { members, loading, error } = useRank20Members();
  const rows = (Array.isArray(members) ? members : []).map(m => ({
    user_id: m.user_id,
    display_name:
      (m.display_name?.trim?.() ? m.display_name : `User ${String(m.user_id).slice(0,5)}`),
    avatar_url: m.avatar_url ?? null,
    joined_at: m.joined_at,
  }));

  return (
    <div style={{background:'#FFF3CD', border:'1px solid #FFEC99', color:'#664d03', padding:12, borderRadius:8, marginBottom:12}}>
      <div style={{fontWeight:700}}>ARENA SMOKE</div>
      <div>members: {Array.isArray(members) ? members.length : 0}</div>
      <pre style={{whiteSpace:'pre-wrap', margin:0}}>
        {JSON.stringify(members?.slice?.(0,3) ?? [], null, 2)}
      </pre>
      <div style={{marginTop:8}}>rows: {rows.length}</div>
      <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
        {rows.map(r => (
          <div key={r.user_id} style={{padding:8, border:'1px dashed #aaa', borderRadius:6, background:'#fff'}}>
            {r.display_name} — {r.user_id}
          </div>
        ))}
      </div>
    </div>
  );
}