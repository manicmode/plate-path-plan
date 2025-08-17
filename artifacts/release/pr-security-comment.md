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

### Live posture

**RLS status:**
```
relname                | relrowsecurity
-----------------------+---------------
arena_chat_messages    | true
runtime_flags          | true
```

**Policies (names, verbs, roles):**
```
tablename           | polname               | cmd    | roles
--------------------+-----------------------+--------+---------------
arena_chat_messages | arena_chat_delete     | DELETE | {authenticated}
arena_chat_messages | arena_chat_insert     | INSERT | {authenticated}
arena_chat_messages | arena_chat_select     | SELECT | {authenticated}
arena_chat_messages | arena_chat_update     | UPDATE | {authenticated}
runtime_flags       | runtime_flags_no_writes| ALL    | {public}
runtime_flags       | runtime_flags_select  | SELECT | {authenticated}
```

**Grants on runtime_flags (prove anon has none):**
```
(empty result - anon has no grants ✅)
```

**Realtime publication membership:**
```
tablename
--------------------
arena_chat_messages
runtime_flags
```

### Artifacts

- `artifacts/release/monitor-workflow.txt` - HEALTHZ_URL secret setup
- `artifacts/release/closeout-checklist.md` - Post-merge verification steps  
- `artifacts/release/tag-instructions.txt` - v2.0.0 tag creation commands
- `artifacts/release/healthz-runtime.json` - Expected health endpoint response
- `artifacts/release/runtime-ui-checklist.md` - UI smoke test procedures