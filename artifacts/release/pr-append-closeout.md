## Post-Release Closeout (Arena V2 — v2.0.0)

**Health**
- `/healthz` returns `arena: "v2"` and env-driven `version` (from tag).  
- Evidence: `artifacts/release/healthz-runtime.json`

**Security / Guardrails**
- ESLint V1-ban rules active.
- V1 purge check: see `grep-*.txt` in `artifacts/release/` (runtime src only).

**CI / Monitoring**
- Release (tag) injects version via env.
- Scheduled monitor every 15m: `.github/workflows/monitor-arena.yml`  
  _Set `HEALTHZ_URL` secret to your deployed `/healthz`._

**Runbooks & Rollback**
- Runbook: `docs/arena-v2-runbook.md`
- Soft rollback: `sql/rollback/arena_v2_soft_rollback.sql`
- Hard rollback: `sql/rollback/arena_v2_hard_rollback.sql` (flag-based UI mute)

**Artifacts**
- Health/greps/build: `artifacts/release/*`