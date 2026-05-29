# Frontend Architecture

This document defines the intended frontend architecture for AD&D.

It exists to keep the implementation fast, portable, and technically honest:

- **Rust owns the game**
- **the worker owns simulation execution**
- **Solid owns the interface**
- **the map renderer owns visual spatial rendering**

If a frontend choice weakens those boundaries, the choice is wrong.

---

## 1. Architecture Summary

The intended stack is:

1. **Rust core**
2. **Web Worker boundary**
3. **SolidJS UI shell**
4. **Canvas/WebGL map renderer**

The browser app should be a thin shell around an authoritative simulation core.
The frontend is not where game rules should accumulate.

---

## 2. Layer Responsibilities

### 2.1 Rust Core

The Rust core is the only source of truth for gameplay.

It owns:

- authoritative game state,
- command handling,
- simulation ticks,
- offline catch-up,
- save/load,
- deterministic randomness,
- formulas and balancing rules,
- and derived gameplay state that must remain authoritative.

It must not own:

- DOM state,
- UI component state,
- input widgets,
- rendering,
- animation orchestration,
- or browser-specific concerns.

### 2.2 Worker Boundary

The worker is the runtime host for the Rust core in the browser.

It owns:

- simulation execution,
- progression over time,
- offline catch-up calls,
- autosave preparation,
- heavy recomputation,
- and communication with the UI thread.

The worker exists to keep the main thread responsive.
The main thread should never be responsible for advancing the game simulation directly.

### 2.3 SolidJS UI Shell

SolidJS owns the application interface.

It should render:

- resources,
- staffing controls,
- progression panels,
- logs and debug surfaces,
- save/load actions,
- and other management screens.

It should also own local UI concerns such as:

- open/closed panels,
- focus state,
- temporary form state,
- local selection state,
- and presentation-only preferences.

It must not own gameplay rules.

### 2.4 Map Renderer

The map renderer owns spatial drawing only.

It should start as a minimal rendering surface and evolve independently from the simulation core.

The renderer may begin with:

- Canvas 2D for a simple hex grid

and later move to:

- WebGL via PixiJS or equivalent

when the map becomes large, animated, or interaction-heavy.

The renderer must consume game state.
It must not become the place where map gameplay rules secretly live.

---

## 3. State Ownership

State ownership must remain simple.

### 3.1 Rust-owned state

- all authoritative game state
- progression values
- resources
- staffing assignments
- timers
- offline progression results
- save data
- derived simulation outputs

### 3.2 UI-owned state

- panel visibility
- viewport mode
- currently selected tabs
- local hover/selection state
- temporary input drafts
- purely presentational preferences

### 3.3 Shared rule

If losing the value would alter gameplay, it belongs in Rust.
If losing the value would only affect the current presentation, it can live in the UI.

---

## 4. Communication Model

The UI thread and worker should communicate through explicit typed messages.

The direction is:

- UI sends **commands**
- worker sends **state updates**
- UI renders the latest known state

### 4.1 UI -> Worker

Examples:

- initialize game
- load save
- create new save
- apply gameplay command
- request offline catch-up
- request debug snapshot
- trigger save

### 4.2 Worker -> UI

Examples:

- initialized state
- simulation snapshot
- command result
- save result
- error state
- debug metrics

### 4.3 Rule for early implementation

Start with **compact snapshots**, not diffs.

Snapshots are easier to reason about and harder to corrupt.
Diffs should only be introduced after profiling proves snapshots are the bottleneck.

---

## 5. Time and Tick Model

Time progression must be owned by the worker and enforced by Rust.

Rules:

- the UI never invents progression on its own,
- the worker decides when ticks happen,
- offline catch-up is executed through Rust,
- and any displayed timers should be derived from authoritative state.

The frontend may interpolate presentation if useful, but interpolation must never change gameplay outcomes.

---

## 6. Save/Load Boundary

Save/load must be owned by Rust.

The worker should ask Rust to:

- serialize state,
- deserialize state,
- validate save payloads,
- migrate save versions,
- and rehydrate simulation state.

The UI should treat saves as:

- file operations,
- import/export actions,
- and user flow,

not as a second gameplay model.

---

## 7. Rendering Strategy by Phase

### Phase 1

- Solid UI for the management shell
- little or no spatial rendering
- minimal map stub if needed

### Phase 2

- same UI shell
- stronger debug surfaces
- simple canvas map or schematic grid if needed

### Phase 3+

- introduce a proper map rendering boundary
- keep Canvas 2D if it remains sufficient
- move to WebGL when scale, animation, zooming, or interaction density justify it

The renderer choice should follow performance evidence, not aesthetic preference.

---

## 8. Performance Rules

To preserve top-tier performance:

- keep simulation off the main thread,
- keep frontend state thin,
- avoid duplicating gameplay derivations in TypeScript,
- avoid large DOM-driven spatial rendering,
- batch worker/UI messaging when practical,
- and profile before introducing complexity such as custom diff systems.

---

## 9. Data UI Contract

The frontend must be deeply inspectable.

Every rendered `div` in the player and admin UI must have a readable `data-ui` attribute.
This is not optional.

The purpose is:

- stable automation hooks
- stable review/debug hooks
- easier UI inspection during rapid iteration
- safer refactors for a management-heavy interface

