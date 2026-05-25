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
- Phase 6 camera excellence is implemented: the Phaser renderer now exposes
  follow-player and fit-room modes, named zoom presets, mobile default zoom,
  viewport-tuned deadzones, constrained camera bounds, local-player visibility,
  and camera telemetry through `window.render_game_to_text`.
- `npm run smoke:frontend`, `npm run qa:responsive`, and `npm run check` passed
  after adding camera-mode, idle-stability, zoom-safety, and mobile default
  assertions. The standalone develop-web-game client is still blocked because
  its skill script cannot resolve its own `playwright` package, while the repo
  Playwright smoke/QA scripts run successfully.
- Phase 7 avatar system is implemented: avatar appearance, animation,
  interpolation, emote, and cosmetic-slot metadata now lives in a renderer
  registry; Phaser avatar drawing consumes that registry and exposes avatar
  telemetry through `window.render_game_to_text`.
- The frontend smoke now renders a four-avatar fixture, checks directional
  idle/walk animation keys, readable labels, emote hooks, local/remote
  interpolation profiles, and future cosmetic slots. `npm run build`,
  `npm run smoke:frontend`, `npm run qa:responsive`, and `npm run check` passed.
- Phase 8 zone presentation is implemented: Phaser zones now have passive
  affordances, active/hovered visual states, action markers, zoom-aware labels,
  kind-specific styling for meeting/private/portal/quiet/lobby zones, debug
  bounds, and zone telemetry in `window.render_game_to_text`.
- The frontend smoke now verifies meeting-zone action availability, that meeting
  controls remain locked outside valid meeting state, debug zone bounds, private
  and portal affordances, and renderer zone state. `npm run build`,
  `npm run smoke:frontend`, `npm run qa:responsive`, and `npm run check` passed.
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
- Lifecycle handling now has an explicit room-state banner and machine-readable
  `render_game_to_text.lifecycle` state for empty, joining, joined, leaving,
  map-reloading, and recovery phases.
- Reset/leave is best-effort: the browser attempts to leave the local and
  companion world clients, then clears local runtime state, chat, media,
  meeting state, snapshots, held movement, and remote players even if the
  server no longer remembers the clients.
- Rejoin and map reload are clean. Starting the demo re-syncs the current map
  geometry before admission, map switching reloads world geometry and returns to
  an empty-room state, and rejoin repopulates the two demo users.
- Server restart recovery is handled through `unknown_client`/not-admitted world
  errors. The browser clears stale room state, shows `World restarted, rejoin
  needed`, changes the main action to `Rejoin demo`, and reconfigures geometry
  on the next join.
- The meeting-room companion spawn moved farther from the local player so
  lifecycle screenshots have readable labels after rejoin.
- Verification passed: `npm --workspace @aedventure/asset-registry run build`,
  `npm --workspace @aedventure/web run build`, `npm run check`, Playwright MCP
  join/reset/rejoin/map-reload/server-restart-recovery/rejoin-after-recovery
  flows, desktop and mobile layout inspection, and zero browser console
  warnings/errors. The standalone web-game client still cannot run because it
  cannot resolve the `playwright` package from the skill runtime.
- Desktop/mobile layout polish is now applied. The app workspace renders the
  Phaser canvas beside a right-side tools/chat rail on desktop, with Camera,
  Chat, Meeting, and Media visible and the movement fallback kept collapsed so
  it is not primary UX.
- Mobile now visually prioritizes the canvas immediately after the header,
  connection status, and room state. Tool/chat panels become collapsed
  `<details>` sections below the canvas, with setup controls moved after the
  canvas in the mobile visual order.
