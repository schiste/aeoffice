# Phase 0 Refactor Plan - SkyOffice Fork To Customer Virtual Office App

## 1. Phase Purpose

Phase 0 turns the imported SkyOffice fork into a maintainable foundation for
the Customer Virtual Office App.

This phase is not a feature sprint. It is a product-risk reduction phase. The
goal is to preserve the existing playable experience while separating concerns,
documenting hard-coded behavior, and preparing the codebase for tenant-aware
worlds, meeting providers, and future SaaS Foundation integration.

## 2. Current Source Location

The SkyOffice fork lives at:

```text
apps/customer-virtual-office/
```

The fork was imported from:

```text
https://github.com/kevinshen56714/SkyOffice.git
```

Imported upstream HEAD:

```text
3f66b8bffad889ee9fc2340f9bcad28146299f47
```

## 3. Phase 0 Principles

1. Keep upstream history.
2. Keep the app playable after each change.
3. Avoid feature expansion before structure is clear.
4. Preserve current assets for internal development.
5. Mark licensing cleanup as later work.
6. Replace hard-coded behavior with interfaces and configuration gradually.
7. Add seams for tenant identity, world config, and meeting providers before
   connecting real SaaS infrastructure.

## 4. Current Fork Inventory

### 4.1 Root App

Key files:

```text
apps/customer-virtual-office/package.json
apps/customer-virtual-office/yarn.lock
apps/customer-virtual-office/readme.md
```

Current root scripts:

- `start` runs the Colyseus server through `ts-node-dev`.
- `heroku-postbuild` builds the server.
- `test` is a placeholder that exits with an error.

Current root package identity is still SkyOffice. This should be renamed later,
but not in the same commit as the import.

### 4.2 Client

Client path:

```text
apps/customer-virtual-office/client/
```

Current stack:

- Vite.
- React.
- Phaser.
- Redux Toolkit.
- Colyseus client.
- PeerJS.
- MUI.

Important paths:

```text
client/src/scenes/
client/src/services/Network.ts
client/src/web/WebRTC.ts
client/src/web/ShareScreenManager.ts
client/src/items/
client/src/stores/
client/public/assets/
```

### 4.3 Realtime Server

Server path:

```text
apps/customer-virtual-office/server/
```

Current stack:

- Express.
- Colyseus.
- Colyseus monitor.
- bcrypt for custom room passwords.

Important files:

```text
server/index.ts
server/rooms/SkyOffice.ts
server/rooms/schema/OfficeState.ts
server/rooms/commands/
```

### 4.4 Shared Types

Shared types path:

```text
apps/customer-virtual-office/types/
```

Important files:

```text
types/Rooms.ts
types/IOfficeState.ts
types/Messages.ts
```

## 5. Known Prototype Assumptions To Refactor

### 5.1 Hard-Coded Office Objects

Current server behavior:

```text
server/rooms/SkyOffice.ts
```

The room currently creates a fixed number of computers and whiteboards:

- 5 computers.
- 3 whiteboards.

Target behavior:

- Load world objects from data.
- Support object types beyond computers and whiteboards.
- Keep current object behavior as default seed config until persistence exists.

### 5.2 Room Password Auth

Current behavior:

- Custom rooms can use a password.
- Passwords are stored as in-memory hashed room state.
- Auth is not tenant/user/RBAC-aware.

Target behavior:

- Keep password rooms only as a development compatibility layer.
- Introduce a realtime auth interface.
- Later validate short-lived platform-issued realtime tokens.

### 5.3 Lobby/Public/Custom Room Model

Current behavior:

- Uses Colyseus `LobbyRoom`.
- Defines `PUBLIC` and `CUSTOM` room types.
- Client discovers custom rooms via realtime listing.

Target behavior:

- Keep current flow during Step 0.
- Later map room types to tenant worlds and spaces.
- Replace global lobby assumptions with tenant-scoped world discovery.

### 5.4 Static Map And Object Binding

Current behavior:

- Phaser map loads static assets.
- Computers and whiteboards are derived from Tiled object layers.
- IDs are assigned by layer object order.

Target behavior:

- Normalize object IDs.
- Load map metadata from world config.
- Preserve Tiled compatibility.
- Prepare for backend-persisted map versions.

### 5.5 PeerJS Media

Current behavior:

- PeerJS is used for video and screen sharing.
- It is tightly coupled to client stores and item interactions.

Target behavior:

- Do not deepen PeerJS coupling.
- Introduce a meeting/media provider abstraction.
- Use Jitsi first for meeting zones.
- Revisit native P2P only after product flow is validated.

### 5.6 Asset Licensing

Current behavior:

- SkyOffice assets are imported with the fork.

Target behavior:

