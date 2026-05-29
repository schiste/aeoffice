# First Playable Version

This document defines the target for AD&D's **first playable version**.

It replaces the old phase framing as the practical near-term milestone.

The question this document answers is simple:

**What must be true for AD&D to be something a person can actually play, understand, and evaluate as a game?**

This is not the definition of the full game.
It is not the definition of the completed idle core.
It is the definition of the first version that deserves to be called **playable**.

## 1. Purpose

The first playable version must prove that AD&D is already interesting before:

- expeditions are implemented
- combat becomes deep
- exploration becomes large
- tuning/reset is online
- crew identity becomes rich

The first playable version should let someone sit down, understand the fantasy, operate the base, make meaningful decisions, and feel the game beginning to open up.

If that does not happen, the game is not playable yet.

## 2. Product Definition

The first playable version is:

- a base-first web build
- with a coherent first session
- with a readable idle economy
- with meaningful early progression
- and with enough persistence/offline behavior to feel like an idle game rather than a simulation sandbox

It is not:

- the full idle core
- the final game loop
- a content-rich world build
- or a production-polished release

## 3. The First Playable Promise

The player should be able to:

1. open the game
2. understand the main fantasy quickly
3. assign the Hero and crew
4. generate the first meaningful resources
5. restore the Studio
6. build the Fire Pit
7. understand bubble reach pressure
8. unlock recruitment
9. recruit at least once
10. feel that the base has entered a real growth loop

That is the minimum promise of the first playable version.

## 4. Required Experience

The first playable version must provide one coherent early-session arc.

That arc should feel like:

- a dead or quiet starting state
- the player activates the base
- the player learns what each resource means
- the player experiences the first resource bottlenecks
- the player resolves the first gating problems
- the player reaches the first external unlock
- the base begins to feel like a system they can optimize

If the build is mechanically correct but this arc is not legible, the build is not ready.

## 5. Required Systems

These systems must work for the first playable version.

### 5.1 Core Economy

- `Bassline`
- `Chorus`
- `Harmonics`
- `Stone`
- `Water`
- `Vibes`
- `Skin`

All of these must be:

- visible
- understandable
- and materially relevant in the first session

### 5.2 Staffing

- Hero assignment
- crew assignment
- Crystal staffing
- construction staffing
- base-side staffing

The player must be able to understand:

- what each assignment does
- what is constrained by slots
- what is constrained by crew count
- and what each staffing change costs them elsewhere

### 5.3 Bubble

The bubble must be real and legible.

That means:

- stored `Bassline` affects field budget
- field budget affects coverage
- spending affects risk
- shrink behavior is understandable
- the map reflects the current bubble meaningfully

### 5.4 Construction And Processing

The player must be able to:

- start meaningful upgrades/projects
- understand what they cost
- understand what blocks them
- understand what they improve

Processing must already feel like part of the base machine, not a hidden side rule.

### 5.5 Brownouts And Pressure

The player must experience at least the beginning of:

- Chorus power pressure
- station brownout logic
- housing pressure
- Vibes pressure

These systems do not need their final balancing, but they must already create understandable tension.

### 5.6 Recruitment

The player must be able to:

- understand that recruitment is a major early goal
- see what unlocks it
- unlock it
- recruit at least once

That is the point where the first playable version stops being "repair the base" and starts becoming "run the base."

## 6. UX Requirements

The first playable version must not require hidden knowledge to understand the current state.

At minimum, the UI must tell the player:

- what each major resource is for
- what is generating each major resource
- what is consuming each major resource
- what is blocked
- what the next objective is
- what the next unlock is
- what the current biggest risk is

The first playable version also needs:

- a clear `Game View`
- a clearly separate admin/debug surface
- wireframe-simple presentation
- no major ambiguity in labels

## 7. Objective Layer

The first playable version requires an explicit objective structure.

Not a vague sense of progression.
An actual visible structure.

At minimum, the player should always be able to see:

- current objective
- next objective
- current blocker
- current unlock path

The first playable version should not rely on the player deducing progression from raw systems alone.

## 8. Persistence And Offline

The first playable version must feel like an idle game.

That means:

- the game can be left and returned to
- state persists
- offline rules are coherent
- the player can tell what happened while away

Minimum required product behavior:

- save/load works reliably enough for repeated use
- offline catch-up works
- the UI can explain offline changes
- the player has a safe way to reset a run during development

## 9. What Is Not Required Yet

The first playable version does **not** require:

- expeditions
- `Resonance`
- relay/loudspeaker systems
- full loot-to-band conversion
- rich manual exploration
- travel encounters
- combat depth
- tuning/reset
- crew identity systems
- final visual presentation

Those are important, but they should not block the first playable version.

## 10. Exit Checklist

The first playable version is ready when all of the following are true:

- [ ] A new player can understand the first session without external explanation.
- [ ] The first objective arc is visible and coherent.
- [ ] The base economy is readable while playing.
- [ ] The player makes meaningful assignment and spending decisions.
- [ ] The player can restore the Studio.
- [ ] The player can build the Fire Pit.
- [ ] The player can unlock recruitment.
- [ ] The player can recruit at least once.
- [ ] The player can feel that the run is opening into a longer loop.
- [ ] Save/load and offline behavior feel like product features, not debugging tools.
- [ ] The build is stable enough to hand to another human and ask, "is this interesting?"

## 11. What Comes Immediately After

Once the first playable version is achieved, the next milestone should be:

**Idle Core Complete**

That should focus on:

- `Resonance`
- expeditions
- loot/material conversion into bands
- relay/loudspeaker mechanics
- final Vibes/Bunks lock

The first playable version proves the game has a pulse.
The next milestone proves the idle game can live for a long time.
