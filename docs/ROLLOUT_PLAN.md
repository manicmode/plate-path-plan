# Enhanced Health Scanner Rollout Plan

## Phase 1: Adapter Improvements ✅ SHIP NOW

**Status**: Ready for immediate deployment  
**Risk**: Very Low  
**Impact**: Improved data mapping, better fallback handling

### Changes
- Enhanced `toLegacyFromEdge` adapter to read top-level `healthFlags` and `nutritionSummary`
- Fixed fallback handling: `fallback:true` → `status='no_detection'` with `null` score
- Added proper status detection for `'branded'|'branded_candidates'|'meal'|'none'` kinds

### Testing
- ✅ Unit tests for adapter mapping
- ✅ Fallback behavior verification
- ✅ Backward compatibility maintained

### Deployment
```bash
# Safe to deploy immediately
git push origin main
```

---

## Phase 2-3: Enhanced Image Analysis 🚧 STAGING FIRST

**Status**: Ready for staging testing  
**Risk**: Medium  
**Impact**: Better product detection, barcode-on-image detection

### Changes
- Enhanced barcode detection from OCR text
- Multi-candidate search and selection
- Improved confidence gating

### Feature Flag
```typescript
FEATURE_FLAGS.image_analyzer_v1 = true; // Enable on staging first
```

### Testing Checklist
- [ ] Deploy to staging environment
- [ ] Test on Android devices (camera functionality)
- [ ] Test on iOS devices (camera permissions)
- [ ] Verify barcode detection accuracy
- [ ] Validate candidate selection flow
- [ ] Performance testing with large images

### Rollout Steps
1. **Staging Deployment**
   ```bash
   # Enable flag on staging
   FEATURE_FLAGS.image_analyzer_v1 = true
   ```

2. **Mobile Platform Testing**
   - Test camera capture on various Android versions
   - Test camera permissions on iOS
   - Verify image processing performance
   - Test offline/poor network conditions

3. **Production Deployment** (after staging validation)
   ```bash
   # Enable on production after 48h+ staging success
   ROLLOUT_CONFIG.image_analyzer_production = true
   ```

---

## Phase 4: Candidate Selection UI 📊 GRADUAL ROLLOUT

**Status**: Ready for gradual rollout  
**Risk**: Low-Medium  
**Impact**: Better UX for ambiguous products

### Changes
- `BrandedCandidatesList` component
- Candidate selection and detail fetching
- "Enter Manually" fallback option

### Feature Flag & Rollout
```typescript
FEATURE_FLAGS.photo_meal_ui_v1 = true;
ROLLOUT_CONFIG.candidate_ui_rollout_percentage = 5; // Start at 5%
```

### Rollout Schedule
- **Week 1**: 5% of users
- **Week 2**: 15% of users (if no issues)
- **Week 3**: 35% of users
- **Week 4**: 75% of users
- **Week 5**: 100% rollout

### Monitoring
- Track candidate selection success rates
- Monitor "Enter Manually" usage
- Watch for increased support tickets
- Performance impact on older devices

### Rollback Plan
```typescript
// Instant rollback if needed
ROLLOUT_CONFIG.candidate_ui_rollout_percentage = 0;
```

---

## Phase 5: Multi-Food Meal Detection 🍽️ FUTURE

**Status**: Planned for next iteration  
**Risk**: High  
**Impact**: Complete meal logging functionality

### Planned Changes
- Multi-food detection from plate images
- Portion size editing interface
- "Save as Meal" functionality
- Integration with existing meal logging

### Prerequisites
- Phase 2-3 successfully deployed
- Phase 4 at 100% rollout
- Meal logging backend ready
- UI/UX designs approved

---

## Testing Strategy

### Unit Tests
```bash
npm test -- toLegacyFromEdge.test.ts
```

### Integration Tests
```bash
npm test -- healthScanner.integration.test.ts
```

### Manual Testing Scenarios
1. **Photo with visible barcode** → Should prioritize barcode
2. **Clear single product** → Direct to health report
3. **Ambiguous product** → Show candidate selector
4. **Empty/unclear photo** → Show fallback options
5. **Network failures** → Graceful error handling

### Performance Testing
- Image processing time < 3 seconds
- Network requests < 5 seconds timeout
- Memory usage acceptable on older devices
- Battery impact minimal

---

## Rollback Procedures

### Immediate Rollback (Critical Issues)
```typescript
// In featureFlags.ts
FEATURE_FLAGS.photo_meal_ui_v1 = false;
FEATURE_FLAGS.image_analyzer_v1 = false;
```

### Partial Rollback (Gradual)
```typescript
// Reduce rollout percentage
ROLLOUT_CONFIG.candidate_ui_rollout_percentage = 0;
```

### Full Rollback (Last Resort)
```bash
# Revert to previous deployment
git revert HEAD
git push origin main
```

---

## Success Metrics

### Phase 1
- ✅ No increase in error rates
- ✅ Improved data mapping accuracy
- ✅ Better fallback UX

### Phase 2-3
- Barcode detection accuracy > 90%
- Image processing success rate > 85%
- No performance regression on mobile

### Phase 4
- Candidate selection success rate > 80%
- Manual entry usage < 20%
- User satisfaction maintained

---

## Support & Monitoring

### Key Metrics to Watch
- Error rates by phase
- Processing times
- User completion rates
- Support ticket volume
- Platform-specific issues

### Alerts
- Error rate > baseline + 20%
- Processing time > 10 seconds
- Candidate selection failure > 50%
- Mobile crash reports

### Support Documentation
- Updated user guides
- Troubleshooting steps
- Known issues list
- Rollback procedures