- `render_game_to_text.layout` now exposes the active responsive mode and
  collapsible section state for automated layout checks.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run check`, Playwright MCP desktop `1440x960` and mobile `390x760`
  screenshots, desktop join/zoom/chat flows after the DOM move, mobile
  collapsible Chat/Move expansion, and zero browser console warnings/errors.
  The standalone web-game client still cannot run because it cannot resolve the
  `playwright` package from the skill runtime.
- Frontend smoke automation is now repo-owned through
  `scripts/frontend-smoke.test.cjs` and `npm run smoke:frontend`. The smoke
  boots the local dev HTTP host on an ephemeral loopback port, opens Chromium,
  verifies `render_game_to_text`, captures a `#map` screenshot buffer, checks
  that the map is nonblank, and exercises load -> map switch -> join ->
  keyboard move -> chat -> media token -> reset -> rejoin.
- `npm run check` now includes the browser frontend smoke after the Vite browser
  bundle build, so local and CI verification cover the primary V1 browser flow.
- Verification passed: `npm run smoke:frontend` and `npm run check`. In this
  sandbox both commands require escalation because the smoke binds a local HTTP
  server on `127.0.0.1`; that should not be an issue in normal local or CI
  environments. The external standalone web-game client remains blocked because
  it cannot resolve `playwright` from the skill runtime, but the repository now
  has its own Playwright dependency and smoke runner.
- Frontend V1 visual foundation pass is underway. The vanilla app shell now has
  a tokenized CSS system for surfaces, type, spacing, borders, shadows, focus
  states, status colors, and reusable control styling. Existing DOM structure
  and app behavior were preserved so Phaser, movement, media tokens, and smoke
  automation remain stable.
- Visible app copy now avoids demo/debug wording: the primary flow reads as
  entering/leaving the office, media access reads as meeting/media state rather
  than token plumbing, and the local app keeps implementation details out of the
  main UI. Toast lifetime was shortened so feedback is useful without lingering
  over controls.
- Visual QA passed with Chromium screenshots at desktop `1440x960` and mobile
  `390x760` after join. The app kept the canvas first, panels remained readable,
  mobile controls stayed reachable, and browser console errors stayed at zero.
- Verification passed: `npm run check`, including the updated browser frontend
  smoke and the development HTTP host app-shell assertion.
- Asset upgrade pass is now applied. The target asset source is
  `internal.generated.office.polished_v1`, still generated internally at runtime
  and recorded as CC0; SkyOffice/LimeZu entries remain reference-only metadata
  and are not bundled into the target app.
- The semantic catalog now covers polished wood, carpet, concrete floors; wood,
  glass, and neutral office walls; tables, chairs, plants, coffee machines,
  coffee bars, doors, couches; and four stable avatar tokens (`ember`, `cobalt`,
  `moss`, `violet`). Existing semantic IDs/GIDs were preserved and new IDs were
  appended.
- Phaser now draws polished procedural tiles instead of labeled placeholder
  blocks. Multi-tile semantic assets are rendered as clipped segments of one
  larger object so conference tables, round tables, coffee bars, and couches do
  not look like repeated one-tile stamps.
- Deterministic prompt generation now recognizes couch/sofa wording and the
  lounge/cafe preset includes a couch while keeping map compilation and server
  collision driven by the same semantic registry.
- Visual QA captured Lobby, Meeting room, Lounge/cafe, Generated room, and
  mobile screenshots on the local dev host. The app bundle contains
  `internal.generated.office.polished_v1`, `wall.neutral.*`, and
  `item.lounge_couch`, with no remaining placeholder source strings in the web
  bundle. The standalone web-game client can run through a temporary symlinked
  entrypoint with the repo `node_modules`; its direct canvas capture is still
  black under headless WebGL, so page-level Playwright screenshots remain the
  visual source of truth.
- Primary app layout pass is now applied. The browser app uses a product-level
  layout with a left workspace navigation rail, central Phaser stage, and right
  collaboration rail instead of a stack of test controls.
- Meeting and media controls are consolidated into one Call module; chat is
  visually integrated into the collaboration rail; profile/setup controls are
  compact and secondary in the left rail; movement remains available as a
  collapsed fallback instead of primary UX.
