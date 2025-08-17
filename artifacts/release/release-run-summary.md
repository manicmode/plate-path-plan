SKIPPED: tag v2.0.0 not verifiable - no git access in Lovable environment

## Workflow Monitoring
SKIPPED: no GitHub auth/CLI in this environment
Monitor manually at: https://github.com/{owner}/{repo}/actions/workflows/release-tag.yml

## Expected Workflow Results (after tag push)
- Job: build (inject VITE_APP_VERSION=2.0.0, lint, typecheck, build, upload web-build artifact)
- Job: smoke (static validation of Arena V2 markers) 
- Job: e2e (conditional on secrets, auto-skip if missing)

## Next Steps
1. Push tag: git tag -a v2.0.0 -m "Arena V2" && git push origin v2.0.0
2. Monitor workflow at Actions URL above
3. Verify env version injection in build logs
4. Download artifacts if needed