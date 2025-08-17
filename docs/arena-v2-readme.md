# Arena V2 - Single Source of Truth

## Overview

Arena V2 is the complete replacement for all legacy Arena V1 (`rank20_*`) functionality. V1 has been fully removed from the codebase as of this release.

## Architecture

### V2 Components
- **ArenaPanel**: Single entry point (`src/components/arena/ArenaPanel.tsx` → `ArenaV2Panel`)
- **Arena Hooks**: All functionality consolidated in `src/hooks/useArena.ts`
- **Chat Integration**: Real-time chat via `src/hooks/useArenaChat.ts`

### V2 Database Objects
- `arena_chat_messages` table with RLS policies
- `arena_memberships` table for user groups  
- `arena_get_active_group_id()` function
- `arena_enroll_me()` function

## V2 Hooks API

### Core Arena Hooks

```typescript
// Get user's active arena group
const { groupId, isLoading, error } = useArenaActive();

// Enroll user in arena
const { enroll, isEnrolling, error } = useArenaEnroll();

// Get arena members  
const { members, isLoading, error } = useArenaMembers(groupId);

// Get leaderboard
const { leaderboard, isLoading, error } = useArenaLeaderboardWithProfiles(groupId);

// Real-time chat
const { messages, sendMessage, isLoading, error } = useArenaChat(groupId);
```

### Usage Example

```typescript
function MyArenaComponent() {
  const { groupId } = useArenaActive();
  const { enroll, isEnrolling } = useArenaEnroll();
  
  if (!groupId) {
    return (
      <Button onClick={enroll} disabled={isEnrolling}>
        Join Arena
      </Button>
    );
  }
  
  return <ArenaLeaderboard groupId={groupId} />;
}
```

## Authentication Requirements

All Arena V2 functionality requires authentication:
- `auth.uid()` must be non-null
- RLS policies enforce user-specific access
- Chat messages are scoped to group membership

## Database Schema

### arena_chat_messages
- `group_id`: UUID linking to user's arena group
- `user_id`: UUID of message author  
- `message`: Text content
- `created_at`: Timestamp

### RLS Policies
- Users can only read/write messages for groups they're members of
- Membership verified via `arena_memberships` table

## How to Add Features

1. **New Arena Hook**: Add to `src/hooks/useArena.ts`
2. **New UI Component**: Import hooks from `@/hooks/useArena`  
3. **Database Changes**: Use migration tool for arena-related tables
4. **Real-time Features**: Extend `useArenaChat` or create similar patterns

### Example: Add Arena Notifications

```typescript
// 1. Add hook to useArena.ts
export function useArenaNotifications(groupId: string) {
  return useQuery({
    queryKey: ['arena', 'notifications', groupId],
    queryFn: () => fetchArenaNotifications(groupId),
    enabled: !!groupId
  });
}

// 2. Use in component
function ArenaNotifications() {
  const { groupId } = useArenaActive();
  const { data: notifications } = useArenaNotifications(groupId);
  
  return <NotificationsList notifications={notifications} />;
}
```

## Troubleshooting

### Common RLS Errors

**Error**: `new row violates row-level security policy`
**Fix**: Ensure `user_id` is set to `auth.uid()` in inserts

**Error**: `could not select from arena_chat_messages`  
**Fix**: Verify user has membership in `arena_memberships` table

### Authentication Issues

**Error**: Hooks return loading/null state indefinitely
**Fix**: Check `auth.uid()` is non-null via Supabase auth

### Network Debugging

V2 should only make these network calls:
- `/rpc/arena_get_active_group_id`
- `/rpc/arena_enroll_me` (enrollment only)
- `/rest/v1/arena_chat_messages` (realtime)
- `/rest/v1/arena_memberships` (membership queries)

If you see `rank20_*` or `diag_rank20` calls, V1 code still exists.

## Verification Checklist

Run these checks to verify V2-only operation:

### Code Greps (should return "OK"):
```bash
git grep -n "rank20_" src || echo "OK"
git grep -n "diag_rank20" src || echo "OK"  
git grep -n "ensureRank20" src || echo "OK"
git grep -n "useRank20" src || echo "OK"
```

### Build Checks:
```bash
npm run lint    # Should pass with no restricted-import violations
npm run build   # Should succeed with no Arena-related errors
```

### Runtime Smoke Test:
1. Navigate to `/game-and-challenge`
2. Verify header shows "Arena" (not "Arena V2")
3. If not enrolled, click "Join Arena"
4. Verify enrollment leads to leaderboard + chat UI
5. Send test message in chat
6. Verify message appears in real-time

### Network Verification:
- Monitor DevTools Network tab
- Should see only V2 endpoints listed above
- No legacy `rank20_*` RPC calls

## ESLint Guards

The following ESLint rules prevent V1 regression:

```javascript
"no-restricted-imports": ["error", {
  "patterns": [
    "*rank20*",
    "*ensureRank20*", 
    "*diag_rank20*"
  ]
}]
```

Any attempt to import V1 code will fail CI builds.

## Migration Notes

- **Complete**: All V1 code removed from runtime paths
- **Breaking**: Legacy `rank20_*` hooks/components no longer available
- **Backwards Compatibility**: None - hard migration to V2 only
- **Data**: V1 database tables remain for historical data only

## E2E Tests & CI

### Running E2E Tests Locally

```bash
# Requires authentication secrets
npm run e2e:seed  # Seeds test users (if SUPABASE_SERVICE_ROLE_KEY available)
npm run e2e:test  # Runs Playwright tests
npm run e2e       # Seed + test combined
```

### Required Secrets

**Option 1: Service Role Key** (preferred):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`

**Option 2: Test User Credentials**:
- `E2E_USER_A_EMAIL` / `E2E_USER_A_PASSWORD`
- `E2E_USER_B_EMAIL` / `E2E_USER_B_PASSWORD`

### What E2E Tests Cover

1. **Two-User Enrollment**: Both users join same Arena group
2. **Realtime Chat**: Message exchange across user sessions  
3. **Network Proof**: No legacy V1 calls, only V2 endpoints
4. **Leaderboard Rendering**: UI components mount correctly
5. **Authentication Flow**: Sign-in → enrollment → functionality

### CI Integration

- Runs on all PRs and main branch pushes
- Auto-skips if secrets missing (doesn't fail CI)
- Captures screenshots/videos on failure
- Uploads artifacts for debugging

### E2E Troubleshooting

**Tests auto-skip**: Add required secrets to repository settings

**Auth failures**: Verify test user credentials or service role key

**RLS errors**: Check user has arena membership after enrollment

**Chat timeout**: Ensure real-time subscriptions are working

**Network assertion fails**: Legacy V1 code may still exist

## Support

For Arena V2 issues:
1. Check authentication state first
2. Verify RLS policies via Supabase dashboard  
3. Run verification checklist above
4. Check network calls match expected V2 patterns
5. Run E2E tests locally to isolate issues