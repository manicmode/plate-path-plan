# Arena V2 Release Closeout Checklist

## Merge & Tag
- [ ] Merge PR to main
- [ ] Create & push tag: `v2.0.0`
- [ ] Confirm Actions "Release (tag)" ran successfully

## Health Check
- [ ] `/healthz` returns `{ ok:true, version:"2.0.0", arena:"v2", hardDisabled:false }`

## UI Functional Tests
- [ ] Navigate `/game-and-challenge` → no maintenance card visible
- [ ] Click "Join Arena" (if needed) → success
- [ ] Send chat message → appears in realtime
- [ ] Flip flag ON → maintenance banner appears within ~1s
- [ ] Flip flag OFF → banner disappears within ~1s

## Monitoring Setup
- [ ] HEALTHZ_URL secret configured in GitHub repository
- [ ] Monitor workflow `.github/workflows/monitor-arena.yml` runs successfully

## Documentation
- [ ] Security hardening verified and documented
- [ ] Release notes updated
- [ ] User documentation reflects Arena V2 features

## Rollback Plan
- [ ] Soft rollback script tested: `sql/rollback/arena_v2_soft_rollback.sql`
- [ ] Hard rollback script available: `sql/rollback/arena_v2_hard_rollback.sql`