- Mobile now keeps the canvas-first flow and presents collaboration as a
  bottom-tray style set of collapsed Call/Chat/Move handles, with the tray
  layered above transient toasts so controls remain visible.
- Verification passed: `git diff --check`, the browser layout Playwright QA
  script against the local app on `127.0.0.1:8787`, and full `npm run check`
  including the repository frontend smoke. The known large Phaser/Vite chunk
  warning remains non-blocking.
- Map generation UX pass is now applied. The generator is presented as a
  prompt-to-map product feature with textarea prompts, example prompt chips,
  generated-room preview status, human validation feedback, and a clear
  Generate/Regenerate flow.
- The Generated room switcher no longer regenerates implicitly. It starts
  disabled with "Create one first", becomes available after generation, and
  reopens the saved generated room while presets can still be browsed without
  losing the draft.
- Regeneration visibly resets the local world through the existing map reload
  lifecycle and keeps the deterministic compiler as the only map-generation
  backend. No LLM integration has been added yet.
- Browser QA verified disabled generated navigation, example prompt fill,
  generation, saved generated-room reopening, regeneration after join, desktop
  and mobile screenshots, and zero browser console errors. The repository
  frontend smoke now asserts the same core generated-room UX path. Full
  `npm run check` passed; the known large Phaser/Vite chunk warning remains
  non-blocking.
- Meeting-zone UX pass is now applied. Phaser meeting zones have a passive
  boundary glow and an active "Join call available" label when the local player
  enters the zone.
- The Call module now has explicit outside/available/pending/joined panel
  states. Entering a meeting zone enables Join call, explains that media is
  available because the user is in that zone, and lets mic/camera controls act
  as pre-call device intent before LiveKit wiring.
- Joining the meeting still uses the server-issued `/media/media-token` flow;
  prepared mic/camera state carries into the granted call session, while Leave
  call and zone exit clear local media state.
- Verification passed: browser meeting-zone QA on the local app with
  available/joined/mobile screenshots, updated `npm run check`, and the
  repository frontend smoke now covers zone availability, pre-call mic/camera
  controls, and joined-call state. The known large Phaser/Vite chunk warning
  remains non-blocking.
- Phaser world presentation pass is applied. Furniture now renders as
  generated object sprites with y-based depth instead of one flat object
  tilemap layer, so tables, couches, chairs, doors, plants, and players share a
  consistent foreground/background ordering model.
- Zones now have lower scene depth than furniture/avatars plus hover/active
  highlight states and centered in-canvas labels. Avatar labels now have a
  stronger bubble treatment with a shadow and pointer tail, while avatar
  movement uses distance-aware interpolation and more deliberate idle/walk
  placeholder animation.
- Floor and wall tiles have stronger gradients, base lips, and corner posts to
  make wall transitions more readable without adding new external assets.
- Verification passed: `npm --workspace @aedventure/web run build`,
  page-level Playwright screenshots for Lobby, Meeting hover, Meeting joined,
  and mobile states on `127.0.0.1:8787`, and full `npm run check`.
- Movement and camera feel pass is now applied. Held-key movement repeats every
  190ms instead of 250ms, while the server still computes authoritative
  positions from direction intents.
- Avatar interpolation now uses a shorter distance-aware Sine-out tween, and
  the camera follows a hidden anchor rather than the bobbing avatar container.
  This keeps idle/walk animation from feeding jitter into the viewport, with a
  small camera deadzone and gentler follow lerp.
- Blocked movement now reads as a physical bump: the avatar nudges and squashes
  briefly, collision toasts use softer "Bumped into wall or furniture" copy,
  and collision feedback uses info tone rather than warning tone.
- Zoom controls now move in 10% steps and disable at min/max zoom. Browser QA
  verified stable idle camera scroll, held movement, collision bump feedback,
  zoom limits/reset, and desktop/mobile screenshots.
