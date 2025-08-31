# Forensic Log Overlay Usage Guide

## 🧪 Mobile Forensic Debugging Interface

The Forensic Log Overlay provides a mobile-friendly debugging interface to investigate the 30g portion enforcement issue in health reports.

## Activation

### Method 1: URL Parameter (Temporary)
```
https://your-app.com?forensic=1
```

### Method 2: LocalStorage (Persistent)
```javascript
localStorage.setItem('forensic', '1')
// OR
localStorage.removeItem('forensic') // to disable
```

### Method 3: Long-Press Toggle (Mobile-Friendly)
1. Open the overlay (🧪 floating button)
2. Long-press the header for 3 seconds
3. Toggle will be saved to localStorage

## Features

### 🔍 Log Capture
- **Auto-captures**: Console logs matching `/[FORENSIC]|[TRIPWIRE]|[PORTION]|[WIDGET_SKIP]/i`
- **Buffer size**: Last 500 log entries
- **Monkey-patches**: console.debug, log, warn, error methods
- **Live stream**: New logs appear in real-time at bottom

### 📱 Mobile UI
- **Floating button**: Shows 🧪 icon with log count
- **Full-screen drawer**: Slides up from bottom
- **Auto-scroll**: New logs auto-scroll to bottom
- **Touch-friendly**: Large buttons and readable text

### 📋 Export Options
- **Copy**: Copies all logs to clipboard with timestamps
- **Share**: Uses native `navigator.share()` if available, falls back to copy
- **Clear**: Empties the log buffer
- **Format**: `[ISO_TIMESTAMP] [LEVEL] message`

### 📊 Build Information
- **Build ID**: Shows last 8 characters of build tag
- **Service Worker**: Shows SW controller state
- **Auto-parsed**: Extracted from `[FORENSIC][BUILD]` logs

## Auto-Open Behavior

### V2 Health Report Integration
- **Auto-opens**: When `EnhancedHealthReport` mounts and forensic mode is enabled
- **Purpose**: Immediately show forensic logs during 30g portion investigation
- **Dismissible**: Can be closed and reopened via floating button

## Log Patterns to Watch For

### ✅ Success Patterns
```
[FORENSIC][REPORT][MOUNT] { variant: "v2", build: "...forensic" }
[FORENSIC][INQ3][PROPS] { servingGrams: undefined, portionLabel: undefined }
[FORENSIC][RESOLVER][OUTPUT] { chosen: { source: "label", grams: 55 }, candidates: [...] }
[FORENSIC][CONFIRM][OUTPUT] { portionGrams: 55, imageKind: "url", imagePreview: "https://..." }
```

### ❌ Failure Patterns
```
[FORENSIC][INQ3][WIDGET_SKIP_OVERRIDE] { servingGrams: 30, stack: "..." }
[FORENSIC][PREFILL][MANUAL_PAYLOAD_PATH_TAKEN] Error at handlePrefill...
[FORENSIC][ASSERT] Missing norm/providerRaw in prefill
[FORENSIC][RESOLVER][OUTPUT] { chosen: { source: "fallback", grams: 30 }, ... }
```

## Debugging Workflow

1. **Enable forensic mode**: Add `?forensic=1` to URL or use localStorage
2. **Reproduce issue**: Navigate through Health Report → Log Food flow
3. **Check auto-opened overlay**: Logs should stream in real-time
4. **Export logs**: Copy or share for analysis
5. **Analyze patterns**: Compare against success/failure patterns above

## Mobile Testing

### PWA Long-Press Toggle
- When `?forensic=1` not available in installed PWA
- Long-press header (3 seconds) toggles localStorage flag
- Toast notification confirms state change
- Persists across app restarts

### Touch Interactions
- **Tap floating button**: Open overlay
- **Tap close button**: Minimize to floating button
- **Long-press header**: Toggle forensic mode
- **Touch scroll**: Manual scroll through logs

## Performance Notes

- **Minimal overhead**: Only active when forensic mode enabled
- **Memory limit**: 500 log buffer prevents unbounded growth
- **Pattern matching**: Efficient regex only processes matching logs
- **DOM virtualization**: Not implemented (assumes reasonable log volume)

## Integration Points

### Components Using Forensic Logs
- `EnhancedHealthReport.tsx` - V2 report mount detection
- `NutritionToggle.tsx` - INQ3 widget behavior tracking
- `portionResolver.ts` - Resolver input/output logging
- `confirmPayload.ts` - Payload builder instrumentation
- `Camera.tsx` - Prefill assertion and path tracking
- `App.tsx` - Build information logging

### Key Log Tags
- `[FORENSIC][BUILD]` - App boot information
- `[FORENSIC][REPORT][MOUNT]` - Report version detection  
- `[FORENSIC][INQ3][*]` - Widget prop and skip behavior
- `[FORENSIC][RESOLVER][*]` - Portion resolution process
- `[FORENSIC][CONFIRM][*]` - Payload construction
- `[FORENSIC][PREFILL]` - Camera prefill detection
- `[FORENSIC][ASSERT]` - Critical assertion failures
- `[FORENSIC][OFF]` - OpenFoodFacts data availability