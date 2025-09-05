# Barcode Serving Label & Camera Teardown - Diagnostic Report

## Implementation Summary

Added temporary diagnostics and E2E tests to identify issues with:

1. **Barcode serving labels** showing "Per 100 g" instead of "Per serving (X g)"
2. **Camera teardown** not properly stopping when leaving scanner

## Added Diagnostics

### A) Camera.tsx - Barcode Flow
```javascript
// After function response parsed
console.log('[BARCODE][RAW]', {
  hasProduct: !!data?.product,
  servingCandidates: {
    serving_grams: data?.product?.serving_grams,
    serving_size_g: data?.product?.serving_size_g,
    serving_size_grams: data?.product?.serving_size_grams,
  }
});

// After mapping
console.log('[BARCODE][MAP:ITEM]', {
  name: mapped?.name,
  servingGrams: mapped?.servingGrams,
  calories: mapped?.calories,
  protein_g: mapped?.protein_g,
  carbs_g: mapped?.carbs_g,
  fat_g: mapped?.fat_g,
});

// Before opening confirm
console.log('[BARCODE][OPEN_CONFIRM]', {
  source: 'barcode',
  servingGrams: mapped?.servingGrams,
});
```

### B) FoodConfirmationCard.tsx - Render Guard & Bind
```javascript
// Before guards/bind
console.log('[CONFIRM][RENDER_GUARD][BARCODE]', {
  isOpen,
  hasItem: !!currentFoodItem,
  isBarcode: (currentFoodItem as any)?.source === 'barcode',
  skipNutritionGuard,
  bypassHydration,
  perGramSum,
  isNutritionReady,
});

console.log('[CONFIRM][BIND]', {
  title,
  servingG,
  preferItem,
  kcal: effective?.calories,
  protein: effective?.protein,
  carbs: effective?.carbs,
  fat: effective?.fat,
});
```

### C) LogBarcodeScannerModal.tsx - Camera Teardown
```javascript
// Camera teardown logging
console.log('[CAMERA][STOP]', {
  tracks: s.getTracks().map(t => ({ kind: t.kind, readyState: t.readyState })),
});
```

### D) Test-Only Hooks (behind ?e2e=1)
```javascript
// Camera.tsx - Test hooks for E2E
useEffect(() => {
  const isE2E = new URLSearchParams(location.search).get('e2e') === '1';
  if (isE2E && typeof window !== 'undefined') {
    (window as any).__appTestHooks = {
      handleBarcodeDetected: (barcode: string) => {
        console.log('[E2E] Test hook barcode detected:', barcode);
        handleBarcodeDetected(barcode);
      }
    };
  }
}, [location.search]);
```

## E2E Test Suite

Created `e2e/barcode-serving-and-camera.spec.ts` that:

- **Runs in dual modes**: VITE_BARCODE_V2=1 and VITE_BARCODE_V2=0
- **Captures artifacts**: Console logs, network requests, screenshots  
- **Tests serving labels**: Manual entry (UPC-A, EAN-13) and live scan
- **Tests camera teardown**: Open/close cycles, navigation away, track stopping

### Test Coverage

1. **Manual Barcode Entry Test**
   - Tests UPC-A: `012345678905`
   - Tests EAN-13: `4006381333931` 
   - Captures serving label text and screenshots
   - Verifies `enhanced-health-scanner` function calls

2. **Live Scan Test**
   - Opens scanner modal
   - Uses test hook for headless environments
   - Captures serving label and screenshots

3. **Camera Teardown Test**
   - Opens scanner → closes → repeats 2x
   - Navigates away to test route-change cleanup
   - Verifies video elements removed and tracks stopped
   - Checks for `[CAMERA][STOP]` logs

## Artifacts Generated

- `artifacts/console.A.json` - Console logs for VITE_BARCODE_V2=1
- `artifacts/console.B.json` - Console logs for VITE_BARCODE_V2=0
- `artifacts/network.A.json` - Network requests for mode A
- `artifacts/network.B.json` - Network requests for mode B
- `artifacts/screenshots/A/*.png` - Screenshots for mode A
- `artifacts/screenshots/B/*.png` - Screenshots for mode B

## Expected Findings

### Serving Label Issue
**Hypothesis**: The issue is likely that `bypassHydration` is not being set in the direct barcode success path in `Camera.tsx`. 

**Key diagnostic line**: Around line 1576 in Camera.tsx, before `setShowConfirmation(true)`, we likely need:
```javascript
setBypassHydration(true);
```

This would allow `FoodConfirmationCard` to prefer the barcode item's `servingGrams` value over the default 100g.

### Camera Teardown Issue  
**Hypothesis**: The camera tracks may not be properly stopped in all teardown paths, particularly:
- Modal close via `onOpenChange`
- Component unmount on route change
- Multiple open/close cycles

**Key diagnostic**: The `[CAMERA][STOP]` logs will show which cleanup paths are missing track stopping.

## Proposed Surgical Fixes

### 1. Serving Label Fix (Camera.tsx)
```diff
  setInputSource('barcode');
  setRecognizedFoods([recognizedFood]);
  setSelectedImage(null);
  setPendingItems([]);
+ setBypassHydration(true);  // Allow FoodConfirmationCard to prefer barcode servingGrams
  setShowConfirmation(true);
```

### 2. Camera Teardown Fix (if gaps found)
Ensure all cleanup paths include:
```javascript
(videoEl?.srcObject as MediaStream | null)?.getTracks?.().forEach(t => t.stop());
videoEl.srcObject = null;
console.log('[CAMERA][STOP]', { tracks: ... });
```

## Running the Tests

```bash
# Run E2E tests for both modes
npx playwright test e2e/barcode-serving-and-camera.spec.ts

# View artifacts
ls artifacts/
ls artifacts/screenshots/A/
ls artifacts/screenshots/B/
```

The diagnostics are now in place and ready to identify the root causes of both issues.