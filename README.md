# Aedventure Virtual Office

This repository contains the hard-fork plan and implementation workspace for
the Aedventure Customer Virtual Office App.

SkyOffice is not the product architecture. SkyOffice is a temporary legacy
source reference that must be reduced, replaced, and rebuilt into a clean
architecture before product feature work resumes.

## Canonical Documentation

- [Global Product and Technical Specification](docs/customer-virtual-office-platform-spec.md)
- [Phase 0 Refactor Plan](docs/phase-0-refactor-plan.md)
- [SkyOffice Fork Maintenance](docs/skyoffice-fork-maintenance.md)
- [Phase 0 Baseline Verification](docs/phase-0-baseline-verification.md)
- [Initial License Audit](docs/license-audit.md)

## Source Layout

- `legacy/skyoffice-original/` - SkyOffice fork imported with upstream Git
  history preserved as a subtree. This is reference code, not the target app.
- `apps/web/` - future React or Svelte frontend with Phaser world renderer.
- `apps/world-server/` - future Colyseus authoritative world server.
- `apps/api/` - future Fastify API with Wikimedia OAuth, sessions, RBAC, and
  persistence.
- `apps/media-gateway/` - future LiveKit token service and media policy layer.
- `packages/protocol/` - future client/server protocol definitions.
- `packages/map-engine/` - future map parsing, collision, zones, and navigation.
- `packages/auth-wikimedia/` - future Wikimedia OAuth 2.0 integration.
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

## Phase 0 Baseline Check

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
