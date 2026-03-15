# First Playable Assessment

This document assesses the current AD&D build against the target defined in
[`documentation/first-playable-version.md`](./first-playable-version.md).

It answers two questions:

1. What is already true in the current build?
2. What is still missing before the build deserves to be called the first playable version?

This is a status document, not a vision document.

## 1. Assessment Summary

The current build is **technically solid and mechanically promising**, but it is
**not yet the first playable version**.

The main reason is not missing infrastructure.
The main reason is **missing product legibility**.

The build already has a meaningful idle machine:

- three-band economy
- staffing and slot pressure
- Chorus power pressure and brownouts
- Harmonics efficiency/tier behavior
- Bassline bubble budget and reach risk
- construction and station processing
- first onboarding actions
- recruitment gate and first recruitment
- stable offline catch-up rules

But the build still behaves too much like a prototype for the player because:

- progression still needs fresh-player validation
- major sources and sinks are not surfaced clearly enough
- offline behavior does not yet feel like a product feature
- blocked states still require inference

The shortest path to first playable is therefore:

1. make resource sources/sinks and blockers fully legible
2. productize persistence/offline feedback
3. add save/load/reset player-facing affordances
4. do a focused first-session balance and usability pass

## 2. Current State Against The Target

## 2.1 Core Verdict

Current verdict: **not yet first playable**

Reason:

- the game can already be operated
- the base loop already exists
- the player can already make meaningful decisions
- but the build still assumes too much interpretation from the player

The missing work is primarily:

- UX legibility
- product behavior
- first-session pacing validation

## 2.2 Checklist Status

### A New Player Can Understand The First Session Without External Explanation

Status: **No**

What is true:

- the top-level layout is cleaner than before
- core systems are present
- labels are improving

What is still missing:

- explicit tutorial or guided objective structure
- clearer explanation of why the player should do the next thing
- clearer connection between systems and progression goals

Current risk:

- a new player can click around and operate the base
- but may not understand the intended sequence or priority of actions

### The First Objective Arc Is Visible And Coherent

Status: **Partially**

What is true:

- the underlying objective arc exists in the simulation
- investigate base
- explore base
- restore Studio
- build Fire Pit
- unlock recruitment
- a dedicated objective layer now shows current objective, next objective, blocker, and reward

What is still missing:

- usability validation with a fresh player
- tuning of the objective wording and transitions after the first-session pass

Current risk:

- the structure is now visible, but it is not yet validated as self-explanatory

### The Base Economy Is Readable While Playing

Status: **Partially**

What is true:

- the major resources are visible
- the three-band split is real
- brownouts and bubble risk exist
- several ambiguous labels have already been removed

What is still missing:

- stronger visibility into source vs sink for each major resource
- stronger explanation of what is consuming Chorus
- stronger explanation of what spending threatens Bassline coverage
- clearer explanation of what processing does and why it matters

Current risk:

- the systems are there, but some cause-and-effect still needs interpretation

### The Player Makes Meaningful Assignment And Spending Decisions

Status: **Yes**

What is true:

- staffing matters
- slots matter
- power matters
- building order matters
- spending can threaten bubble safety

Why this is already good enough:

- the player can already trade growth, stability, power, and processing against each other

### The Player Can Restore The Studio

Status: **Yes**

The current build supports the onboarding sequence and Studio restoration.

### The Player Can Build The Fire Pit

Status: **Yes**

The current build supports Fire Pit construction as part of early progression.

### The Player Can Unlock Recruitment

Status: **Yes**

The current build contains the unlock path and gate conditions.

### The Player Can Recruit At Least Once

Status: **Yes**

The first recruit loop is already present.

### The Player Feels That The Base Has Entered A Real Growth Loop

Status: **Partially**

What is true:

- after Studio, Fire Pit, stations, power, and recruitment, the base clearly expands in complexity

What is still missing:

- a clearer feeling of “what opens next”
- more explicit signposting that the run is broadening rather than merely becoming denser

