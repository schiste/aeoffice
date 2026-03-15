# Technical Architecture

This document defines the current technical direction for AD&D.

It follows a simple rule:

**the game logic lives in Rust, the first playable client lives on the web, and any future visual engine is an adapter, not the source of truth.**

## 1. Current Stack Direction

- **Core simulation:** Rust
- **First playable client:** Web
- **Primary short-term target:** browser-playable developer build
- **Long-term targets:** web, iOS, Android
- **Future engine integration:** optional, only after the simulation core is proven

## 2. Architectural Principle

The simulation must be engine-agnostic.

That means:

- no frontend framework types inside the core,
- no scene-tree assumptions inside the core,
- no gameplay rules hidden in UI code,
- deterministic state transitions,
- and serialization owned by the core.

The frontend should only:

- display state,
- collect player input,
- send commands,
- and render the results of simulation updates.

## 3. Why This Direction

The current project priority is to prove and balance the idle dynamics:

- resource generation,
- staffing tradeoffs,
- safety pressure,
- offline progression,
- and long-term progression pacing.

Those problems are easier to solve in a web-first prototype than inside a richer visual runtime.

This approach also reduces rewrite risk later:

- the same Rust core can drive the web prototype,
- the same Rust core can later drive a mobile-friendly client,
- and a future visual engine can consume the same commands, state, and save data instead of owning game logic.

## 4. Target Layers

### 4.1 Simulation Core

Owns:

- authoritative state,
- command processing,
- tick progression,
- offline catch-up,
- balance formulas,
- persistence rules,
- and deterministic randomness.

Must not own:

- rendering,
- input widgets,
- animation,
- engine scene management,
- or platform-specific presentation code.

### 4.2 Web Client

Owns:

- the first playable interface,
- debugging and balancing surfaces,
- state inspection,
- touch/mouse-friendly controls,
- and developer iteration speed.

The web client is the first proving ground for the game.
It is not a throwaway prototype if built against a stable Rust core.

### 4.3 Future Engine Adapter

If later phases justify a richer visual runtime, it should be integrated as a frontend adapter around the same Rust simulation core.

That future adapter should:

- call into Rust for authoritative updates,
- render state visually,
- play audio/visual feedback,
- and remain replaceable without rewriting the simulation.

## 5. Portability Requirements

Portability is not a release concern only.
It should shape the architecture from the beginning.

The stack should favor:

- deterministic simulation,
- portable save/load behavior,
- a shared code path for game rules,
- touch-compatible interaction models,
- and performance characteristics that do not assume desktop-only hardware.

## 6. Repository Direction

At this stage, the repository should contain:

- design documents,
- authoritative mechanics definitions,
- Rust-first simulation work,
- and web-first product scaffolding.

The current scaffold follows that direction with:

- `crates/core` for the authoritative simulation core,
- `crates/web-bindings` for WebAssembly-facing bindings,
- `crates/web-worker` as the reserved worker-host boundary,
- and `apps/web` for the Solid web shell.

It should not currently carry:

- a visual engine runtime as the main source of truth,
- editor-specific assets that drive the roadmap,
- or stale technical experiments that imply a different direction than the one being pursued.

## 7. Working Rule

When a technical choice appears between:

- faster visual experimentation,
- cleaner simulation boundaries,
- easier balancing,
- or longer-term portability,

prefer the option that strengthens the Rust core and keeps the frontend replaceable.
