# Voice Agent Realtime QA Checklist

## Overview
This document outlines the testing requirements for the WebRTC-based Voice Agent feature. All tests must pass before user testing begins.

## Test Environment Setup

### Feature Flags Required
- `voice_coach_disabled`: `false` (enabled)
- `voice_coach_mvp`: `true` (MVP enabled)
- Environment: `VITE_VOICE_AGENT_ENABLED` ≠ `"false"`

### Authentication
- User must be logged in
- User must have either admin role OR `voice_coach_mvp` feature flag enabled

---

## Device & Browser Matrix

| Platform | Browser | Version | Status | Notes |
|----------|---------|---------|---------|-------|
| iOS | Safari | 17.0+ | ❌ | Top-level domain required for getUserMedia |
| Android | Chrome | 119+ | ❌ | WebRTC support verified |
| Desktop | Chrome | 119+ | ❌ | Primary development target |
| Desktop | Firefox | 120+ | ❌ | Secondary support |
| Desktop | Safari | 17.0+ | ❌ | WebKit compatibility |

---

## Core Functionality Tests

### 1. Connection Establishment
**Test**: Start voice session

| Step | Expected Behavior | Status | Screenshot | Console Output |
|------|-------------------|---------|------------|----------------|
| Click "Start" | Button shows "Connecting..." | ❌ | `[placeholder-start-click.png]` | `[placeholder-start-logs.txt]` |
| Microphone access | Browser prompts for mic permission | ❌ | `[placeholder-mic-permission.png]` | `[placeholder-mic-logs.txt]` |
| WebRTC connection | Connection state: "connected" | ❌ | `[placeholder-connection.png]` | `[placeholder-webrtc-logs.txt]` |
| Button state | Shows "End" with red styling | ❌ | `[placeholder-connected-ui.png]` | - |
| Success notification | "Voice chat connected!" toast | ❌ | `[placeholder-success-toast.png]` | - |

### 2. Audio Input/Output
**Test**: Bidirectional audio communication

| Step | Expected Behavior | Status | Screenshot | Console Output |
|------|-------------------|---------|------------|----------------|
| Speak to agent | Waveform/activity indicator (if implemented) | ❌ | `[placeholder-speaking.png]` | `[placeholder-audio-input.txt]` |
| Agent responds | Audio plays from `<audio>` element | ❌ | `[placeholder-agent-speaking.png]` | `[placeholder-audio-output.txt]` |
| Clear speech | Agent understands simple requests | ❌ | - | `[placeholder-understanding.txt]` |
| Background noise | Agent handles moderate noise levels | ❌ | - | `[placeholder-noise-handling.txt]` |

### 3. Tool Call Workflow
**Test**: Food logging with confirmation

| Step | Expected Behavior | Status | Screenshot | Console Output |
|------|-------------------|---------|------------|----------------|
| Say: "I ate an apple" | Agent asks for confirmation | ❌ | - | `[placeholder-food-request.txt]` |
| Agent response | "Should I log that apple for you?" | ❌ | - | `[placeholder-confirmation-ask.txt]` |
| Say: "Yes" | Agent calls `log_food` tool | ❌ | - | `[placeholder-tool-call.txt]` |
| Tool execution | Food entry created in database | ❌ | `[placeholder-db-entry.png]` | `[placeholder-db-logs.txt]` |
| Agent confirmation | "Logged apple to your nutrition log" | ❌ | - | `[placeholder-success-confirmation.txt]` |
| Follow-up question | Agent asks relevant follow-up | ❌ | - | `[placeholder-followup.txt]` |

**Test**: Exercise logging with confirmation

