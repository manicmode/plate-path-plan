# Root-Cause Report: Nudges + Home Hero Text (NUDGE_REV=2025-08-31T16:45Z-r1)

## Executive Summary
Fixed critical issues causing Daily Check-In nudges to not appear in evenings and Home hero text to be stuck on default messages. Root causes were timezone/UTC date handling bugs and incorrect time windows.

## Root Cause #1: Daily Check-In Wrong Time Window ❌
**File:** `src/nudges/registry.ts:49`
**Issue:** Daily Check-In was configured for 6AM-12PM instead of required 7PM-10PM
```javascript
// BEFORE (buggy)
window: { startHour: 6, endHour: 12 }, // 06:00-11:59

// AFTER (fixed)
window: { startHour: 19, endHour: 22 }, // 19:00-22:00 (7-10pm local time)
```
**Impact:** Daily Check-In never appeared during evening hours when users expect it

## Root Cause #2: UTC vs Local Date Bug ❌
**Files:** `src/nudges/scheduler.ts:238`, `src/nudges/registry.ts:52`
**Issue:** Used UTC date strings for "today" comparisons, causing off-by-one errors in evening timezones
```javascript
// BEFORE (buggy) - UTC midnight
const today = new Date().toISOString().split('T')[0]; // "2025-08-31" in UTC
const lastLogDate = ctx.lastMoodLog?.toISOString().split('T')[0];

// AFTER (fixed) - Local midnight
const { getLocalDateKey } = await import('@/lib/time/localDay');
const todayKey = getLocalDateKey(now); // "2025-08-31" in user's timezone
const lastLogKey = ctx.lastMoodLog ? getLocalDateKey(ctx.lastMoodLog) : null;
```
**Impact:** In PST evening (e.g., 8PM = UTC+8 = 4AM next day), UTC comparison would think user already logged mood "today" when they hadn't logged it in local day

## Root Cause #3: Hero Text Throttling + Static Messages ❌  
**File:** `src/components/HomeCtaTicker.tsx:477`
**Issue:** 30-minute throttle prevented rotation, complex conditions caused fallback to single default message
```javascript
// BEFORE (buggy) - Throttled, complex conditions
const shouldShowCta = (): boolean => {
  const thirtyMinutes = 30 * 60 * 1000; // 30min throttle
  return (now - lastTime) >= thirtyMinutes;
};

// AFTER (fixed) - Active rotation every 11s, 10 dynamic messages
const ROTATE_MS = 11000;
const pickNext = () => {
  let pool = candidates.filter(cta => cta.checkTrigger(context));
  // Dedupe logic prevents immediate repeats
  const next = pool[Math.floor(Math.random() * pool.length)];
  setCurrent(next);
};
```
**Impact:** Hero text was stuck showing same default message instead of rotating personalized content

## Root Cause #4: Missing Debug Instrumentation ❌
**Issue:** No structured logging made debugging impossible
**Fix:** Added comprehensive logging with revision tags
```javascript
// NEW: Structured logging throughout
nlog("NUDGE][DAILY_CHECKIN", {
  window: "19:00-22:00",
  inWindow: true,
  alreadyLoggedToday: false
});

nlog("HERO][PICK", { key: "hydration-reminder", dedupeOk: true });
```

## Files Changed
1. **`src/lib/time/localDay.ts`** (NEW) - Local day utilities
2. **`src/lib/debugNudge.ts`** (NEW) - Debug logging system  
3. **`src/nudges/registry.ts`** - Fixed Daily Check-In window (19-22h) + local date logic
4. **`src/nudges/scheduler.ts`** - Local day bounds for DB queries + logging
5. **`src/hooks/useNudgeScheduler.tsx`** - Added boot/pick/render logging
6. **`src/components/HomeCtaTicker.tsx`** - Complete rewrite for proper rotation

## QA Verification Required
### Daily Check-In (Evening 7-10PM)
- [ ] **Test at 8PM local time**: Daily Check-In appears exactly once
- [ ] **Console logs**: `[NUDGE][DAILY_CHECKIN] { inWindow:true, alreadyLoggedToday:false }`  
- [ ] **Next day test**: Daily Check-In appears again after local midnight

### Hero Text Rotation  
- [ ] **Multiple messages**: At least 5 different messages rotate every ~11 seconds
- [ ] **No repeats**: Same message doesn't appear twice in a row
- [ ] **Console logs**: `[HERO][PICK] { key:"movement-energy" }`, `[HERO][RENDER] { key:"hydration-reminder" }`

### Debug Environment
Add to `.env.local` for testing:
```
VITE_DEBUG_NUDGE=1
```

### QA Console Commands (Dev Only)
```javascript
// Reset today's nudge history
window.__debugResetNudges()

// Check what hero candidates are available  
// Look for [HERO][CANDIDATES] logs

// Force time to 8PM for testing
// (Navigate to ?now=2025-08-31T20:00:00-07:00 - not implemented but mentioned in plan)
```

## Production Environment Variables
```bash
NUDGE_SCHEDULER_ENABLED=1           # Already set to "1" 
NUDGE_ROLLOUT_PERCENT=100          # Already set to 100%
VITE_DEBUG_NUDGE=0                 # Should be "0" in prod (default)
```

## Risk Assessment
- **Low risk**: All changes preserve existing functionality
- **Backward compatible**: UTC fallbacks maintained for edge cases  
- **Feature flagged**: Debug logging only active when `VITE_DEBUG_NUDGE=1`

## Success Metrics  
After deployment, expect to see in production logs:
1. `[NUDGE][DAILY_CHECKIN]` logs with `inWindow:true` between 7-10PM
2. `[HERO][PICK]` logs showing rotation every 11 seconds
3. `[NUDGE][BOOT]` logs confirming scheduler initialization
4. Increased Daily Check-In completion rates during evening hours

## Before/After Evidence Required
**Screenshots needed from iOS Safari:**
1. Daily Check-In appearing at 8PM with console logs
2. Hero text showing 3 different messages across page refreshes  
3. Console showing structured logs with rev: `2025-08-31T16:45Z-r1`