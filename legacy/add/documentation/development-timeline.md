# AD&D Development Timeline

This document defines the intended **development sequence** for AD&D.
It is a milestone timeline, not a date-based schedule.

The goal is to build the game in the right order:

1. prove the idle core,
2. harden the simulation,
3. then add layers of complexity,
4. while preserving a path to **web first** and later **iOS/Android** portability.

The main rule is simple:

**Do not add the next layer until the current layer is stable, legible, and fun.**

---

## Timeline Logic

The project should begin as a **simple functional idle prototype** whose purpose is not presentation, lore richness, or content scale.
Its purpose is to validate and balance the core AD&D dynamics while being playable enough to use as a living testbed.

Early phases must prioritize:

- correctness of idle dynamics,
- offline progression,
- economy balance,
- clear simulation rules,
- and long-term portable architecture.

Early phases must explicitly defer:

- exploration,
- combat,
- crew individuality,
- tuning/reset systems,
- authored encounters,
- rich map metadata,
- and final presentation quality.

---

## Phase 0: Scope the Idle Core

### Objective

Define the smallest possible playable idle scaffold that can act as the foundation for the rest of the game.

### What the game is at this phase

A stripped-down systems prototype with minimal visuals, minimal theme dependency, and a deliberately narrow surface area.

### Must contain

- one base screen or equivalent management surface,
- one hexagonal grid or equivalent world stub,
- the first resource and staffing loop,
- the first safety/survival pressure loop,
- deterministic time progression,
- save/load,
- and offline catch-up support.

### Must not contain

- authored exploration content,
- combat,
- named crew personalities,
- tuning/reset,
- rich lore delivery,
- or map authoring depth beyond what is required to support the idle prototype.

### Exit gate

Do not leave Phase 0 until the team can state, in one page or less:

- the minimum playable loop,
- the exact resources and state variables in the prototype,
- what progresses online and offline,
- what counts as success/failure in the prototype,
- and what is intentionally excluded.

### Milestone achievement

**A scoped prototype spec exists and is small enough to build without ambiguity.**

---

## Phase 1: Build the Idle Engine Prototype

### Objective

Create the first playable browser build for the developer, focused entirely on core idle dynamics.

### What the game is at this phase

A functional prototype with placeholder presentation whose job is to let the developer play, inspect, and balance the economy while the game is running.

### Core systems to prove

- resource generation,
- staffing allocation,
- sound-as-survival pressure,
- bubble/safety logic in simplified form,
- resource storage/caps,
- progression pacing,
- offline progression,
- and state persistence.

### Design standard

The prototype does not need to look good.
It does need to be understandable while playing.
The developer must be able to observe the dynamics and tune them without needing later game layers.

### Exit gate

Do not add exploration until all of the following are true:

- the idle loop is playable in the browser by the developer,
- the core economy can run for multiple sessions without immediately collapsing,
- offline progression behaves predictably,
- save/load is trustworthy enough for repeated testing,
- the player can understand why numbers are moving,
- and the prototype is useful as a balancing instrument rather than just a demo.

### Milestone achievement

**There is a working web-first idle game engine prototype that can be played and used for balancing.**

---

## Phase 2: Harden the Economy and Simulation

### Objective

Turn the prototype into a reliable simulation foundation before adding feature breadth.

### Focus

- balancing resource inflows and outflows,
- validating staffing tradeoffs,
- stress-testing survival pressure,
- making offline progression deterministic and fair,
- clarifying simulation rules,
- and improving internal observability.

### Required additions

- debug views or developer-facing balancing surfaces,
- reproducible simulation behavior,
- explicit formulas and tunable parameters,
- and enough instrumentation to explain why the economy behaves as it does.

### Exit gate

Do not add exploration or content layers until:

- the economy is stable enough to tune intentionally,
- the main failure modes are understood,
- survival pressure is neither trivial nor opaque,
- offline progression does not produce nonsense states,
- and balancing changes can be made with confidence rather than guesswork.

### Milestone achievement

**The core idle simulation is hardened enough to support more complexity without hiding broken foundations.**

---

## Phase 3: Introduce the Minimal World Layer

### Objective

Add the smallest possible exploration surface after the idle mechanics are hardened.

### What enters here

- a simple hexagonal grid,
- basic map visibility and adjacency,
- minimal movement or expansion context,
- and only the amount of world representation needed to support the next gameplay step.

### What stays deferred

- rich tile metadata,
- authored encounters,
- combat,
- faction-rich world content,
- and detailed environmental storytelling.

### Why this phase exists

The world should first serve the gameplay structure, not the other way around.
The map begins as a support for progression and risk, not as a fully authored content object.

### Exit gate

Do not add combat or rich exploration until:

- the map layer meaningfully supports the idle loop,
- movement/expansion is understandable,
- the world representation does not break the economy,
- and the prototype still feels legible rather than bloated.

### Milestone achievement

**The game has a minimal but functional world layer connected to the idle core.**

---

## Phase 4: Add Exploration as a Game Layer

