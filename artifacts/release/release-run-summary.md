SKIPPED: tag v2.0.0 not verifiable - no git access in Lovable environment

## Workflow Monitoring
SKIPPED: no GitHub auth/CLI in this environment
Monitor manually at: https://github.com/{owner}/{repo}/actions/workflows/release-tag.yml

## Expected Workflow Results (after tag push)
- Job: build (inject VITE_APP_VERSION=2.0.0, lint, typecheck, build, upload web-build artifact)
- Job: smoke (static validation of Arena V2 markers) 
- Job: e2e (conditional on secrets, auto-skip if missing)

## Live Health
SKIPPED: no PREVIEW_URL/PROD_URL available for runtime verification

## Workflow Evidence  
SKIPPED: no GitHub auth/CLI in this environment
Monitor manually: https://github.com/{owner}/{repo}/actions/workflows/release-tag.yml

Expected workflow completion:
- build job: inject VITE_APP_VERSION=2.0.0, successful build, web-build artifact upload
- smoke job: static validation passes
- e2e job: conditional execution (auto-skip if secrets missing)