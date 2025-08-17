### Arena V2 – Security Posture Snapshot (post-hardening)

- **RLS**: `runtime_flags` ✅, `arena_chat_messages` ✅
- **Grants**: `anon` ❌ SELECT on `runtime_flags`; `authenticated` ✅ SELECT; `service_role` ✅ ALL
- **Policies**:
  - `runtime_flags_select` (SELECT → authenticated) ✅
  - `runtime_flags_no_writes` (ALL → false) ✅
  - `arena_chat_insert`/`select` (members only) ✅ (pre-existing)
  - `arena_chat_update` (UPDATE → false) ✅
  - `arena_chat_delete` (DELETE → false) ✅
- **Realtime publication**: `runtime_flags`, `arena_chat_messages` ✅
- **Smoke**:
  - SELECT flag (auth) ✅
  - UPDATE/DELETE chat → RLS denied ✅

Security hardening complete. Arena V2 is ready for production deployment.