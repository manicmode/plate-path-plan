# Arena V2 Runtime UI Checklist

## Navigation Tests
- [ ] **Homepage**: Loads without errors
- [ ] **Game & Challenge**: `/game-and-challenge` page accessible
- [ ] **Arena Panel**: Displays correctly when flag disabled

## Arena Functionality  
- [ ] **Join Button**: "Join Arena" works (creates membership)
- [ ] **Chat Interface**: Message input enabled when not hard-disabled
- [ ] **Real-time Updates**: Messages appear instantly
- [ ] **Leaderboard**: Shows current rankings

## Flag Toggle Tests
- [ ] **Flag ON**: 
  - Maintenance card appears on `/game-and-challenge`
  - Chat input disabled with message
  - UI updates within ~1 second
- [ ] **Flag OFF**:
  - Maintenance card disappears  
  - Chat input re-enabled
  - Normal functionality restored
  - UI updates within ~1 second

## Health Endpoint
- [ ] **GET /healthz**: Returns expected JSON structure
- [ ] **Response Time**: < 500ms
- [ ] **Status Codes**: 200 for healthy, appropriate codes for issues

## Security Verification
- [ ] **Anon Access**: Cannot read runtime_flags
- [ ] **Auth Access**: Can read flags, cannot write
- [ ] **Chat Mutations**: UPDATE/DELETE blocked via RLS
- [ ] **Real-time**: Flag changes propagate immediately

## Performance
- [ ] **Page Load**: < 3 seconds
- [ ] **Flag Updates**: UI responds within 1 second
- [ ] **Chat Messages**: Real-time delivery < 1 second

Date: 2025-08-17
Status: Ready for production deployment