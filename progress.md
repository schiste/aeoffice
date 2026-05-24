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
- Meeting-zone interactions now use the compiled map zones in the browser app:
  the Phaser renderer highlights the active zone, the app exposes Join/Leave
  meeting controls outside the canvas, and media is no longer auto-joined when
  the demo starts.
- The meeting join path still relies on the media gateway for permission. The
  browser requests `/media/media-token` with the active zone ID, while the server
  resolves the requester through the authoritative world participant directory
  and can deny out-of-zone requests.
- Playwright MCP verified desktop `1280x900` and mobile `390x760`: entering the
  demo leaves media `Not ready`, Join meeting issues
  `zone:room-lobby:meeting-zone`, Leave meeting clears local meeting state, and
  walking out of the compiled zone auto-clears meeting media. Browser console
  warnings/errors stayed at zero. The standalone web-game client still cannot
  run because the skill runtime cannot resolve the `playwright` package.
- Basic media UX is now wired around the existing `/media/media-token` route:
  the browser stores token metadata for the active meeting zone, displays room,
  endpoint, participant count, and token expiry, and keeps the raw token out of
  `render_game_to_text`.
- Mic/camera controls now model local device intent after token issuance. They
  default off, enable only when the server grants publish permission, reset on
  leave/reset/out-of-zone, and feed the media placeholder panel.
- Playwright MCP verified token issuance, mic/camera toggles, leave cleanup,
  desktop `1280x900`, and mobile `390x760`; browser console warnings/errors
  stayed at zero. The standalone web-game client remains blocked by missing
  `playwright`.
- Deterministic map generation demo is now wired. The asset registry owns
  `compileDeterministicPromptMap()`, which maps prompt keywords such as
  `10-person`, `cozy`, `wood`, and `coffee` into a semantic map definition,
  compiles it into tile layers, and validates blocked tiles, spawn points, and
  zones.
- The browser now has a room prompt panel. The default prompt renders a generated
  14x11 cozy meeting room with 10 seats, perimeter walls, a coffee bar, a
  meeting zone, two spawns, and validation counters. Generating while joined
  resets the local demo before applying the new map.
- Playwright MCP verified default prompt generation, Phaser rendering,
  machine-readable validation state, join-after-generation, reset-on-generate,
  desktop `1280x900`, and mobile `390x760`; browser console warnings/errors
  stayed at zero. The standalone web-game client remains blocked by missing
  `playwright`.
- The visual catalog now has a target-approved internal placeholder source,
  `internal.generated.office.placeholders`, recorded as CC0 in the asset
  manifest. Existing stable semantic IDs for floors, wood walls, conference
  tables, chairs, and coffee machines now point to that source instead of
  SkyOffice/LimeZu references.
- Added stable placeholder vocabulary for polished concrete, carpet, glass
  walls, small round tables, potted plants, coffee bars, single doors, and a
  local placeholder avatar. SkyOffice/LimeZu sources remain in the registry as
  reference-only metadata and are still not bundled into the target app.
- The deterministic prompt compiler now understands `bar`, `plant(s)`, and
  `door(s)`. The default coffee-bar prompt uses `item.coffee_bar`, and explicit
  plant/door prompts render those tokens through Phaser placeholder visuals.
- Verification passed: `npm --workspace @aedventure/asset-registry run build`,
  `node packages/asset-registry/test/catalog.test.js`,
  `npm --workspace @aedventure/web run build`, and `npm run check`. Playwright
  MCP verified desktop `1280x900` and mobile `390x760` generated rooms with
  plants, a door, and a coffee bar; browser console warnings/errors stayed at
  zero. The standalone web-game client still cannot run because it cannot
  resolve the `playwright` package from the skill runtime.
- Map switching is now wired through semantic presets. The app exposes Lobby,
  Meeting room, Lounge/cafe, and Generated room controls; presets live in
  `packages/asset-registry` and compile through the same semantic map compiler
  as prompt-generated rooms.
- Switching maps uses the clean demo reset path, then posts the selected map's
  pixel collision geometry and zones to `/dev/world-geometry` so the local
  authoritative world server validates against the same layout that Phaser
  renders.
- Verification passed for asset-registry presets, world room reset,
  dev fixture/world-geometry routes, the Vite browser build, and full
  `npm run check`.
- Playwright MCP verified desktop `1280x900` and mobile `390x760`: Lobby loads
  by default, Meeting room can be joined with two demo players, switching to
  Lounge/café resets the local demo world cleanly, Generated room compiles the
  prompt map, active switcher state is reflected through `aria-pressed`, and
  browser console warnings/errors stayed at zero. The standalone web-game
  client still cannot run because it cannot resolve the `playwright` package
  from the skill runtime.
- Local avatar basics are now wired without account persistence: the demo has a
  name input, four placeholder avatar choices, live Phaser avatar recoloring,
  name labels, media-preview initials, and `render_game_to_text` identity fields.
- The local demo profile remains browser-runtime only. Verification checked that
  the app does not use `localStorage`, `sessionStorage`, or `indexedDB` for the
  demo name/avatar state.
- The lobby companion spawn moved farther from the local player so the default
  demo displays two readable avatars and labels after join.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run check`, Playwright MCP desktop/mobile screenshots, live pre-join and
  post-join identity changes, empty storage keys, and zero browser console
  warnings/errors. The standalone web-game client still cannot run because it
  cannot resolve the `playwright` package from the skill runtime.