- Responsive QA pass started. Added a repository-owned responsive Playwright
  sweep for desktop `1440x960`, laptop `1280x800`, tablet-ish `900x700`,
  mobile `390x760`, and narrow mobile `360x740`; it checks canvas prominence,
  reachable controls, text overflow, control overlap, and captures empty/joined
  screenshots for each viewport.
- First responsive sweep found that narrow mobile wasted too much horizontal
  space in nested shell/panel padding. Added a `max-width: 380px` spacing
  breakpoint so the Phaser map keeps more width and height on 360px screens.
- Screenshot review found transient toasts visually competing with the
  collaboration rail. The rail now sits above toasts, keeping chat/call controls
  visually clean while toasts can still appear over non-control map space.
- Responsive QA now passes for all requested viewports in both empty and joined
  states. Representative screenshots were visually inspected for desktop,
  laptop, tablet-ish, mobile, and narrow mobile; controls remain reachable and
  the canvas remains the primary surface.
- Browser smoke expansion is applied. The repo smoke now asserts map switcher
  visibility, nonblank desktop and mobile map screenshots, usable chat form and
  transcript, meeting control enabled/disabled states outside/inside/joined
  states, mobile collapsed Call/Chat/Move handles, and the
  `render_game_to_text` layout/world/media contract.
- Phaser renderer architecture Phase 1 is applied. The former monolithic
  `PhaserOfficeRenderer` is now a thin compatibility export over
  `RendererHost`, with `OfficeScene` coordinating specialized renderers for
  tilemaps, objects, avatars, zones, camera, and renderer telemetry.
- The split is behavior-preserving: semantic tile drawing, generated object
  textures, avatar interpolation, camera follow/zoom, zone highlight labels,
  and the existing public renderer API remain intact. Renderer modules depend
  only on Phaser, fixture-map shapes, and renderer-local types, not auth,
  media, permissions, or business UI state.
- Verification passed: `npm run check`, explicit `npm run smoke:frontend`, and
  `npm run qa:responsive`. Representative desktop and mobile responsive QA
  screenshots were visually inspected after the refactor.
- Phaser 4 WebGL-first configuration is applied. The renderer now requests
  `Phaser.WEBGL` explicitly and records the actual renderer, Phaser version,
  WebGL limits, context loss/restore counters, canvas size, and pixel/rounding
  decisions in `render_game_to_text`.
- Pixel-art rendering is deliberate: global pixel art is enabled, smooth pixel
  art and antialiasing are disabled, camera rounding stays enabled, camera
  follow requests rounded pixels, and tile/object/avatar GameObjects use
  Phaser's conservative `safeAuto` vertex rounding mode.
- WebGL context recovery is handled by listening for Phaser's lose/restore
  renderer events. After restore, the renderer replays the saved semantic map,
  player list, active zones, and zoom factor so generated tile/object canvas
  textures are recreated instead of depending on stale GPU resources.
- Verification passed: `npm run check`, explicit `npm run smoke:frontend`, and
  `npm run qa:responsive`. The frontend smoke now asserts WebGL capabilities,
  nonblank map screenshots after resize and rejoin, and synthetic
  `WEBGL_lose_context` loss/restore recovery; mobile and narrow-mobile QA
  screenshots were visually inspected.
- TilemapGPULayer migration is applied for static architectural layers. The
  floor and wall layers still consume the same compiled semantic `gids` arrays,
  but the renderer now promotes their Phaser `LayerData` into
  `TilemapGPULayer` instances when WebGL is available.
- Furniture remains separate generated sprites for y-depth sorting, zones
  remain Phaser graphics, and avatar/labels remain ordinary display objects.
  The asset registry and deterministic map compiler were not changed.
- Renderer capability output now reports static tile layer modes, GPU/CPU layer
  counts, and static tile counts. The frontend smoke asserts that floor and
  walls are GPU layers, then renders a synthetic 128x96 semantic stress map
  through the same browser renderer path and checks nonblank output plus frame
  cadence thresholds.