### 9.1 Naming Rules

`data-ui` values should be:

- unique within the rendered surface
- easy to read
- scoped by surface
- descriptive of purpose, not styling

Preferred pattern:

- `game-bassline-card`
- `game-bassline-card-source-value`
- `game-objectives-current-action`
- `admin-simulation-title`

Avoid:

- vague names
- purely positional names
- CSS-coupled names

### 9.2 Granularity Rule

Instrument the actual interaction and reading points, not just the container.

Good targets:

- cards
- headers
- titles
- values
- labels
- buttons
- toggles
- progress bars
- current status text
- risk text
- blocker text

### 9.3 Enforcement

`apps/web` runs a static `data-ui` check as part of `npm run check:web`.

Current enforced rule:

- every JSX `<div>` must carry `data-ui`

This is intentionally strict.
The point is to prevent the UI from drifting into partial instrumentation over time.

---

## 10. Presentation Selection

The schema layer is broader than the player UI.

That is intentional.

The frontend should not dump every available blocker, flow, or note into the interface.
Instead it should use a selector layer that chooses:

- one primary blocker
- one primary source
- one primary sink
- one primary risk
- one primary CTA label

The selector should prefer:

- explicit presentation metadata from the catalog
- higher display priority
- player-facing copy over engineering labels
- concise text over exhaustive text

Debug/admin surfaces may expose more detail.
The playable view should stay selective.

---

## 11. Visibility Selection

Player-facing UI should render by relevance, not by default.

Rules:

- every player-facing surface should have an explicit visibility condition,
- the default question is not "can we render this?" but "does the player need this now?",
- visible states should favor:
  - unlocked,
  - active,
  - non-zero,
  - currently blocking progress,
  - or immediately useful for the current session,
- hidden states should favor:
  - future systems,
  - zero-value dormant metrics,
  - built/completed options with no remaining interaction,
  - duplicate information already shown in a more primary surface.

Implementation guidance:

- keep visibility rules in selector helpers, not scattered inline across JSX,
- source those selectors from catalog visibility metadata whenever possible,
- prefer panel-level and row-level selectors over styling-only hiding,
- admin/debug views may stay denser,
- the playable view should progressively reveal systems as they become relevant.

The catalog now supports this in two ways:

- entity schema visibility for real game entities such as resources, roles, stations, actions, and recipes
- catalog `ui_elements` for synthetic surfaces such as bunks, housing, recruit cost, or panel-level sections

The goal is simple:

- the data model can know everything,
- the simulation can track everything,
- the player interface should only show what the player can act on, understand, or worry about now.

---

## 11. UI Copy Contract

Frontend copy should be centralized.

Rules:

- player-facing shell copy lives in `apps/web/src/lib/ui-copy.ts`
- domain-specific labels, hints, blockers, CTAs, and risk copy should come from catalog presentation metadata when possible
- `App.tsx` and presentation components should not own ad hoc user-facing prose
- inline JSX text should be limited to symbols, formatting glue, or content that already originates from the catalog or `UI_COPY`
- `scripts/check-data-ui.mjs` enforces both `data-ui` coverage and the no-inline-copy rule for TSX files

The goal is simple:

- game logic text belongs to the data model
- shell/product text belongs to the UI copy registry
- components compose copy, they do not invent it

---

## 9. UI Addressability Contract

The frontend must expose an explicit `data-ui` contract.

Rules:

- every rendered UI surface should have a readable `data-ui` attribute,
- every `div` must have a `data-ui` attribute,
- identifiers should be unique within the page,
- identifiers should describe structure and purpose, not styling,
- and nested sub-elements should use granular names rather than sharing one generic parent tag.

Examples:

- `game-bassline-card`
- `game-bassline-stepper-increment`
- `game-map-overlay-frontier`
- `admin-metric-budget`

This is not optional instrumentation.
It is part of the frontend architecture for testing, debugging, automation, analytics mapping, and fast inspection.

Premature optimization is not the goal.
But violating architecture boundaries early will be more expensive than optimizing later.

---

## 9. Portability Rules

The frontend should be built so the game remains portable.

That means:

- browser is the first runtime target,
- touch-friendly input is considered from the start,
- simulation does not depend on browser-only UI assumptions,
- and future platform wrappers should not require gameplay rewrites.

If the architecture is respected, mobile packaging later should be primarily a platform and UX problem, not a game logic rewrite.

---

## 10. Proposed Repository Shape

One reasonable target structure is:

```text
apps/
  web/
crates/
  core/
  web-worker/
  web-bindings/
documentation/
  frontend-architecture.md
```

Meaning:

- `crates/core`: pure simulation
- `crates/web-worker`: browser worker host around the core
- `crates/web-bindings`: wasm boundary and browser-facing exports
- `apps/web`: Solid app shell and map renderer

This is a target shape, not a requirement.
The boundary discipline matters more than the exact folder names.

---

## 11. Non-Negotiables

- Rust is authoritative.
- The worker runs the simulation.
- Solid renders the management UI.
- The renderer is replaceable.
- Save/load stays in the core.
- Frontend convenience must not become gameplay truth.

That is the intended frontend architecture for AD&D.
