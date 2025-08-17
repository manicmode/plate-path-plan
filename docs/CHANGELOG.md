# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Arena V2] - 2025-01-17

### Added
- **Arena V2 Complete**: Single-source Arena implementation with enrollment, real-time chat, and leaderboard
- **Two-User E2E Tests**: Authenticated cross-user testing with realtime chat verification  
- **CI Integration**: GitHub Actions workflows for E2E testing with graceful secret handling
- **Health Endpoint**: `/healthz` route for production monitoring and Arena V2 status
- **Telemetry**: Lightweight event logging for Arena operations (console + optional Sentry)
- **Post-Merge Smoke Tests**: Automated health checks after main branch merges
- **Soft Rollback Script**: Non-destructive rollback for Arena V2 chat functionality

### Security
- **RLS Enforcement**: `arena_chat_messages` table with strict Row-Level Security policies
- **Membership-Based Access**: Only arena group members can read/write chat messages
- **ESLint Guards**: Restricted imports prevent legacy V1 code reintroduction

### Operations  
- **Database Functions**: `arena_get_active_group_id()`, `arena_enroll_me()` for core operations
- **Real-time Subscriptions**: WebSocket-based chat with automatic reconnection
- **Network Monitoring**: E2E tests verify no legacy `rank20_*` API calls
- **Artifact Collection**: Screenshots, videos, and traces captured on test failures

### Breaking Changes
- **V1 Removal**: All legacy `rank20_*` routes, hooks, and components completely removed
- **Import Restrictions**: ESLint rules block legacy V1 Arena imports  
- **Hard Migration**: No backwards compatibility with Arena V1 - V2 only

### Technical Details
- **Chat Backend**: `arena_chat_messages` table with user/group RLS policies
- **Membership System**: `arena_memberships` table linking users to arena groups
- **Real-time Engine**: Supabase realtime with postgres_changes subscriptions
- **Auth Requirements**: All Arena functionality requires authenticated sessions

### Dependencies
- Added: `@playwright/test` for E2E testing
- Added: `tsx` for TypeScript script execution

### Documentation
- **Complete V2 Guide**: `docs/arena-v2-readme.md` with hooks API, troubleshooting, E2E testing
- **Operations Manual**: Health monitoring, telemetry reading, rollback procedures
- **CI Documentation**: E2E test configuration, secret setup, artifact management

### Verification
- **Runtime Clean**: Zero `rank20_*`, `diag_rank20`, `ensureRank20`, `useRank20` references in `src/`
- **Build Success**: TypeScript compilation, ESLint validation, production build completion
- **E2E Coverage**: Two-user enrollment, realtime chat, network call verification
- **CI Integration**: Auto-skip when secrets missing, artifact upload on completion