# ⚠️ Deprecated Arena Components

**DO NOT IMPORT THESE COMPONENTS**

This directory contains legacy Arena V1 components that have been replaced by Arena V2.

## Replacement Guide

| Legacy Component | Use Instead |
|------------------|-------------|
| `FriendsArena` | `ArenaPanel` (from `@/components/arena/ArenaPanel`) |
| `useRank20*` hooks | V2 hooks from `@/hooks/arenaV2/useArena` |

## Why Deprecated?

- Legacy components use outdated data layer (my_rank20_* RPCs)
- Missing modern features (profile modals, real-time updates, etc.)
- Not maintained or tested
- Performance and security improvements in V2

## Migration Status

All legacy components have been moved here to prevent accidental imports. The V2 components provide:

- Unified data layer with `arena_*` RPCs
- Real-time member updates
- Profile modal integration
- Modern accessibility features
- Better performance and caching

**Last Updated:** 2025-01-17