### Objective

Introduce exploration only after the economy and world scaffold are solid.

### What enters here

- basic outward progression,
- risk attached to leaving safety,
- lightweight exploration actions,
- and the first clear difference between “inside the refuge” and “beyond it.”

### Design intent

Exploration should deepen the existing game.
It should not replace the idle loop or distract from broken base dynamics.

### Exit gate

Do not add combat until:

- exploration creates meaningful tension,
- the player understands what they risk by going farther,
- return-to-safety matters mechanically,
- and the base/exploration relationship feels like one game rather than two disconnected systems.

### Milestone achievement

**AD&D now has a coherent base-to-world loop.**

---

## Phase 5: Add Combat

### Objective

Layer combat onto a game that already has working economy, progression, and exploration stakes.

### Why combat is delayed

Combat is not the foundation of AD&D.
If added too early, it will consume attention and obscure whether the game's deeper structure actually works.

### What enters here

- the first combat model,
- the first combat consequences,
- integration with exploration risk,
- and only as much combat depth as needed to validate the role it plays in the broader game.

### Exit gate

Do not add large content breadth until:

- combat supports the game instead of dominating it,
- combat consequences connect cleanly to survival and progression,
- and the economy still remains readable after combat enters the loop.

### Milestone achievement

**Combat exists as a supporting pillar rather than a destabilizing side project.**

---

## Phase 6: Add Crew Depth

### Objective

Introduce crew individuality only after staffing math is already proven.

### What enters here

- differentiated crew roles,
- attachment hooks,
- the first identity/personality layer,
- and the first situations where the player cares about more than raw output.

### Why this phase is later

Crew attachment is powerful, but if introduced before staffing math works, it will mask structural issues.
The game must first earn the right to make the player care.

### Exit gate

Do not move into broader authored content until:

- crew depth strengthens decisions rather than complicating them,
- attachment emerges without breaking legibility,
- and staffing remains optimizable even after personality enters the system.

### Milestone achievement

**The game now supports both optimization and attachment.**

---

## Phase 7: Add Lore Density and Authored Content

### Objective

Progressively layer in the richness that makes AD&D feel unmistakably itself.

### What enters here

- stronger location identity,
- authored encounters,
- richer text/content,
- world metadata,
- faction texture,
- and more explicit narrative expression.

### Design rule

Lore should enrich working systems, not compensate for missing ones.
By this phase, the game must already function without narrative crutches.

### Exit gate

Do not add major meta-systems like tuning/reset until:

- authored content strengthens the core loop instead of interrupting it,
- the game still feels playable when content volume increases,
- and AD&D's tone and identity are consistently visible in play.

### Milestone achievement

**The game becomes rich, authored, and recognizably AD&D rather than a generic systems prototype.**

---

## Phase 8: Add Tuning / Reset and Long-Arc Progression

### Objective

Introduce reset-based meta progression only after the player already has something worth resetting.

### Why this is late

Tuning is a long-arc retention system.
If added before the core game is compelling, it risks formalizing weak loops instead of elevating strong ones.

### What must already be true

- the base game is fun,
- the progression arc has shape,
- the player can become attached to runs and choices,
- and there is enough depth for reset to feel meaningful rather than mandatory.

### Exit gate

Do not treat Tuning as complete until:

- it creates renewed appetite rather than fatigue,
- it preserves the game's identity,
- and it improves long-term depth without invalidating the moment-to-moment fun.

### Milestone achievement

**AD&D now has a credible long-term progression spine.**

---

## Phase 9: Portability and Packaging

### Objective

Move from web-first playable game toward high-quality deployment on iOS and Android.

### Portability principle

Portability should influence architecture from the beginning, but platform packaging should not distract from proving the game.

### Early architectural requirements

From the start, the project should favor:

- a shared simulation core,
- deterministic state progression,
- portable save logic,
- input models that can survive touch-first constraints,
- and performance characteristics that do not assume desktop-only execution.

### Late-stage goals

- web build remains the fastest testing surface,
- mobile UX is made intentional rather than merely tolerated,
- performance is acceptable on target devices,
- and app-store packaging becomes viable once the game is worth distributing there.

### Exit gate

Do not prioritize mobile store release until:

- the game is already compelling on the web,
- the core loop is stable,
- performance is acceptable,
- and platform work is enhancing reach rather than rescuing an unfinished design.

### Milestone achievement

**The game is ready to move from private browser testing toward real distribution.**

---

## Timeline Summary

The intended order is:

1. scope the idle scaffold,
2. build the playable idle engine,
3. harden economy and offline progression,
4. add a minimal world layer,
5. add exploration,
6. add combat,
7. add crew depth,
8. add lore density and authored content,
9. add tuning/reset,
10. package for broader portability and release.

This sequence should only change if there is a strong reason that improves:

- correctness,
- long-term architecture,
- game identity,
- or the ability to balance the game well.

If a new idea is exciting but breaks the sequence, it should be captured and deferred rather than pulled forward by enthusiasm alone.
