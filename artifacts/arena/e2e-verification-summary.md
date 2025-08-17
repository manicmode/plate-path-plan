# Arena V2 E2E Test Verification Summary

## Test Suite Created ✅

### Files Added:
- `playwright.config.ts` - Playwright configuration with artifacts output
- `scripts/e2e-seed.ts` - User seeding script (service role or manual creds)
- `e2e/utils/auth.ts` - Authentication helpers for browser context
- `e2e/arena-v2.spec.ts` - Main E2E test spec with 2 test cases
- `.github/workflows/e2e.yml` - CI integration with secret handling

### Dependencies Added:
- `@playwright/test@latest` - E2E testing framework
- `tsx@latest` - TypeScript execution for seeding script

## Auth Strategy ✅

**Option 1: Service Role Key** (detected in existing workflows):
- Uses `SUPABASE_SERVICE_ROLE_KEY` to create test users
- Creates: `arena-e2e-a@example.com` / `arena-e2e-b@example.com`
- Auto-confirms emails for instant password login

**Option 2: Manual Test Users**:
- Uses `E2E_USER_A_EMAIL/PASSWORD` and `E2E_USER_B_EMAIL/PASSWORD`
- Assumes users already exist and are confirmed

**Auto-Skip**: If neither option available, tests skip with clear message

## Test Coverage ✅

### Test 1: Enrollment Joins Users to Same Group
- Signs in User A & B in separate browser contexts  
- Navigates both to `/game-and-challenge`
- Verifies "Arena" header visible
- Handles enrollment via "Join Arena" button or direct RPC call
- Asserts both users get same `groupId` 
- Verifies leaderboard renders
- **Network proof**: Captures all `/rpc/` and `/rest/v1/` calls
- **Assertion**: No `rank20_*` or `diag_rank20` calls
- **Assertion**: V2 calls present (`arena_get_active_group_id`, `arena_chat_messages`)

### Test 2: Realtime Chat Between Users  
- Ensures both users enrolled in same group
- User A sends `ping-A-${timestamp}` message
- Waits for message in User A chat (≤5s)
- Waits for message in User B chat via realtime (≤8s) 
- User B replies `pong-B-${timestamp}`
- Waits for reply in User A chat via realtime (≤8s)
- Screenshots captured at each step

## CI Integration ✅

### GitHub Actions Workflow:
- Triggers: PR and main branch pushes
- Steps: Install deps → Install Playwright → Seed users → Run tests
- **Secret Handling**: Graceful fallback if secrets missing
- **Artifact Upload**: Screenshots, videos, traces, HTML reports
- **Timeout**: 20 minutes max

### Required Repository Secrets:
```
SUPABASE_URL (optional, has default)
SUPABASE_ANON_KEY (optional, has default)  
SUPABASE_SERVICE_ROLE_KEY (preferred)

# OR alternative manual users:
E2E_USER_A_EMAIL
E2E_USER_A_PASSWORD  
E2E_USER_B_EMAIL
E2E_USER_B_PASSWORD
```

## Expected Test Results ✅

### When Properly Configured:
```
✅ Arena V2 E2E > enrollment joins users to same group (5-10s)
✅ Arena V2 E2E > realtime chat works between users (8-15s)

📊 Network Calls (no legacy):
✅ POST /rpc/arena_get_active_group_id  
✅ POST /rpc/arena_enroll_me
✅ GET /rest/v1/arena_chat_messages
✅ POST /rest/v1/arena_chat_messages

🚫 No rank20_* or diag_rank20 calls detected

📸 Screenshots saved:
- ./artifacts/arena/before-enrollment-a.png
- ./artifacts/arena/after-enrollment-a.png  
- ./artifacts/arena/chat-final-a.png
- (same for user B)
```

### When Secrets Missing:
```
⚠️  SKIP: Missing auth credentials - need SUPABASE_SERVICE_ROLE_KEY or E2E_USER_* env vars
   E2E tests will auto-skip with clear message
```

## Documentation Updated ✅

Added comprehensive "E2E Tests & CI" section to `docs/arena-v2-readme.md`:
- Local test running instructions
- Secret configuration options  
- Test coverage explanation
- CI integration details
- Troubleshooting guide

## Manual Verification Steps

To verify this E2E suite works:

1. **Set up secrets** in repository settings or locally:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
   # OR provide manual test users
   ```

2. **Run locally**:
   ```bash
   npm run e2e:seed  # Should create/verify test users
   npm run e2e:test  # Should run 2 tests successfully
   ```

3. **Verify CI**: Push to PR branch and check GitHub Actions tab

4. **Check artifacts**: Screenshots and videos should be captured on test runs

## Security Notes ✅

- Test users are clearly marked (`arena-e2e-*@example.com`)
- Service role key only used for user creation, not stored in browser
- Browser contexts use standard auth flow (password login)
- RLS policies respected (users must be arena members to chat)
- Auto-skip prevents CI failures when secrets unavailable

## Expected Failure Modes

1. **Auth timeout**: Increase wait times in auth helpers
2. **Chat message timeout**: Check realtime subscription setup  
3. **Network assertion fails**: Legacy V1 code still present
4. **Enrollment fails**: RLS policy or membership issues
5. **Build timeout**: Vite preview takes too long to start

All failure modes include detailed error messages and artifact capture for debugging.