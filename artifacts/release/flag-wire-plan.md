# Hard Disable Flag Implementation Plan

## Files Created
- `src/hooks/useRuntimeFlag.ts` - Query runtime flags with fallbacks

## Files Modified  
- `src/hooks/useArena.ts` - Added flag check before enrollment
- `src/hooks/useArenaChat.ts` - Added flag check before sending messages
- `src/components/arena/ArenaV2Panel.tsx` - Show maintenance message when flag enabled
- `src/components/arena/ArenaBillboardChatPanel.tsx` - Disable chat input when flag enabled
- `src/pages/HealthCheck.tsx` - Include hardDisabled status in health JSON

## Behavior Changes
- When `arena_v2_hard_disable` is true:
  - Arena panel shows maintenance message
  - Chat input is disabled with tooltip
  - Enrollment is blocked with toast
  - Health endpoint includes `hardDisabled: true`
- Graceful fallbacks when flag table doesn't exist (defaults to false)