| Step | Expected Behavior | Status | Screenshot | Console Output |
|------|-------------------|---------|------------|----------------|
| Say: "I went running for 30 minutes" | Agent asks for confirmation | ❌ | - | `[placeholder-exercise-request.txt]` |
| Agent response | "Should I log that 30-minute run?" | ❌ | - | `[placeholder-exercise-confirmation.txt]` |
| Say: "Yes" | Agent calls `log_exercise` tool | ❌ | - | `[placeholder-exercise-tool-call.txt]` |
| Tool execution | Exercise entry created in database | ❌ | `[placeholder-exercise-db.png]` | `[placeholder-exercise-db-logs.txt]` |
| Agent confirmation | Exercise logged with details | ❌ | - | `[placeholder-exercise-success.txt]` |

**Test**: Page navigation

| Step | Expected Behavior | Status | Screenshot | Console Output |
|------|-------------------|---------|------------|----------------|
| Say: "Open analytics page" | Agent navigates to /analytics | ❌ | `[placeholder-navigation.png]` | `[placeholder-nav-logs.txt]` |
| URL change | Browser navigates successfully | ❌ | - | - |

### 4. Error Handling
**Test**: Various error scenarios

| Scenario | Expected Behavior | Status | Screenshot | Console Output |
|----------|-------------------|---------|------------|----------------|
| Poor audio quality | "I didn't catch that—could you repeat?" | ❌ | - | `[placeholder-audio-unclear.txt]` |
| Microphone denied | Clear error message + retry option | ❌ | `[placeholder-mic-denied.png]` | `[placeholder-mic-error.txt]` |
| Network interruption | Graceful disconnect + error message | ❌ | `[placeholder-network-error.png]` | `[placeholder-network-logs.txt]` |
| OpenAI API failure | "Voice service temporarily unavailable" | ❌ | `[placeholder-api-error.png]` | `[placeholder-api-error-logs.txt]` |
| Tool call failure | Agent reports failure gracefully | ❌ | - | `[placeholder-tool-error.txt]` |

### 5. Session Management
**Test**: Start/stop behavior

| Step | Expected Behavior | Status | Screenshot | Console Output |
|------|-------------------|---------|------------|----------------|
| Click "End" | Immediate disconnect | ❌ | `[placeholder-end-click.png]` | `[placeholder-end-logs.txt]` |
| Media streams | All tracks stopped | ❌ | - | `[placeholder-cleanup.txt]` |
| Button state | Returns to "Start" | ❌ | `[placeholder-reset-ui.png]` | - |
| End notification | "Voice chat ended" toast | ❌ | `[placeholder-end-toast.png]` | - |
| Multiple sessions | Can start new session after end | ❌ | - | `[placeholder-restart.txt]` |

---

## Debug Mode Testing

### Debug Panel Verification
**Test**: Debug information with `?debug=1`

| Element | Expected Content | Status | Screenshot |
|---------|------------------|---------|------------|
| Call State | "idle" → "connecting" → "live" | ❌ | `[placeholder-debug-states.png]` |
| Mic Device | Actual microphone device name | ❌ | `[placeholder-debug-mic.png]` |
| Last Error | Shows recent error messages | ❌ | `[placeholder-debug-errors.png]` |
| PC State | WebRTC connection state | ❌ | `[placeholder-debug-rtc.png]` |
| Stream Active | "Yes" when connected | ❌ | `[placeholder-debug-stream.png]` |
| Audio Tracks | Track count display | ❌ | `[placeholder-debug-tracks.png]` |

### Console Logging Verification
**Test**: Debug-only console output

| Event Type | Log Message Pattern | Status | Sample Output |
|------------|-------------------|---------|---------------|
| Start | `[VoiceAgent] start: Starting voice session` | ❌ | `[placeholder-console-start.txt]` |
| Microphone | `[VoiceAgent] microphone-access: {...}` | ❌ | `[placeholder-console-mic.txt]` |
| Data Channel | `[VoiceAgent] dc-open: Tools data channel opened` | ❌ | `[placeholder-console-dc.txt]` |
| Tool Calls | `[VoiceAgent] dc-message: Tool call received` | ❌ | `[placeholder-console-tools.txt]` |
| WebRTC Events | `[VoiceAgent] ontrack: Remote audio track received` | ❌ | `[placeholder-console-rtc.txt]` |
| Errors | `[VoiceAgent] start-error: {...}` | ❌ | `[placeholder-console-errors.txt]` |

