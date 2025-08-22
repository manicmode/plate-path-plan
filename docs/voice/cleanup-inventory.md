# Voice Coach Feature Cleanup Inventory

**Created on:** January 30, 2025  
**Branch:** feature/voice-agent-realtime-foundation  
**Purpose:** Inventory of all Voice Coach files to determine what to keep vs. remove before implementing new realtime voice agent

## Summary
The Voice Coach feature consists of multiple layers:
- **Core recording/transcription hooks** (reusable for new realtime agent)
- **Old UI components** (remove - will be replaced with realtime agent)
- **Feature flag system** (remove - new agent will use different flags)
- **Edge functions** (evaluate - may need updates for realtime)

---

## Files Analysis

### 🎯 **CORE HOOKS** (High reusability potential)

#### `src/hooks/useVoiceRecording.tsx`
**Decision:** KEEP  
**Rationale:** Generic voice recording hook used by multiple components (health scanner, manual entry, camera page). Not Voice Coach specific. Well-abstracted and reusable with proper error handling.

#### `src/features/voicecoach/hooks/useVoiceCoachRecorder.ts`
**Decision:** EVALUATE → Likely REMOVE  
**Rationale:** 208 lines, heavily Voice Coach specific with complex state management and blob handling. New realtime agent will need different recording patterns (streaming vs. blob-based). Extract any useful patterns but rebuild for realtime.

#### `src/features/voicecoach/hooks/useVadAutoStop.ts`
**Decision:** EVALUATE → Likely KEEP (refactored)  
**Rationale:** 207 lines of Voice Activity Detection logic with onset detection, silence tracking, and iOS optimizations. Core VAD logic is valuable for realtime agent but may need adaptation for streaming contexts.

#### `src/features/voicecoach/hooks/useTalkBack.ts`
**Decision:** KEEP (with modifications)  
**Rationale:** Text-to-speech functionality with iOS Safari handling and voice selection logic. Realtime agent will need TTS, so this is valuable foundation code.

---

### 🗑️ **UI COMPONENTS** (Voice Coach specific - remove)

#### `src/components/voice/VoiceCoach.tsx`
**Decision:** REMOVE  
**Rationale:** 496-line monolithic component specific to old Voice Coach UI. New realtime agent will have completely different interface patterns (streaming, real-time conversation).

#### `src/features/voicecoach/VoiceCoachRoute.tsx`
**Decision:** REMOVE  
**Rationale:** Route wrapper for old Voice Coach page. New realtime agent will live elsewhere.

#### `src/features/voicecoach/VoiceCoachFAB.tsx`
**Decision:** REMOVE  
**Rationale:** Currently returns `null` anyway. Old floating action button pattern.

#### `src/features/voicecoach/VoiceCoachFABWrapper.tsx`
**Decision:** REMOVE  
**Rationale:** Simple wrapper around disabled FAB component.

#### `src/features/voicecoach/VoiceCoachEntry.tsx`
**Decision:** REMOVE  
**Rationale:** Entry button component with old feature flag logic. New agent will have different entry points.

#### `src/features/voicecoach/VoiceCoachDiagnostics.tsx`
**Decision:** REMOVE  
**Rationale:** Diagnostics specific to old Voice Coach implementation.

#### `src/features/voicecoach/StartVoiceCoachButton.tsx`
**Decision:** REMOVE  
**Rationale:** Another implementation of Voice Coach button - appears to be duplicate/alternative to main component.

---

### 🔧 **FEATURE FLAGS & CONFIG**

#### `src/hooks/useVoiceCoachFeatureFlag.ts`
**Decision:** REMOVE  
**Rationale:** Specific to old Voice Coach feature flags (`voice_coach_mvp`, `voice_coach_disabled`). New realtime agent will use different flag structure.

---

### 🌐 **EDGE FUNCTIONS**

#### `supabase/functions/voice-turn/index.ts`
**Decision:** EVALUATE → Likely REMOVE  
**Rationale:** Designed for turn-based conversation (audio upload → transcribe → AI reply → return). Realtime agent needs streaming/websocket patterns, not HTTP request/response. May salvage some OpenAI integration patterns.