- Keep assets for internal development.
- Mark production asset cleanup as Phase 9.
- Do not block Phase 0 on sprite or tileset replacement.

## 6. Phase 0 Workstreams

### 6.1 Preserve Fork And Provenance

Status: started.

Tasks:

- Import SkyOffice with history preserved.
- Document upstream remote and imported commit.
- Document how future upstream pulls should happen.
- Avoid editing imported files in the same commit as the import.

Acceptance criteria:

- `git log --graph` shows SkyOffice upstream commits.
- `apps/customer-virtual-office/` contains the imported app.
- Fork maintenance docs exist.

### 6.2 Establish Project Structure

Tasks:

- Decide whether to keep the fork as a nested app package for now.
- Add root-level workspace tooling only after import is stable.
- Avoid moving hundreds of files before build verification.
- Create future target structure documentation before code moves.

Target future structure:

```text
apps/customer-virtual-office/
  client/
  server/
  types/
  docs/
packages/
  world-schema/
  meeting-providers/
  realtime-protocol/
```

Acceptance criteria:

- Current app still starts.
- New package boundaries are documented before broad moves.
- File movement happens in small commits.

### 6.3 Add Baseline Verification

Status: completed initial baseline on 2026-05-23.

Tasks:

- Install dependencies.
- Run client build.
- Run server TypeScript build.
- Document failures before fixing them.
- Add a local verification checklist.

Acceptance criteria:

- We know the current build state of upstream SkyOffice.
- Any baseline failures are recorded.
- Future refactor commits can be checked against the baseline.

Initial result:

- Root dependency install passed.
- Client dependency install passed.
- Server TypeScript build passed.
- Client production build passed.
- Vite reported a large bundle warning, but not a build failure.

Detailed notes are in `docs/phase-0-baseline-verification.md`.

### 6.4 Introduce World Configuration Boundary

Tasks:

- Define a `WorldConfig` shape.
- Represent computers and whiteboards as config-driven objects.
- Keep current hard-coded defaults as a seed config.
- Avoid backend persistence in Phase 0.

Acceptance criteria:

- Server room can initialize interactive objects from config.
- Current public room behavior remains equivalent.
- Object count and type are no longer embedded directly in room setup logic.

### 6.5 Introduce Realtime Auth Boundary

Tasks:

- Define a `RealtimeAuthContext`.
- Define a `RealtimeAuthProvider` interface.
- Implement development auth that preserves current behavior.
- Prepare token validation hook for later SaaS Foundation integration.

Acceptance criteria:

- `onAuth` delegates to an auth module.
- Current password behavior still works where needed.
- Future platform token auth has a clear insertion point.

### 6.6 Introduce Meeting Provider Boundary

Tasks:

- Define a `MeetingProvider` interface.
- Add a placeholder provider for Jitsi.
- Avoid implementing full enterprise providers.
- Avoid expanding PeerJS usage.

Acceptance criteria:

- Meeting zones can target a provider abstraction.
- Jitsi is the first intended provider.
- Google Meet, Teams, and Zoom are represented as future provider types.

### 6.7 Rename Product Internals Carefully

Tasks:

- Keep package names untouched during import.
- Rename from `skyoffice` to Aedventure/Customer Virtual Office in a separate
  commit.
- Preserve references to upstream where legally or historically relevant.

Acceptance criteria:

- Package metadata is updated without breaking scripts.
- Upstream attribution remains clear.

### 6.8 Document Asset Status

Tasks:

- Add asset status documentation.
- Mark all inherited assets as development-only until reviewed.
- Defer replacement/licensing cleanup to Phase 9.

Acceptance criteria:

- Developers know assets are not commercial-cleared.
- Asset cleanup is tracked but not blocking Phase 0.

## 7. Phase 0 Commit Strategy

Recommended commit sequence:

1. Add platform specs.
2. Import SkyOffice with history preserved.
3. Add Phase 0 docs and fork maintenance notes.
4. Capture baseline build/install results.
5. Add verification checklist.
6. Add world config interfaces.
7. Move hard-coded room objects behind config.
8. Add realtime auth interface.
9. Add meeting provider interface.
10. Rename product/package metadata.

Each code commit should keep the app runnable or explicitly document why it is
a temporary breaking commit.

## 8. Phase 0 Exit Criteria

Phase 0 is complete when:

- SkyOffice fork is imported with upstream history preserved.
- App can be run locally.
- Baseline build state is documented.
- Hard-coded room object initialization is moved behind a config boundary.
- Realtime auth has an abstraction point.
- Meeting provider abstraction exists.
- Current playable behavior remains available.
- Asset licensing cleanup is documented as deferred.
- Next phase can start building the Customer Virtual Office App MVP.
