# Health Scan Fallback Flow Documentation

## Overview
When barcode scanning or image analysis fails in the Health Check Modal, users have two fallback options:
1. Manual text entry (type food name or barcode)
2. Voice-to-text entry (speak food name)

## Call Graph

### Entry Points
- **NoDetectionFallback**: Shown when no product is detected in image
- **ManualEntryFallback**: Shown when user chooses manual entry option

### Components & Flow

```
HealthCheckModal
├── NoDetectionFallback (onManualEntry) 
│   ├── onRetryPhoto() -> HealthScannerInterface
│   ├── onRetryCamera() -> HealthScannerInterface  
│   ├── onManualEntry() -> ManualEntryFallback
│   └── onVoiceEntry() -> ManualEntryFallback (voice mode)
│
└── ManualEntryFallback (onManualEntry: string, type: 'text'|'voice')
    ├── Text Input -> handleManualEntry()
    ├── Voice Input -> useVoiceRecording() -> handleManualEntry()
    └── Quick Suggestions -> handleManualEntry()
```

### Data Flow

#### 1. Text Entry Path
```
User types "vanilla greek yogurt"
├── ManualEntryFallback.handleTextSubmit()
├── HealthCheckModal.handleManualEntry(query, 'text')
├── isBarcode() check -> false
├── supabase.functions.invoke('gpt-smart-food-analyzer')
├── Transform GPT response to HealthAnalysisResult
└── setCurrentState('report')
```

#### 2. Voice Entry Path  
```
User speaks "vanilla greek yogurt"
├── useVoiceRecording.startRecording()
├── MediaRecorder captures audio -> base64
├── supabase.functions.invoke('voice-to-text')
├── Returns transcribed text
├── ManualEntryFallback.handleVoiceSubmit()  
├── HealthCheckModal.handleManualEntry(transcribedText, 'voice')
└── Same as text entry path
```

#### 3. Barcode Detection Path
```
User types "1234567890123" 
├── isBarcode() check -> true (8-14 digits)
├── supabase.functions.invoke('enhanced-health-scanner', {mode: 'barcode'})
├── toLegacyFromEdge() adapter
└── setCurrentState('report')
```

## Props & Types

### NoDetectionFallback Props
```typescript
interface NoDetectionFallbackProps {
  onRetryPhoto: () => void;
  onRetryCamera: () => void; 
  onManualEntry: () => void;
  onVoiceEntry?: () => void;
  onBack: () => void;
  status: 'no_detection' | 'not_found';
}
```

### ManualEntryFallback Props
```typescript
interface ManualEntryFallbackProps {
  onManualEntry: (query: string, type: 'text' | 'voice') => void;
  onBack: () => void;
}
```

### useVoiceRecording Return Type
```typescript
interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  transcribedText: string | null;
  isVoiceRecordingSupported: () => boolean;
}
```

## Current Issues & Improvements Needed

### 1. Text Search Limitations
- Currently uses `gpt-smart-food-analyzer` which is GPT-based estimation
- No direct OpenFoodFacts text search integration
- No ranked search results - returns single best guess
- No user selection of alternatives

### 2. Voice Flow Issues  
- No transcript editing before search
- No fallback if server STT fails
- Limited error handling for browser compatibility

### 3. Result Consistency
- Different result shapes from barcode vs text/voice paths
- No unified CanonicalSearchResult interface
- Inconsistent error states and fallbacks

## Recommended Improvements

1. **Unified Search Pipeline**: Create `searchFoodByName()` with OpenFoodFacts integration
2. **Progressive Voice STT**: Browser first, server fallback  
3. **Ranked Results**: Show top 10 matches with user selection
4. **Consistent Data Shape**: Single adapter for all result types