Current risk:

- the player can feel growth mechanically without feeling the structure of that growth

### Save/Load And Offline Feel Like Product Features

Status: **No**

What is true:

- offline catch-up exists
- the runtime architecture supports persistence

What is still missing:

- player-facing save/load surface
- player-facing reset/new-run surface
- “while you were away” summary
- clean explanation of what progressed offline and what did not

Current risk:

- the game behaves like a simulation runtime with offline support, not yet like a finished idle product

### Stable Enough To Hand To Another Human

Status: **Yes, With Caveats**

What is true:

- the runtime is stable enough for internal testing
- validation commands pass
- the base loop is coherent enough to evaluate

Caveat:

- the build is currently best suited for directed testing, not blind discovery

## 3. What Is Already Good Enough

These areas no longer block first playable at the systems level.

### Architecture

- Rust authoritative sim
- clean catalog/data model
- web worker boundary
- separated UI/admin structure

This is not the bottleneck anymore.

### Base Idle Mechanics

- three-band economy exists
- staffing and slots exist
- Chorus pressure exists
- Harmonics efficiency exists
- Bassline bubble budgeting exists
- early station network exists
- processing exists
- recruitment exists

This is enough to support a first playable version.
It is not the final idle core, but it is enough.

### Early Progression Skeleton

- the first sequence already exists in mechanics
- the problem is presentation and guidance, not absence of the sequence

## 4. What Is Still Missing

These are the true blockers to calling the build first playable.

## 4.1 Resource Legibility

The UI still needs to make these questions trivial:

- what is producing each major resource
- what is consuming each major resource
- what is capped
- what is blocked
- what is risky right now

The player should not have to infer these from layout alone.

## 4.2 Offline Productization

Offline exists mechanically but not yet experientially.

The game still needs:

- a visible offline summary
- a clear return-to-game report
- clean save/load/reset affordances
- coherent player-facing persistence behavior

## 4.3 Blocked-State Messaging

The build still needs stronger reasons in the UI for:

- why a project cannot start
- why a process is paused
- why a station is unpowered
- why recruitment is not available yet

The systems exist, but the communication is still incomplete.

## 4.4 First-Session Usability And Balance Pass

The game still needs one focused pass on:

- pacing of the first 10 to 20 minutes
- clarity of early bottlenecks
- order of likely early actions
- visibility of the first meaningful unlock

This is not a large design task.
It is a tuning and onboarding task.

## 5. What Should Not Block First Playable

These are important later, but they should not delay the first playable milestone:

- expeditions
- Resonance
- relay/loudspeaker networks
- manual exploration depth
- combat
- tuning/reset
- crew identity systems
- final visual style

These belong to the next layers of development.

## 6. Shortest Path To First Playable

This is the recommended order of work.

### 1. Add Resource Source/Sink Visibility

For the major resources:

- Bassline
- Chorus
- Harmonics
- Water
- Vibes

show clear source and sink summaries in the player UI.

### 2. Add Offline Return UX

Implement:

- “while you were away”
- what advanced
- what was blocked
- what completed

This is required for the build to feel like an idle game.

### 3. Add Save/Load/Reset Product Surfaces

Even in development mode, the player-facing build needs:

- save
- load
- new run / reset

Admin-only controls are not enough for first playable.

### 4. Do One Focused First-Session Pass

Run the build through the intended first-session flow and tighten:

- timing
- bottlenecks
- visibility
- objective transitions

### 5. Test With One Fresh Player

The first playable milestone should be validated by at least one person who did not build the game.

The question is not whether they can operate the systems.
The question is whether they understand what the game is asking them to do.

## 7. Practical Conclusion

The game does **not** need another major mechanics layer before it can become first playable.

The build already has enough systems for that milestone.

What it needs now is:

- communication clarity
- offline/persistence productization
- a first-session usability pass

That is the shortest real path to a first playable version.
