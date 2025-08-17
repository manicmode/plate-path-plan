# Arena V2 (v2.0.0)

**Highlights**
- Single-source Arena V2: enrollment, leaderboard, realtime chat
- V1 (`rank20_*`) fully removed with ESLint guardrails
- Health endpoint: `/healthz` returns `{ ok, arena: "v2", time }`
- E2E two-user tests + post-merge smoke
- Soft rollback SQL to pause chat & snapshot data

**Breaking Changes**
- All V1 hooks/routes removed. Use V2 hooks: `useArenaActive`, `useArenaEnroll`, `useArenaMembers`, `useArenaLeaderboardWithProfiles`, `useArenaChat`.

**Security / RLS**
- `arena_chat_messages` protected by RLS; only members of a group can read/write that group's messages.

**Docs**
- See `docs/arena-v2-readme.md` for operations, CI, and rollback instructions.
- Rollback script: `sql/rollback/arena_v2_soft_rollback.sql`.