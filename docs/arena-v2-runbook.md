# Arena V2 Operations Runbook

## Quick Health Check

**Good State:**
```bash
curl https://your-app.com/healthz
```

**Expected Response:**
```json
{
  "ok": true,
  "version": "2.0.0",
  "arena": "v2", 
  "time": "2025-08-17T...",
  "db": "reachable"
}
```

**Quick Validation:**
```bash
# Check arena version
curl -s https://your-app.com/healthz | jq '.arena'  # Should return "v2"

# Check version format
curl -s https://your-app.com/healthz | jq '.version' | grep -E '^"[0-9]+\.[0-9]+\.[0-9]+"$'

# Check database connectivity
curl -s https://your-app.com/healthz | jq '.db'  # Should return "reachable"
```

## Common Issues & Fixes

### 1. "No Active Group" (Normal When Unauthenticated)
**Symptom:** Authenticated users see "Join Arena" instead of leaderboard
**Investigation:**
```sql
-- Check if user has arena membership
SELECT * FROM arena_memberships WHERE user_id = 'user-uuid';

-- Check active arena group
SELECT arena_get_active_group_id();
```
**Fix:** User needs to call `arena_enroll_me()` function

### 2. Chat Messages Not Appearing
**Symptom:** Messages sent but not visible to other users
**Investigation:**
```sql
-- Check RLS policies are active
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'arena_chat_messages';

-- Check recent messages
SELECT id, user_id, group_id, message, created_at 
FROM arena_chat_messages 
ORDER BY created_at DESC 
LIMIT 10;
```
**Fix:** Verify RLS policies; check realtime publication

### 3. Version Mismatch in /healthz
**Symptom:** `/healthz` shows wrong version or "0.0.0"
**Investigation:** Check if VITE_APP_VERSION was properly injected during build
**Fix:** Redeploy with correct tag-based version injection

### 4. Database Connection Issues
**Symptom:** `/healthz` shows `"db": "error"`
**Investigation:** Check Supabase connection and arena functions
**Fix:** Verify Supabase credentials and function permissions

### 5. RLS Insert Blocked
**Symptom:** "new row violates row-level security policy"
**Investigation:** 
```sql
-- Check user authentication
SELECT auth.uid();

-- Verify RLS policies for inserts
SELECT * FROM pg_policies WHERE tablename = 'arena_chat_messages' AND cmd = 'INSERT';
```
**Fix:** Ensure user_id is set to auth.uid() in insert statements

## Rollback Decision Tree

### Soft Rollback (Preferred)
**When:** Chat issues, minor functionality problems
**Action:** Run `sql/rollback/arena_v2_soft_rollback.sql`
**Effect:** Disables realtime, backs up messages, preserves data

### Hard Rollback (Emergency)
**When:** Critical security issues, widespread failures
**Action:** Run `sql/rollback/arena_v2_hard_rollback.sql`
**Effect:** Sets feature flag to hide Arena UI (requires code deployment to respect flag)

## Service Level Objectives (SLOs)

- **Availability:** 99.9% uptime for `/healthz` endpoint
- **Response Time:** p95 < 300ms for health checks
- **Chat Delivery:** 95% of messages delivered within 2 seconds
- **Enrollment Success:** 99% success rate for `arena_enroll_me()`

## Escalation Contacts

- **Primary:** Arena Team Lead
- **Secondary:** Platform Engineering
- **Critical:** On-call Engineer (PagerDuty)

## Monitoring & Alerts

- **Health Monitor:** `.github/workflows/monitor-arena.yml` (every 15 minutes)
- **Logs:** Check application logs for `[telemetry]` entries
- **Database:** Monitor RLS policy violations and function execution times

## Recovery Playbooks

### Arena Enrollment Stuck
1. Check `arena_get_active_group_id()` returns valid UUID
2. Verify `arena_memberships` table has correct user entries
3. Run manual enrollment: `SELECT arena_enroll_me();`

### Chat Not Working
1. Check realtime publication: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
2. Verify RLS policies on `arena_chat_messages`
3. Test message insert manually with proper user_id

### Version Deployment Issues
1. Verify tag was pushed: `git tag -l v*`
2. Check Actions workflow completion
3. Confirm environment variables were injected in build logs
4. Validate `/healthz` reflects correct version