#### `supabase/functions/voice-to-text/index.ts`
**Decision:** KEEP (potentially useful)  
**Rationale:** Generic audio transcription service that could be useful for realtime agent as fallback or for specific use cases.

#### `supabase/functions/voice-health/index.ts`
**Decision:** KEEP  
**Rationale:** Health check functionality, not Voice Coach specific.

#### Other voice functions (`voice-minutes`, `log-voice`, `log-voice-gpt5`)
**Decision:** KEEP  
**Rationale:** These are related to food logging and other features, not Voice Coach specifically.

---

### 🔌 **SHARED/GENERIC COMPONENTS**

#### `src/components/ui/VoiceRecordingButton.tsx`
**Decision:** KEEP  
**Rationale:** Generic voice recording button used by health scanner and other features. Well-abstracted, not Voice Coach specific.

---

### 📝 **REFERENCES IN OTHER FILES**

#### Route definition in `src/App.tsx`
**Decision:** REMOVE (route only)  
**Rationale:** Remove the `/voice-coach` route and lazy import. Keep the app structure intact.

#### Feature flag demo in `src/components/FeatureFlagDemo.tsx`
**Decision:** CLEAN UP  
**Rationale:** Remove Voice Coach specific flag references, keep generic flag demo functionality.

#### Recovery AI Chat in `src/components/coach/recovery/RecoveryAIChat.tsx`
**Decision:** CLEAN UP  
**Rationale:** Remove `VoiceCoachEntry` import/usage. This component can function without it.

#### Health scanner components usage of `VoiceRecordingButton`
**Decision:** KEEP  
**Rationale:** These use the generic voice recording functionality, not Voice Coach specific.

---

## Removal Plan

### Phase 1: Clean up UI components
1. Remove `/voice-coach` route from `App.tsx`
2. Delete `src/features/voicecoach/` directory (except hooks to evaluate)
3. Delete `src/components/voice/VoiceCoach.tsx`
4. Clean up imports in `RecoveryAIChat.tsx` and `FeatureFlagDemo.tsx`

### Phase 2: Evaluate and refactor hooks
1. Extract useful patterns from `useVoiceCoachRecorder.ts`
2. Refactor `useVadAutoStop.ts` for realtime contexts if needed
3. Keep `useTalkBack.ts` but adapt for new agent needs

### Phase 3: Edge function cleanup
1. Remove `voice-turn` function (or mark deprecated)
2. Keep generic voice functions that serve other features

### Phase 4: Feature flag cleanup
1. Remove old Voice Coach feature flags from database
2. Delete `useVoiceCoachFeatureFlag.ts`
3. Clean up references in FeatureFlagDemo

---

## Files to Keep (Reusable Foundation)
- `src/hooks/useVoiceRecording.tsx` - Generic recording
- `src/hooks/useSpeechToLog.tsx` - Voice-based food logging (separate feature)
- `src/features/voicecoach/hooks/useTalkBack.ts` - TTS functionality  
- `src/features/voicecoach/hooks/useVadAutoStop.ts` - VAD logic (evaluate)
- `src/components/ui/VoiceRecordingButton.tsx` - Generic UI component
- `supabase/functions/voice-to-text/` - Generic transcription
- `supabase/functions/voice-health/` - Health checks
- Other voice functions serving different features

## Files to Remove (Voice Coach Specific)
- `src/components/voice/VoiceCoach.tsx`
- `src/features/voicecoach/VoiceCoach*.tsx` (all except hooks)  
- `src/features/voicecoach/hooks/useVoiceCoachRecorder.ts` (after evaluation)
- `src/hooks/useVoiceCoachFeatureFlag.ts`
- `supabase/functions/voice-turn/` (after evaluation)
- Route references in `App.tsx`
- Voice Coach imports in other components

**Total files to remove:** ~8-10 files  
**Total lines reduced:** ~1000+ lines  
**Reusable foundation preserved:** ~500+ lines of VAD/TTS logic