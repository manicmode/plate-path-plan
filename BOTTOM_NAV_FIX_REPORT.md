# Bottom Nav vs Scanner/Modal Overlap Fix

## Root Cause Analysis

**Revision Tag:** NAV_REV=2025-08-31T16:55Z  

### Problem Statement
Bottom navigation menu was overlapping with scanner interfaces and photo capture modals, creating a see-saw problem where fixing one flow would break another. Users couldn't access bottom controls in scanner screens, and modal actions were obscured.

### Root Causes Identified

#### 1. No Centralized State Management
**File:** Multiple components  
**Issue:** Each component had its own ad-hoc solution for hiding/showing bottom nav
- Scanner pages used path-based logic in Layout.tsx
- Modals had no way to communicate their state to the layout
- Changes to one area would break others

#### 2. Z-Index Conflicts  
**File:** src/components/Layout.tsx:299  
**Before:** `z-[80]` for bottom nav
**Issue:** Bottom nav had higher z-index than modals (z-60), causing overlap

#### 3. Inconsistent Safe Area Handling
**File:** src/components/Layout.tsx:282-293  
**Issue:** Complex conditional padding logic that was error-prone and didn't account for immersive states

## Solution Implemented

### 1. UI Chrome Controller (Single Source of Truth)
**File:** `src/lib/uiChrome.ts` (created)
- Centralized immersive state management
- Global `setImmersive(on: boolean)` function
- React hook `useImmersive()` for components to subscribe
- DOM data attribute `body[data-immersive]` for CSS targeting
- Structured logging with NAV_REV tag

### 2. Layout Integration  
**File:** `src/components/Layout.tsx`
**Lines:** 15, 38, 134-142, 299-300
- Imported `useImmersive` hook
- Updated nav visibility logic to include immersive state
- Changed z-index from 80 to 30 (below modals)
- Added `data-bottom-nav` attribute for identification

### 3. CSS Stacking & Safe Areas
**File:** `src/index.css`
**Lines:** 1556-1589
- Added CSS variables for safe areas and nav height
- Proper stacking: nav (z-30), modals (z-60), scanner sheets (z-61)  
- Immersive mode removes bottom padding: `body[data-immersive="true"] .app-content`

### 4. Component Integration
**Files:**
- `src/pages/ScanHub.tsx`: Added `useAutoImmersive(true)` 
- `src/components/scan/PhotoCaptureModal.tsx`: Added `useAutoImmersive(open)`
- `src/components/health-check/HealthScannerInterface.tsx`: Added `useAutoImmersive(true)`

### 5. Modal Portal Fix
**File:** `src/components/ui/dialog.tsx`
- Wrapped dialog portal content in `.modal-portal` class
- Ensures modals attach to body with proper z-index

## Verification

### Expected Console Logs (with VITE_DEBUG_NAV=1)

```
[NAV][IMMERSIVE] { rev: "2025-08-31T16:55Z", route: "/scan", on: true }
[NAV][RENDER] { rev: "2025-08-31T16:55Z", immersive: true, shouldShowNavigation: false }
```

### Test Scenarios

1. **Home → ScanHub**: Bottom nav hidden, scanner controls visible
2. **Health Check Modal**: Bottom nav hidden when modal open, visible when closed  
3. **Photo Capture Modal**: Bottom nav hidden during capture, restored after
4. **Regular Navigation**: Bottom nav visible on Home, Analytics, Coach pages
5. **iOS Safari Safe Areas**: Proper padding maintained in all states

### Regression Prevention

- Removed path-based nav hiding logic
- Single controller prevents future ad-hoc solutions
- Clear documentation in uiChrome.ts about when to use `setImmersive(true)`

## Files Modified

1. **Created:** `src/lib/uiChrome.ts` - UI Chrome Controller
2. **Modified:** `src/components/Layout.tsx` - Integrated immersive state  
3. **Modified:** `src/index.css` - Added stacking and safe area CSS
4. **Modified:** `src/pages/ScanHub.tsx` - Added immersive mode
5. **Modified:** `src/components/scan/PhotoCaptureModal.tsx` - Added immersive mode
6. **Modified:** `src/components/health-check/HealthScannerInterface.tsx` - Added immersive mode
7. **Modified:** `src/components/ui/dialog.tsx` - Added modal portal class

## Key Rule
**Only scanner routes and take-photo modals call `setImmersive(true)`. Everything else inherits the default (false).**

This prevents future regressions where fixing one flow breaks another by maintaining a single source of truth for UI chrome visibility.