---

## Access Control Testing

### Feature Flag Scenarios
**Test**: Different access configurations

| User Type | Flags | Environment | Expected Result | Status |
|-----------|-------|-------------|-----------------|--------|
| Admin | Any | Enabled | Full access | ❌ |
| MVP User | `voice_coach_mvp: true` | Enabled | Full access | ❌ |
| Regular User | `voice_coach_mvp: false` | Enabled | Access denied | ❌ |
| Any User | `voice_coach_disabled: true` | Enabled | Access denied | ❌ |
| Any User | Any | `VITE_VOICE_AGENT_ENABLED: "false"` | Access denied | ❌ |

### Access Denied UI
**Test**: Restriction messages

| Scenario | Expected Message | Status | Screenshot |
|----------|------------------|---------|------------|
| Environment disabled | "Voice Agent Disabled" | ❌ | `[placeholder-env-disabled.png]` |
| Feature flag disabled | "Access Restricted" | ❌ | `[placeholder-access-restricted.png]` |
| Admin UI | "Manage Access" button visible | ❌ | `[placeholder-admin-ui.png]` |
| Regular user UI | "Contact administrator" message | ❌ | `[placeholder-user-ui.png]` |

---

## Performance & Quality Metrics

### Audio Quality
| Metric | Target | Status | Measurement |
|--------|--------|---------|-------------|
| Latency | < 2 seconds | ❌ | `[placeholder-latency.txt]` |
| Audio clarity | Clear speech recognition | ❌ | `[placeholder-clarity.txt]` |
| Echo cancellation | No feedback loops | ❌ | `[placeholder-echo.txt]` |
| Background noise | Handles moderate levels | ❌ | `[placeholder-noise.txt]` |

### Resource Usage
| Resource | Target | Status | Measurement |
|----------|--------|---------|-------------|
| CPU usage | < 20% sustained | ❌ | `[placeholder-cpu.txt]` |
| Memory usage | < 100MB | ❌ | `[placeholder-memory.txt]` |
| Network bandwidth | < 50kb/s sustained | ❌ | `[placeholder-bandwidth.txt]` |

---

## Known Limitations

### Current Constraints
- iOS requires top-level domain for getUserMedia (staging domains may fail)
- WebRTC requires HTTPS in production
- Some corporate firewalls may block WebRTC traffic
- Tool confirmations required for all logging actions

### Browser-Specific Issues
- Safari: May require user gesture for autoplay
- Firefox: WebRTC implementation differences
- Mobile Chrome: Background tab limitations

---

## Test Completion Status

**Overall Progress**: 0/47 tests passed (0%)

### Critical Path Tests (Must Pass)
- [ ] Desktop Chrome connection establishment
- [ ] Basic audio bidirectional communication  
- [ ] Food logging with confirmation workflow
- [ ] Exercise logging with confirmation workflow
- [ ] Error handling for common scenarios
- [ ] Access control restrictions

### Secondary Tests (Should Pass)
- [ ] iOS Safari compatibility
- [ ] Android Chrome compatibility
- [ ] Debug mode functionality
- [ ] Performance metrics
- [ ] Edge case error handling

---

## Sign-off Requirements

Before user testing begins, the following must be complete:

1. **All Critical Path tests**: ✅ Pass
2. **Device matrix coverage**: Minimum 3/5 platforms 
3. **Error handling verification**: All scenarios tested
4. **Access control validation**: All user types tested
5. **Performance baseline**: Metrics documented
6. **Debug tools verification**: Console logs + debug panel working

**QA Sign-off**: ❌ Pending test execution  
**Engineering Sign-off**: ❌ Pending QA completion  
**Product Sign-off**: ❌ Pending engineering approval

---

*Last updated: [Current Date]*  
*Test environment: [Environment Details]*  
*Tester: [Tester Name]*