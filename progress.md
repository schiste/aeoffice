Original prompt: continue do the whole plan end to end, granular commits as you code, don't stop until we have a locally working demo

## Progress

- Started demo-critical path: browser app, fixture-map rendering, local dev host,
  server-authoritative movement, chat, and media-token flow.
- RBAC/admin/SaaS control-plane work remains deliberately deferred.

## Current Slice

- Convert the static browser shell from a smoke-loop page into a playable local
  demo with a local user, companion participant, keyboard movement, chat, media
  token issuance, and machine-readable browser state.

## Notes

- Browser demo queues async actions so keyboard/button input does not race
  server round trips.
- `window.render_game_to_text` and `window.advanceTime` are being added for the
  Playwright-based demo test loop.
- Browser validation passed with Playwright MCP: before join the companion is
  hidden, after join the local player and companion are visible, chat delivers to
  one recipient, media joins `zone:room-lobby:meeting-zone`, and delayed
  movement updates the server-authoritative player position.
- Continuing with lifecycle controls: reset leaves both local demo participants
  through `/world/leave` and makes the demo rejoinable without refresh.
- Playwright MCP verified join -> reset -> rejoin. Reset hides the companion,
  restores idle/not-joined/not-issued statuses, and re-enables Join demo.
- Reusable app layer now has `CustomerVirtualOfficeApp.leaveWorld()` and
  `TransportWorldClient.leave()` so future Phaser code can use the same lifecycle
  path as the local browser demo.
- World server now exposes a room-scoped snapshot route so clients can sync
  visible players from server state instead of assuming who joined locally.
- Browser demo now calls `/world/snapshot` after companion join and records the
  server-confirmed player IDs in `render_game_to_text`.
- Static `/app` files have been promoted into a Vite + TypeScript browser app
  under `apps/web`, while the dev host still preserves `/dev`, `/api`, `/world`,
  `/media`, `/app`, and `/` routes.
- `npm run check` now builds the Vite browser bundle before validating the dev
  HTTP host against the generated `/app/assets/*` files.
- Browser MCP smoke check verified the Vite-built `/app` shell loads, joins the
  local demo, syncs two players, issues a media token, sends chat, and resets.
- Phaser 4 is now integrated in `apps/web`; `/dev/fixture-map` is rendered
  through Phaser tile layers generated from asset-registry semantic token GIDs.
- The old DOM tile/player renderer has been removed from `/app`; HTML now owns
  the controls/status overlays while Phaser owns the world canvas.
- Current Phaser art is still generated placeholder tiles from semantic token
  IDs, so licensed sprite onboarding remains a later visual-assets task.
- Player rendering is now keyed by world player IDs instead of hard-coded local
  and companion slots. `/world/snapshot` drives local/remote avatar visibility,
  labels, facing direction, placeholder idle/walk tweens, and y-based z-order.
- Movement input now supports held keyboard repeat paced to the authoritative
  world tick; the browser still sends direction intents only, while Phaser
  interpolates confirmed server positions for smoothness.
- Wall/furniture collisions now surface as throttled, useful blocked-movement
  feedback, and reset clears the rendered-player cache before reseeding the
  local avatar.
- Browser MCP verified the rebuilt `/app` bundle: holding right into furniture
  stays at `112,64` with a collision rejection, holding down advances to
  `112,112` and clears the rejection marker, reset removes the companion from
  rendered players, and the browser console has no warnings or errors. The
  bundled web-game client script could not run because `playwright` is not
  installed in the skill/runtime path, so Playwright MCP was used for the
  browser pass.
- Camera/viewport behavior now lives in the Phaser renderer: the camera follows
  the local avatar, viewport size is driven by the map container, and zoom uses a
  fit-to-container base multiplied by user controls outside the canvas.
- Browser MCP verified desktop `1280x900` and mobile `390x760` layouts. The
  zoom controls update from `115%` to `160%`, `render_game_to_text` exposes
  viewport dimensions/effective zoom/camera scroll/follow target, and the
  browser console stayed clean. The standalone web-game client still cannot run
  because the skill runtime cannot resolve the `playwright` package.
- The debug-style event feed is no longer visible in the primary app UI. It has
  been replaced with compact session/world/media status pills, a compact room
  chat transcript, and transient toast feedback for join/reset/error-like events.
- Browser MCP verified join, chat delivery, reset, desktop `1280x900`, and
  mobile `390x760`: statuses move through disconnected/not-joined/not-ready to
  connected/joined/media-ready, reset clears chat and restores disconnected
  states, toasts render, no `#events` feed exists, and the browser console stayed
  clean. The standalone web-game client remains blocked by missing `playwright`.
