# Camera Stream Cleanup Implementation

## Overview
Comprehensive camera stream cleanup has been implemented across all camera components to prevent red badge issues and memory leaks on mobile devices.

## Components Updated

### 1. Stream Utilities (`src/lib/camera/streamUtils.ts`)
- `stopStream()` - Safely stops all MediaStream tracks
- `detachVideo()` - Clears video element srcObject and attributes

### 2. Global Safety (`src/lib/camera/cameraGuardian.ts`)
- Page visibility change handler
- `pagehide` event handler for emergency cleanup
- Queries all video elements and stops streams

### 3. WebBarcodeScanner.tsx
- Added cleanup on modal close (button/ESC)
- Added unmount guard cleanup
- Uses new utility functions

### 4. HealthScannerInterface.tsx
- Enhanced existing cleanup with new utilities
- Added unmount guard cleanup
- Preserves camera inquiry logging

### 5. PhotoCaptureModal.tsx
- Added cleanup on exit handler
- Added unmount guard cleanup
- Enhanced existing cleanup function

## Exit Paths Covered

### Modal/Component Close
- Button click handlers
- ESC key / backdrop click
- `onOpenChange(false)` calls

### Route Changes
- React component unmount
- `useEffect` cleanup functions

### App State Changes
- Page visibility hidden
- `pagehide` event
- Document visibility change

## Verification Steps

1. **Open scanner → close**
   ```js
   // Expected logs:
   [CAM][INQ][STOP] WebBarcodeScanner
   [TRACK][ENDED] video
   window.__camDump() // Should return []
   ```

2. **Switch cameras → close**
   ```js
   // Old track stopped before new one attached
   [TRACK][STOP] video
   [CAM][INQ][ATTACH] new-stream-id
   // On close:
   [CAM][INQ][STOP] WebBarcodeScanner
   ```

3. **Photo capture → take photo → close**
   ```js
   [CAM][INQ][STOP] PhotoCaptureModal
   [TRACK][ENDED] video
   window.__camDump() // Should return []
   ```

## Debugging
- All cleanup preserves existing camera inquiry logging
- No changes to scanning/capture logic
- Uses `?camInq=1` for diagnostic output