# Release Run Summary v2.0.0

## Tag Status
- Tag v2.0.0: Manual creation required
- Instructions: See artifacts/release/tag-instructions.txt

## CI Workflow
- Workflow: Release (tag) (.github/workflows/release-tag.yml)
- Status: SKIPPED - no GH auth in Lovable environment
- Jobs: build, smoke, e2e (conditional)
- Actions URL: https://github.com/{owner}/{repo}/actions/workflows/release-tag.yml

## Expected Behavior After Tag Push
- Version injection: VITE_APP_VERSION=2.0.0
- Build artifacts: web-build
- E2E: Auto-skip if secrets missing

## Files Verified
- ✅ release-tag.yml has "Derive version from tag" step
- ✅ HealthCheck.tsx has env-driven APP_VERSION
- ✅ Arena V2 identifier present
- ✅ V1 code purged (only schema types remain)