- Verification passed: `npm run check`, explicit `npm run smoke:frontend`, and
  `npm run qa:responsive`. Desktop and mobile responsive screenshots were
  visually inspected after the migration.
- Phaser 4 Effects Layer phase is applied. The renderer now has a dedicated
  visual-only effects subsystem for WebGL-gated camera color grading, static
  ambient tinting, room light ellipses, corner shadows, and tenant lighting
  modes. Zone hover/selection outlines remain owned by the zone renderer, and
  no effects state feeds movement, collision, permissions, or media authority.
- Effects degrade cleanly: low-capability or forced-off modes destroy camera
  filters and effect geometry, while `render_game_to_text` reports enabled
  state, requested quality, tenant lighting, capability flags, applied passes,
  and deterministic/static animation mode.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run smoke:frontend`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. The frontend smoke now covers normal effects, forced
  low-capability disable, night lighting re-enable, nonblank screenshots, and
  frame cadence thresholds. Representative desktop and narrow-mobile QA
  screenshots were visually inspected.
- Phase 10 big-map performance is implemented. The renderer now reports a
  documented performance budget, target FPS, benchmark sizes, chunking/culling
  strategy, pooling state, map render count, map-switch count, texture count,
  display-object count, and a stable Phaser game instance ID through
  `render_game_to_text`.
- Map switches no longer rely on broad `children.removeAll(true)`. Tilemap
  layers are destroyed through the active Phaser tilemap, object sprites are
  released into a pool, and the single Phaser game instance remains alive across
  benchmark map switches.
- Static tile layers keep the Phaser 4 WebGL GPU-layer batching path. Object
  sprites now use viewport culling with a fixed margin, object textures are
  reused by semantic/atlas signature, and semantic tilesets are reused when the
  catalog signature is unchanged.
- Added `docs/renderer-performance-budget.md` with the target FPS budget,
  benchmark map sizes, runtime strategy, and map-switch leak gate.
- The frontend smoke now benchmarks 20x15, 50x40, and 100x80 maps over two
  passes, checks frame cadence, verifies object culling/pooling/texture reuse,
  verifies the Phaser game instance is reused, and asserts repeated 100x80 map
  switches do not grow texture/display-object counts.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run smoke:frontend`, `npm run qa:responsive`, `npm run check`, and
  `git diff --check`. Representative desktop and narrow-mobile QA screenshots
  were visually inspected. The generic develop-web-game skill client still
  cannot run because its script cannot resolve its own `playwright` package,
  while the repo-owned Playwright smoke uses the local dependency successfully.
- Phase 11 AI-generated map readiness is implemented. The asset registry now
  exposes `MapDefinitionInterface` as the renderer-agnostic semantic map
  contract and compiles it into explicit render layers, a movement collision
  layer, zones, and explainable validation checks.
- The browser renderer now runs a Phaser-specific preflight before scene
  mutation. It validates render layer dimensions, referenced GIDs, visual
  footprint bounds, collision layer dimensions, and zone bounds, then exposes a
  deterministic render fingerprint through `render_game_to_text`.
- Generated-room flow now creates preview metadata before applying the map:
  MDI schema, compiler output categories, renderer preflight result, preview
  fingerprint, applied fingerprint, and `previewMatchesRendered`. The UI detail
  now reports when the preview matches the rendered room.
- Invalid generated/AI-style maps fail before Phaser mutation. The frontend
  smoke attempts a map with an out-of-bounds visual footprint and verifies that
  map render count and active app map remain unchanged while the rejected
  fingerprint and validation error are still explainable.
- Added `docs/ai-map-readiness.md` documenting the MDI -> compiler output ->
  renderer preflight contract and preview fidelity gate.
- Verification passed: `npm --workspace @aedventure/asset-registry run build`,
  `node packages/asset-registry/test/catalog.test.js`,
  `npm --workspace @aedventure/web run build`, `npm run smoke:frontend`,
  `npm run qa:responsive`, `npm run check`, and `git diff --check`.
  Representative desktop and narrow-mobile QA screenshots were visually
  inspected.
