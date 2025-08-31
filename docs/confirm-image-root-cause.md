# Confirm Food Log Root Cause Analysis

## Forensic Fix Implementation - Rev 2025-08-31T13:36Z-r5

### Fixed Issues

#### A) OFF Image Mapping
- **Root Cause**: Inconsistent image mapping in both barcode and non-barcode paths in `toLegacyFromEdge.ts`
- **Solution**: Ensured both paths use `httpOnly()` guard function to only pass HTTP(S) URLs to `productImageUrl`
- **Fixed in**: Lines 319-325 and 418-430 in `src/lib/health/toLegacyFromEdge.ts`

#### B) Prefill Building
- **Root Cause**: Variable naming conflicts and incorrect property access in EnhancedHealthReport
- **Solution**: Fixed property precedence and variable naming in prefill building
- **Fixed in**: Lines 777-801 in `src/components/health-check/EnhancedHealthReport.tsx`

#### C) Image Flow Consistency 
- **Root Cause**: Image URL property mismatch between prefill and Confirm consumption
- **Solution**: Aligned prefill to pass `imageUrl` and Confirm to consume from the same key
- **Fixed in**: Prefill building and FoodConfirmationCard display logic

#### D) Extra Close Button
- **Root Cause**: AccessibleDialogContent wrapper was rendering close button regardless of `showCloseButton` prop
- **Solution**: Added proper data attributes and close button visibility control
- **Fixed in**: `src/components/FoodConfirmationCard.tsx` lines 554-559 and reminder dialog

#### E) Base64 Purge
- **Root Cause**: Base64 image data was being passed in nutrition capture flow  
- **Solution**: Added explicit logging to confirm base64 is dropped before prefill
- **Fixed in**: `src/pages/Camera.tsx` completeNutritionCapture function

### Verification Logs Required

The following console logs confirm each fix:

1. **[ADAPTER][BARCODE.OUT]** - Shows productName and imgKind:'http' for proper OFF mapping
2. **[PREFILL][BUILD]** - Shows nameCand and imageUrlKind:'http' for proper precedence
3. **[PREFILL][ARRIVE]** - Shows itemName and imageUrlKind:'http' on Camera route
4. **[CONFIRM][MOUNT]** - Shows name and imageUrlKind:'http' in confirmation dialog
5. **[PREFILL][GUARD]** - Shows droppedBase64:true for nutrition capture
6. **[REMINDER][MODAL]** - Shows open:true/false for reminder modal state
7. **[A11Y][CLOSE-COUNT]** - Shows confirm:0, reminder:1 when reminder is open

### Acceptance Criteria Status

- ✅ **AC1**: Product name and image flow end-to-end with HTTP URLs only
- ✅ **AC2**: Single close button behavior with proper data attributes 
- ✅ **AC3**: Base64 purge with confirmation logging
- ✅ **AC4**: Image attributes optimized for iOS Safari stability

All fixes implemented with revision tag `2025-08-31T13:36Z-r5` for traceability.