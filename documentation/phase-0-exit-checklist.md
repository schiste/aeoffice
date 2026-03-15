# Phase 0 Exit Checklist

This checklist defines what must be true before AD&D can be considered a completed **Phase 0 prototype**.

Phase 0 is not the full idle core.
Phase 0 is the first playable, balanceable, web-first base simulation.

The purpose of this checklist is to prevent two common mistakes:

1. calling the prototype "done" too early
2. adding post-Phase-0 systems before the current layer is actually clean

This checklist should be used as a gate, not as inspiration.

## 1. Scope Lock

- [ ] Phase 0 is explicitly treated as a **base-side prototype**, not the full game.
- [ ] The current Phase 0 scope is aligned between:
  - `documentation/idle-economy.md`
  - `documentation/phase-0-simulation-spec.md`
  - `documentation/development-timeline.md`
- [ ] Older documents that contradict current prototype decisions are either updated or clearly treated as future-state only.
- [ ] The team can state, in one short paragraph, what Phase 0 includes and what it excludes.

## 2. Core Simulation

- [ ] The playable loop is stable and legible.
- [ ] The three-band economy works:
  - `Bassline`
  - `Chorus`
  - `Harmonics`
- [ ] Core material loops work:
  - `Stone`
  - `Water`
  - `Vibes`
  - `Skin`
- [ ] The bubble works from stored `Bassline` budget rather than fake visual state.
- [ ] Chorus-powered stations and brownouts work consistently.
- [ ] Harmonics efficiency and tiering work consistently.
- [ ] Construction and processing both work and can be paused by missing requirements.
- [ ] Recruitment gate logic works.
- [ ] The simulation remains deterministic enough for balancing and offline catch-up.

## 3. Staffing And Rules Clarity

- [ ] Hero assignment behavior is clear and intentional.
- [ ] Crew assignment behavior is clear and intentional.
- [ ] Crystal slots are clearly distinct from non-Crystal staffing.
- [ ] Construction is clearly not treated as a Crystal slot system.
- [ ] Every major resource-producing role is visible and understandable.
- [ ] Every major blocking reason is visible and understandable.

## 4. Product Behavior

- [ ] The prototype is playable in the browser without developer intervention beyond loading the page.
- [ ] The live runtime advances while the page is open.
- [ ] Offline catch-up behavior is implemented and coherent.
- [ ] The player can understand why numbers change.
- [ ] The player can identify what is:
  - generating value
  - consuming value
  - blocked
  - at risk
- [ ] The prototype can be used as a balancing tool, not just as a visual demo.

## 5. UI Readability

- [ ] The `Game View` is separated from the admin/debug view.
- [ ] The player-facing UI does not duplicate the same data in multiple places unnecessarily.
- [ ] Major panels have clear ownership:
  - Hero
  - Crystal Circle
  - Map
  - Construction
  - Power
  - Base
- [ ] Ambiguous labels are removed or renamed.
- [ ] The map communicates bubble state clearly enough for Phase 0.
- [ ] The UI is wireframe-simple rather than pretending to be final.
- [ ] `data-ui` coverage remains exhaustive and readable.

## 6. Balance Readiness

- [ ] The early loop can be tuned intentionally.
- [ ] Resource caps are meaningful.
- [ ] Spending tradeoffs are meaningful.
- [ ] Brownouts are understandable rather than chaotic.
- [ ] Vibes/Bunks pressure is visible and materially relevant.
- [ ] Early pacing is within the intended rough window.
- [ ] The current numbers are at least good enough to evaluate design, even if not final.

## 7. Validation

- [ ] `cargo test` passes.
- [ ] `npm run check:web` passes.
- [ ] `npm run build:web` passes.
- [ ] The current web build reflects the actual current code without stale-server confusion.
- [ ] At least one explicit pass has been done to verify:
  - online progression
  - offline progression
  - construction progression
  - processing progression
  - brownout behavior
  - recruitment gating

## 8. What Must Not Block Phase 0 Completion

The following are important, but should **not** block a Phase 0 completion call:

- expeditions
- loot-to-band conversion chains
- relays/loudspeakers
- `Resonance`
- tuning/reset
- manual exploration depth
- travel encounters
- combat depth
- crew identity systems
- final visuals

Those belong to later milestones.

## 9. Exit Decision

Phase 0 can be called complete only when all of the following are true:

- [ ] The prototype is structurally sound.
- [ ] The prototype is playable and inspectable.
- [ ] The prototype is useful for balancing.
- [ ] The current docs agree on what Phase 0 is.
- [ ] The team agrees to stop adding post-Phase-0 mechanics until the exit review is explicitly closed.

## 10. Next Milestone After Phase 0

Once this checklist is closed, the next milestone should be:

**Idle Core Complete**

That milestone should focus on:

- `Resonance`
- expeditions
- loot/material conversion into bands
- relay/loudspeaker infrastructure
- final Vibes/Bunks lock