- Phase 12 observability and QA is implemented. Added `npm run qa:renderer` as
  a Phaser-specific browser QA gate that builds the browser bundle, starts the
  local app, captures renderer capability snapshots, samples frame cadence,
  records texture/display-object counts, validates map-switch leak deltas, and
  writes a JSON report plus screenshot artifacts.
- Renderer QA now checks canvas nonblank state and pixel contrast for desktop,
  mobile, joined lobby, stress map, and depth-order fixtures. It also records
  whether depth samples come from fixture projection or camera-bounds fallback
  so screenshot assertions remain meaningful.
- `npm run check` remains the main gate and now invokes the renderer QA after
  frontend smoke. Existing responsive QA is unchanged and still passes.
- Verification passed: `npm run qa:renderer`, `npm run qa:responsive`,
  `npm run check`, `node --check scripts/renderer-qa.test.cjs`, and
  `git diff --check`. Representative renderer QA screenshots were visually
  inspected from `/var/folders/f2/krjzd4c15nn491pm37zrkp1h0000gn/T/aedventure-renderer-qa`.
- Phase 13 developer tooling is implemented. Renderer dev tools are gated to
  local developer/automation sessions through `?devtools=1` or local storage,
  with query-param defaults for grid, collision, zone, depth, sprite-bounds,
  camera readout, and initial fixture selection.
- Added a Phaser dev overlay for grid lines, collision tiles, sprite/player
  bounds, and camera readout. Zone and depth overlays now route through the
  same devtools state, while the primary product UI remains unchanged and
  exposes no debug controls.
- Added dev fixture selection through keyboard/API only: presets, generated
  room, depth fixtures, avatar fixture, zone fixture, and 20x15/50x40/100x80
  stress fixtures. `render_game_to_text.devTools` reports gate state, overlay
  state, shortcut help, fixture selector state, overlay object counts, and the
  product-control exposure count for agents.
- Renderer QA now opens a query-param-gated devtools session, validates every
  overlay state, asserts zero product-facing debug controls, captures devtools
  screenshots, verifies `Alt+Shift+C` toggles collision, and verifies
  `Alt+Shift+F` cycles to the next fixture.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run qa:renderer`, `npm run smoke:frontend`, `npm run qa:responsive`,
  `npm run check`, `node --check scripts/renderer-qa.test.cjs`,
  `node --check scripts/frontend-smoke.test.cjs`, and `git diff --check`.
  Representative devtools screenshots were visually inspected from
  `/var/folders/f2/krjzd4c15nn491pm37zrkp1h0000gn/T/aedventure-renderer-qa`.
- Rendering polish pass: avatar name labels now use high-resolution Phaser text
  and zoom-aware screen scaling so they stay crisp instead of being magnified
  with the pixel-art world. Avatar label render metadata is exposed through
  `render_game_to_text.avatars.players`.
- Avatar movement smoothing was refactored so the logical avatar container
  interpolates between server-confirmed positions with vertex rounding disabled,
  while idle/walk/rejection pose animation lives on an inner visual root. This
  prevents idle bobbing from fighting grid-step movement.
- Frontend smoke now asserts high-resolution labels, screen-space readable
  label bounds, the confirmed-position tween smoothing mode, and a true
  in-between current position while a remote avatar moves toward its target.
- Verification passed: `npm --workspace @aedventure/web run build`,
  `npm run smoke:frontend`, `npm run qa:renderer`, `npm run qa:responsive`,
  `npm run check`, `node --check scripts/frontend-smoke.test.cjs`, and
  `git diff --check`. Representative joined/depth renderer screenshots were
  visually inspected from
  `/var/folders/f2/krjzd4c15nn491pm37zrkp1h0000gn/T/aedventure-renderer-qa`.
