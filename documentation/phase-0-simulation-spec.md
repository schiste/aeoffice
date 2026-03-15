# Phase 0 Simulation Spec

This document defines the first real playable simulation for AD&D.

Its purpose is not to represent the full game.
Its purpose is to validate the first idle loop in a form that is:

- playable,
- inspectable,
- balanceable,
- and fully compatible with the long-term architecture.

## 1. Scope

Phase 0 focuses on:

- **three-band Crystal production**
- **Hero + tiny crew staffing**
- **Crystal Circle slot allocation**
- **Stone scavenging on the Base tile**
- **Water collection on the Base tile**
- **the first Base-tile Investigate → Explore onboarding loop**
- **The Studio restoration**
- **Fire Pit construction**
- **Resonance Chamber and Mix Console construction**
- **Vibes generation**
- **automatic bubble expansion from stored Bassline**
- **per-hex impedance-based bubble cost**
- **Bassline spending through timed construction jobs**
- **Chorus-powered station upkeep and brownouts**
- **Harmonics-driven efficiency tiers**
- **station-side processing recipes for efficiency progression**
- **the first reach objective at the Survivor Cave gate**
- **manual early recruitment from the Survivor Cave**
- **full offline progression**

Phase 0 explicitly excludes:

- direct outside-bubble danger simulation,
- exploration,
- combat,
- crew identity,
- tuning/reset,
- and authored content systems.

## 2. Authoritative Resources

Phase 0 has these core resources:

- `Bassline`
- `Chorus`
- `Harmonics`
- `Stone`
- `Water`
- `Vibes`
- `Skin` as a tutorial reward count

The runtime should also track:

- `bassline_cap`
- `chorus_cap`
- `harmonics_cap`
- `stone_cap`
- `vibes_cap`
- `base_stone_stock`
- `water_cap`
- `base_water_stock`
- `lifetime_generated`
- `lifetime_spent`

## 3. Actors

Phase 0 includes:

- the **Hero**
- a **tiny anonymous crew**

Rules:

- the Hero can be assigned or unassigned,
- the Hero and crew can be allocated to **Crystal: Bassline**, **Crystal: Chorus**, **Crystal: Harmonics**, **construction**, **Fire Pit: Vibes**, **Base: Scavenge**, or **Base: Water**,
- only Crystal Circle work consumes Crystal Circle slots,
- Fire Pit staffing is a separate base activity,
- `Bassline` starts available at run start,
- `Chorus` unlocks when the Studio is restored,
- `Harmonics` unlocks when the Resonance Chamber is built,
- the first Investigate and Explore actions are currently Hero-blocking,
- crew members have no identities or traits yet.

## 4. Station

Phase 0 includes these operational stations:

- `Crystal Circle`
- `Fire Pit`
- `Resonance Chamber`
- `Mix Console`
- `Workshop`
- `Research Booth`

The first processing layer is station-driven rather than a full crafting tree:

- `Resonance Chamber` can run `Field Calibration`,
- `Mix Console` can run `Signal Balancing`,
- `Workshop` can run `Builder Tools` and `Water Condensers`,
- `Research Booth` can run `Chorus Routing` and `Harmonic Study`,
- recipes consume existing material pools (`Stone`, `Water`) plus station time,
- recipes do not create raw band resources,
- recipes instead increase station-side efficiency/progression values,
- one processing job can run per station at a time,
- processing pauses when the required station is unpowered.

The Crystal Circle is responsible for three-band generation.
Workers allocated to production generate `Bassline`, `Chorus`, or `Harmonics` depending on role.
Workers allocated to construction consume Bassline over time and convert it into upgrade progress.

The Hero now has first-pass band progression:

- the Hero tracks `Drummer`, `Vocalist`, and `Synth` levels separately,
- only staffed Hero band output grants Hero XP,
- XP gain is `1 XP` per `1` stored band unit attributed to the Hero,
- passive Bassline trickle grants no XP,
- offline staffed band generation still grants XP,
- Hero band output uses the compounding class rule from the design docs.

It has upgradeable dimensions:

- slot capacity,
- output efficiency,
- and storage capacity.

It also supports field-efficiency work:

- `Polish Crystal Base`: `1 Skin + 5L Water`, `4s`, increases the Bassline-to-field conversion factor.

Those upgrades should be represented as **construction jobs with durations**, not as instant purchases.
Construction also requires active staffing while the job is in progress.
Construction costs are not paid upfront. Builder slots drain Bassline while they work.

Phase 0 also includes two base projects:

- `Restore Studio`: `600 Stone`, `12s` work, `+15 bunks`
- `Build Fire Pit`: `200 Stone`, `4s` work
- `Build Resonance Chamber`: `320 Stone`, `8s` work
- `Build Mix Console`: `420 Stone`, `10s` work
- `Build Workshop`: `260 Stone`, `8s` work
- `Build Research Booth`: `360 Stone`, `10s` work

Those projects are paid in Stone when started and require active construction staffing until complete.

The onboarding gate before Studio restoration is:

- `Investigate Base`: `5s`, online-only
- `Explore Base`: `10s`, online-only, Hero-only

Completing the first Explore grants:

- the first `Skin`
- `Restore Studio` unlock
- `Removing Moss` unlock on the Crystal Circle

`Removing Moss` is a time-only Crystal upgrade:

- `10s` work
- no resource cost
- grants a passive Bassline trickle
- and adds `+10%` to Crystal Circle output

Water is available from run start:

