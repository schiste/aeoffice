# Aedventure Virtual Office

This repository contains the hard-fork plan and implementation workspace for
the Aedventure Customer Virtual Office App.

SkyOffice is not the product architecture. SkyOffice is a temporary legacy
source reference that must be reduced, replaced, and rebuilt into a clean
architecture before product feature work resumes.

## Canonical Documentation

- [Global Product and Technical Specification](docs/customer-virtual-office-platform-spec.md)
- [Development Rollout Plan](docs/development-rollout-plan.md)
- [Phase 0 Refactor Plan](docs/phase-0-refactor-plan.md)
- [SkyOffice Fork Maintenance](docs/skyoffice-fork-maintenance.md)
- [Phase 0 Baseline Verification](docs/phase-0-baseline-verification.md)
- [Initial License Audit](docs/license-audit.md)

## Source Layout

- `legacy/skyoffice-original/` - SkyOffice fork imported with upstream Git
  history preserved as a subtree. This is reference code, not the target app.
- `apps/web/` - browser-first customer app-layer orchestrator with a Phaser 4
  world renderer and HTML/TypeScript overlays.
- `apps/world-server/` - future Colyseus authoritative world server.
- `apps/api/` - API foundation with Wikimedia OAuth, sessions, seeded runtime
  permission enforcement, and persistence boundaries. Full RBAC management comes
  later via the SaaS/control-plane phase.
- `apps/media-gateway/` - LiveKit token service and media policy layer.
- `packages/protocol/` - future client/server protocol definitions.
- `packages/map-engine/` - future map parsing, collision, zones, and navigation.
- `packages/auth-wikimedia/` - future Wikimedia OAuth 2.0 integration.
- `packages/policy/` - server-side permission and delivery policy decisions.
- `packages/shared-types/` - future shared application types.
- `infra/` - future Docker Compose and deployment scaffolding.
- `assets/ASSET_MANIFEST.md` - required manifest for any target-app assets.
- `docs/` - product, architecture, and phase planning documents.

## Starting Position

1. Preserve SkyOffice history.
2. Move SkyOffice under `legacy/`.
3. Freeze feature work.
4. Make the build reproducible.
5. Audit and remove incompatible bundled assets.
6. Replace auth with Wikimedia OAuth 2.0 plus local users/sessions.
7. Replace client-authoritative movement with server-authoritative movement.
8. Add Postgres persistence immediately.
9. Replace PeerJS media with LiveKit/coturn.
10. Define a clean protocol before adding product features.

## Early Non-Goals

- Rebuilding the SaaS Foundation from scratch.
- Building the full map editor immediately.
- Adding rooms, admin features, or design polish on the legacy architecture.
- Keeping PeerJS as the final media layer.
- Implementing production AI agents in Step 0.
- Implementing enterprise Google Meet, Teams, or Zoom integrations in Step 0.
- Building a large-scale broadcast system before the core protocol and
  persistence layers are clean.
- Building a Tauri desktop wrapper before the browser MVP is stable.

## Stack Orientation

The target is a TypeScript-first product layer, not an all-TypeScript runtime.
Application logic, protocol contracts, policies, API boundaries, world
simulation, and client code should stay in TypeScript where practical. Durable
state, media, cache, and desktop packaging use the best-fit tools already in the
plan: Postgres, Valkey, LiveKit/coturn, S3-compatible storage, and eventually
Tauri.

## Phase 0 Baseline Check

Run the target stack verification with:

```bash
scripts/verify-target-stack.sh
```

This builds the new TypeScript workspace and runs checks for:

- protocol message validation
- map-engine movement, collision, and zone permissions
- policy chat delivery and permission checks
- authoritative world-server movement
- API Wikimedia sign-in, sessions, and world-token issuance
- world-server admission from API-issued world-token claims
- media-gateway media policy and token claim issuance
- dependency-free local HTTP host mounting browser, API, world, and media
  handlers
- local shared-infra configuration shape

## Local App-Layer HTTP Host

Run:

```bash
npm run dev:http
```

This builds the target workspace, then starts a dependency-free Node HTTP host
for local smoke testing:

- Vite-built playable local browser demo is served under `/app`.
- The local office map is rendered by Phaser 4 from `/dev/fixture-map`; the
  asset-registry semantic catalog remains the source of truth for tile IDs.
- Local-only dev sign-in is mounted under `/dev/sign-in`.
- Local fixture-map data is mounted under `/dev/fixture-map`.
- API routes are mounted under `/api`.
- World transport routes are mounted under `/world`.
- Media gateway routes are mounted under `/media`.
- The host uses the same standard Fetch handlers covered by the target stack
  verification.
- The target verification also runs a full local app-layer smoke flow across
  `/dev`, `/api`, `/world`, and `/media`.
- Stop and restart `npm run dev:http` after server-side changes; the running
  Node process keeps its loaded world/API/media modules in memory.

Run the imported SkyOffice baseline verification with:

```bash
scripts/verify-skyoffice-baseline.sh
```

After dependencies are already installed, use:

```bash
SKIP_INSTALL=1 scripts/verify-skyoffice-baseline.sh
```

This script verifies the legacy SkyOffice baseline only. The new app stack
must get its own CI checks as it is created.
