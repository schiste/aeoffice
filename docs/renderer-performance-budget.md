# Phaser Renderer Performance Budget

Phase 10 prepares the browser renderer for real tenant spaces where maps are
larger than a demo room and users switch between spaces repeatedly.

## Target Budget

- Target runtime: 60 FPS on mainstream business laptops for normal tenant maps.
- Minimum acceptable runtime: 45 FPS while viewing a large tenant map.
- Frame budget: 16.7 ms at target, 22.2 ms at minimum acceptable runtime.
- CI/headless smoke budget: average RAF cadence under 50 ms, p95 under 90 ms,
  and max under 250 ms. Headless browser cadence is noisy, so these thresholds
  detect collapse rather than certify production FPS.

## Benchmark Maps

The renderer smoke benchmark exercises:

- 20x15 tiles: small room baseline.
- 50x40 tiles: tenant floor/module baseline.
- 100x80 tiles: large tenant space baseline.

All three maps use the same semantic asset registry and Phaser renderer path as
the app. They are not separate synthetic canvas tests.

## Runtime Strategy

- Static floors and walls render through Phaser 4 WebGL `TilemapGPULayer`
  instances, keeping architectural layers batched.
- Large spaces are represented as logical 32x32 tile chunks in renderer
  telemetry. This gives the server/API layer a stable future boundary for
  room streaming without changing the current semantic map format.
- Tile layers rely on Phaser/camera culling. Object sprites use explicit
  viewport culling with a small pixel margin.
- Furniture and foreground wall sprites are pooled across map switches so the
  display list grows to the largest recent object set, then reuses those
  GameObjects instead of allocating new ones on every switch.
- Semantic object textures and tilesets are reused by signature when possible.
- The browser app keeps one Phaser game instance alive. Map switches replace
  scene content, not the whole renderer.

## Leak Gate

Map switching should not steadily increase:

- Phaser game instance ID.
- Texture count.
- Display object count.
- Active object sprite count beyond the current map.

The frontend smoke compares repeated 100x80 benchmark passes to catch texture
or display-object growth.

## Automated Proof Contract

`render_game_to_text.performance.proofs` and
`renderer-qa-report.json.mapSwitchLeak.proof` expose machine-readable evidence
for the big-map gate:

- `benchmarkMapsCovered`: the 20x15, 50x40, and 100x80 fixtures all rendered.
- `tileBatching`: floor and wall layers used GPU tile layers with no CPU static
  layer fallback.
- `viewportCulling`: object sprites were accounted for and large maps produced
  culled offscreen objects.
- `objectPooling`: repeated map switches reused object sprites and did not
  allocate new sprites for the second 100x80 pass.
- `textureReuse`: semantic tilesets/object textures were reused by signature and
  the second 100x80 pass did not allocate new object textures.
- `noMapSwitchLeaks`: repeated 100x80 passes did not increase display object or
  texture counts.

The renderer QA artifact also records per-size sample counts, render duration,
display object count, texture count, visible/culled object counts, and culling
ratio so regressions are diagnosable without opening the app manually.