- player Water pool cap: `5L`
- Base tile stock starts at `5L`
- Base tile stock max: `30L`
- Base tile stock regen: `+0.003L/s`
- collection rate: `2L/s` per assigned worker

Bad Vibes pressure is now explicit in the loop:

- once the Fire Pit exists, overcrowding (`occupants > bunks`) generates Bad Vibes drain,
- base rate follows `U * (1 + beta * r^p)` with the documented v0 parameters,
- hysteresis doubles the Bad Vibes multiplier every `180s` while overcrowding persists,
- and decays back toward baseline over `60s` once overcrowding ends.

The bubble should follow the early design rules already chosen for AD&D:

- growth is automatic from stored Bassline,
- the stored pool itself defines the current field budget,
- expansion happens in rings,
- each ring cost is the sum of the impedance of all eligible hexes in that ring,
- spending Bassline elsewhere can lower the bubble target immediately,
- and inertia prevents instant collapse.

The three-band power layer should follow these rules:

- `Bassline` determines bubble reach through stored field budget,
- `Chorus` powers manual stations and active life support, and can trigger brownouts when upkeep exceeds supply,
- `Harmonics` improves three-band efficiency and field conversion,
- Harmonics tiers create discrete boosts on top of continuous efficiency,
- brownouts reduce effective output and field strength rather than only toggling stations off.

The first processing recipes currently feed this layer by:

- increasing Resonance Chamber field conversion bonus,
- increasing Mix Console harmonics efficiency,
- increasing Mix Console brownout tolerance,
- increasing Workshop construction speed,
- increasing Workshop water cap and water-stock regeneration,
- reducing Chorus life-support pressure,
- and lowering Harmonics tier thresholds.

For this phase:

- terrain impedance is already part of the simulation,
- blockers are excluded from bubble coverage,
- and the first map objective is the **Survivor Cave** at `6` tiles from the Base.

For this phase, inertia is implemented as:

- `10s` hold before shrink begins,
- then `10s` of degrade time per lost ring while the stored Bassline pool remains below the current target.

## 5. Core Loop

The Phase 0 loop is:

1. assign Hero and crew into Crystal, construction, Fire Pit, scavenging, or water collection,
2. generate Bassline over time,
3. scavenge Stone on the Base tile while online,
4. collect Water on the Base tile while online,
5. complete Investigate → Explore on the Base tile,
6. restore The Studio and build the Fire Pit,
7. let stored Bassline determine the bubble target automatically,
8. spend Bassline on Crystal upgrades and allow those spends to pull the bubble target down,
9. generate Vibes through the Fire Pit,
10. manage bunks pressure and Bad Vibes as crew grows,
11. push reach toward the Survivor Cave gate,
12. unlock recruitment once Fire Pit + Studio + `ReachFromBase >= 3` are all true,
13. recruit manually from the Survivor Cave using Vibes,
14. run station processing recipes to turn Stone/Water into efficiency gains,
15. repeat,
16. allow the same loop to continue while offline.

## 6. Player Actions

Phase 0 supports these player actions:

- assign or unassign the Hero,
- allocate the Hero to Crystal, construction, Fire Pit, scavenging, or water,
- allocate crew between Crystal, construction, Fire Pit, scavenging, and water,
- start `Investigate Base`,
- start `Explore Base`,
- start a Crystal upgrade,
- start a base project,
- recruit from the Survivor Cave,
- spend Bassline,
- advance time,
- and run offline catch-up.

If construction is active but no workers are allocated to building, progress should pause.
If construction is active but there is no Bassline available, progress should also pause.
If the active project is Stone-paid, the Stone cost is committed at start and only work time remains.
If stored Bassline falls below the current field target, the bubble enters hold, then degrade, then shrinks by rings.
If Stone reaches cap, scavenging pauses until capacity is freed.
If Water reaches cap, water collection pauses until capacity is freed.
If the recruitment gate is lost while recruits are in transit, those recruits are cancelled with no refund.
If a world action is active, offline catch-up must not advance it.

There is no failure state yet.
There is no win condition yet.
The purpose is to test whether the loop feels structurally right.

## 7. Offline Policy

Offline progression is **fully enabled** in Phase 0.

That means:

- Bassline production continues while offline,
- bubble target and shrink/growth continue while offline,
- Fire Pit Vibes generation continues while offline,
- recruit travel timers continue while offline,
- Base tile Water stock regeneration continues while offline,
- storage caps still apply,
- and upgrade effects should behave exactly as they would during active play.

The one explicit exception is:

- Base-tile Stone scavenging does **not** progress while offline.
- Base-tile Water collection does **not** progress while offline.
- Investigate / Explore actions do **not** progress while offline.

Phase 0 should already validate that the offline rules are part of the core design rather than a late add-on.

## 8. Validation Goal

Phase 0 is successful if:

- assignment feels understandable,
- Bassline generation, storage, and spending form a loop,
- Stone enables fast early base progression,
- Water provides the first persistent material loop from run start,
- the first Investigate → Explore loop creates a real onboarding gate,
- Studio and Fire Pit create visible mid-loop milestones,
- Removing Moss creates the first passive output relief,
- Vibes, bunks pressure, and recruit cost create a second resource pressure,
- upgrades create visible momentum,
- storage and bubble pressure both matter,
- the bubble grows and shrinks in legible ways,
- terrain impedance materially changes reach pacing,
- the Survivor Cave gate becomes a visible medium-term goal,
- early recruitment is readable and feels gated by real preparation,
- offline progression behaves predictably,
- and the runtime is useful for balancing.
