# TODO (Project Lifeline)

Single source checklist for what must exist for a playable vertical slice.

## Decisions (Current)
- [x] UX target: **tap-light** idle (not a clicker); multi-quantity actions required.
- [x] Platforms: Mobile (portrait default + landscape), Web, PC, Mac.
- [x] Start-of-run intended loop: assign Hero → generate Bassline → bubble grows → reach Survivor Cave gate.
- [x] Early tension: Hero can staff Crystal Circle or Fire Pit (meaningful choice).
- [x] Starting structures: Crystal Circle (level 0), The Studio (level 0) present but **damaged** with `bunks_capacity = 0` until restored.
- [x] Early objectives v0: Restore The Studio, Build Fire Pit, and reach `ReachFromBase >= 3`.
- [x] First recruitment prerequisites v0: Studio restored + Fire Pit built + `ReachFromBase >= 3`.
- [x] v0 onboarding gate: first “Investigate → Explore” loop must be completed before Studio restoration unlocks (introduces first micro-fight and unlocks Water collection).
- [x] Bubble growth: automatic from stored Bassline at first; later upgrades may add control.
- [x] Bubble v0 calibration: all-plains start, layer-3 threshold `Bassline_pool=100` implies `K_field_base=0.36` (upgrades may modify `K_field`).
- [x] Early resources: Hero starts generating **Bassline only**; other bands unlock later via progression/story.
- [x] Starting class unlock v0: only **Drummer (Bassline)** is available; all class levels start at `0` (levels become relevant as multipliers).
- [x] XP v0: exponential thresholds (`xp_threshold_exponential`), band-gen XP is `1 XP` per `1` band unit actually stored (no XP from overflow), passive trickles grant no XP, offline band-gen grants XP.
- [x] XP persistence: Hero XP persists across Tunings; crew is tuned/run-scoped.
- [x] Class switching: punitive cooldown `180s` with one-time `10s` grace (grace interpretation TBD).
- [x] Viral Load v0: single `viral_load_ratio` scalar; progresses offline; Hero 0→100% in `24s` outside bubble; normal human 0→100% in `4s`; recovery 100%→0 in `240s` inside bubble.
- [x] Viral Load failure policy: “point-of-no-return” auto-return device; forced return to bubble then Studio (2× travel time), full incapacitation until recovered.
- [ ] Viral Load debuff tiers + effects (based on viral load ratio).
- [ ] Viral Load mitigation v0: consumables/items/safe spots (define models and early availability).
- [x] Echo Scars v0: triggered by forced-return events; mixed drawback+adaptation; uncapped stacks; affects exploration + Base; removable/mitigatable via consumables/items/buildings/perks.
- [ ] Author Echo Scar catalog (first 6–10 scars with effects + rarity/stacking rules).
- [x] Combat health v0: Wounds (LW/MW capacity) + Viral Load payloads on attacks; Hero baseline 3 MW of 6 LW; gear durability uses same MW/LW structure.
- [x] Hit-success v0: hit-rating ratio + d100 threshold (miss/hit/crit); ratings derived from `Tempo` + gear/perks/modifiers − malus; attacker advantage mult `1.15`; crit adds +1 LW bypassing modifiers and gear durability.
- [x] Crit v0: roll only after hit; `crit% = min(100, crit_rating_total)`; crit adds +1 LW bypassing gear; crit does not double Viral Load payload.
- [x] Attributes v0: unbounded; start at 0; sources are both progression and gear/perks/modifiers.
- [x] Theory→crit% table v0: milestones at levels 1/3/5/10, cumulative (very small).
- [x] Sustain scaling v0: start with +5% outside time and +5% recovery speed per Sustain (draft).
- [x] Tempo→hit_rating v0: identity mapping (`tempo_hit_rating_bonus = Tempo`); changeable later via `k_tempo_hit` if balancing needs it.
- [x] Gear v0: per-slot items with durability; random routing; at 0 durability item becomes damaged (stays equipped, penalties); repair at Studio/safe spots/anywhere with consumable.
- [x] Gear routing v0: weighted hit-location table (sums to 100%); rings max 10 (each finger), but fingers can be lost (reduces ring slots).
- [x] Finger loss sources: Echo Scars + special events.
- [x] Combat skills v0: Hero starts with `Attack` only (no separate basic); skills support AoE authoring; optional charges/ammo system; in-combat recovery via consumables.
- [x] Consumables v0: inventory slots=4; start with none; bandaids heal 1 LW (1 wound unit) usable anywhere; glue repairs +3 wound units to chosen damaged gear; instant use; 1s global cooldown outside combat; in combat per-item cooldown only; no use during forced return; exploration-loot source.
- [x] Tutorial encounter v0: Dweller Bane triggers on first Studio Explore; victory unlocks Studio restore + Crystal Circle “Removing Moss” (cleaning impulse).
- [x] Viral Load payload unit convention: `+1 VL` on hit = `+0.01` to `viral_load_ratio` (direct ratio delta).
- [x] Echo Scars v0: 15-scar catalog + selection pipeline stub (eligible-by-conditions + offer 3 + player choice) in templates; tone clinical/poetic/dark humor; removal is consumables-only (mechanics later).
- [x] Echo Scar doc: `documentation/echo-scars-v0.md`.
- [x] Travel encounters v0: trigger on tile-entry and mid-travel; pause movement; supports combat/event/loot/nothing; per-tile deterministic seeds; offline queues encounters and stops travel.
- [ ] Author v0 travel encounter tables (terrain + region + content-tag filters, weights, outcomes).
- [x] Travel encounter doc: `documentation/travel-encounters-v0.md`.
- [ ] Define queued-encounter resolution UX on return (stacked queue, ordering, “resume travel” control).
- [x] Passive Bassline trickle: unlocked by Crystal Circle upgrade **Removing Moss** (time-only `10s`, no Stone cost), runs always incl. offline, no XP.
- [x] Passive Bassline trickle gate: upgrade becomes available after the first Explore fight (Dweller Bane death) via story trigger.
- [x] Bands source (early): band resources are generated by the Crystal via staffing; expeditions return loot/materials (not bands directly).
- [x] Early Chorus: starts at `0` (power/brownout introduced later).
- [x] Recruitment gate definition: “within range” (Cave is ~6 tiles away; recruitment enabled when bubble is within 3 tiles / ~3 in-world hours).
- [x] Recruitment model (early): manual recruit actions, Vibes-paid at commit time, travel time applies, instant-arrival stock used first.
- [x] Bunks occupancy v0: Hero consumes 1 bunk; bunks do not hard-limit recruiting (overcapacity triggers BadVibes).
- [x] Fire Pit: must be built by the player (not a free starting building).
- [x] Building costs: buildings have a one-time creation cost; first material resource is **Stone** (others TBD).
- [x] Fresh run materials: start with **0 Stone** (no starter stash).
- [x] Early Stone sources: Base-tile **Scavenge** action + **map resource nodes**.
- [x] Base-tile Stone stock v0: tile stock max `10000`; scavenge rate `100 Stone/s` until depleted; then ambient rubble `1 Stone/tick`.
- [x] Define Water material (cap, sources, persistence) and add Base-tile Water collection numbers.
- [x] Define Water v0: pool cap 5L, Base-tile collection 2L/s, tile stock starts 5L, max 30L, regen 0.003L/s.
- [x] Define first “Investigate → Explore” loop v0: includes grumpy rat micro-fight with fixed loot 1 Skin; unlocks Studio restoration.
- [x] Water v0: collection is available from run start; the first Investigate→Explore loop grants the first Skin.
- [x] Fire Pit early power: no Chorus upkeep (works while `Chorus = 0`).
- [x] Fire Pit build: `200 Stone`, `4s` real-time build.
- [x] Restore The Studio v0: stone-only cleanup/fix actions; total work time target ~`20s` (including gathering + fixing).
- [x] Restore The Studio v0: costs `600 Stone`; restore time `12s`; intended to pair with base scavenge rate `100 Stone/s` (6s to gather).
- [x] Early work actions v0: building/restore/upgrade actions block an assigned worker; some actions persist progress when unassigned (Studio restore does).
- [x] Stone cap: `Stone_cap_base = 1000`; at cap, further collection is blocked (no penalty yet).
- [x] Stone persistence: Stone persists across Tunings; map resource nodes are persistent world-state.
- [x] Crystal Circle (L0): pure generator with **3** staffing slots.
- [x] Hero assignment swapping: small cooldown (draft **3s**).
- [x] Early pacing target: reach Survivor Cave gate in ~**5 minutes** (tuning target).
- [x] Early Bassline cap: `Bassline_cap_base = 100` (tuning anchor).
- [x] Recruit queue: multi-quantity queue + parallel travel timers.
- [x] Instant recruit feel: appears `1s` after tapping Recruit.
- [x] Instant recruit stock v0: starts `30`, decays `-1` per `10s` real time from run start, floors at `5`.
- [x] Simulation approach: per-system tick accumulators + event scheduling (idle catch-up until caps).
- [x] Stone class alignment: Drummer bonus / Vocalist neutral / Synth malus.
- [x] Node natural regeneration: linear (per-hour) where applicable.
- [x] Vibes: keep dedicated Fire Pit + synergy model (not generic resource alignment).
- [x] Cap rules: band overflow lost; material collection blocked; Vibes can go negative (positive cap TBD).
- [x] Vibes at cap: overflow lost.
- [x] Materials spending: spent only via manual player actions (no automatic upkeep spending).
- [x] Building cost scaling (unified): `Cost = BaseCost * CountMult_building(n_existing) * TuningMult_building(N)` (applies to creation + upgrades; exact per-building params TBD).
- [x] Building tuning cost scaling: `TuningMult_building(N)` depends on tuning count and is per building type (early buildings stay cheap).
- [x] Building tuning multiplier shape: piecewise grace + sublinear ramp (e.g. `1 + k_building*log2(1+max(0,N-N0))`, default `N0=3`).
- [x] Early building tuning scaling target: ~`+1%` by `N=10` (implies `k_building≈0.0033` when `N0=3`, per building type).
- [x] Building count scaling: `CountMult_building(n_existing)` is per building type (default linear), used in both creation and upgrade costs.
- [x] Building count scaling: `CountMult_building(n_existing)` is per building type (default mild power curve), used in both creation and upgrade costs.
- [x] Default building count exponent: `p_count_default = 1.2` (override per building type).
- [x] Fire Pit build limit: `max_count = 1` (attempting a second build shows a narrative warning message).
- [x] Nodes: multiple Stone node qualities from the start; node natural regen linear where applicable.
- [x] Stone nodes: non-regenerating by default; tech/buildings can unlock more stock (not time regen).

## Core Loop (Playable)
- [ ] Define the “start of run” loop (no-crew start, first assignments, first meaningful goal)
- [ ] Define crew acquisition/recruitment loop (including post-Tuning zero-crew restart)
- [ ] Define base interaction loop (what the player does minute-to-minute inside the Base)
- [ ] Define touch-friendly multi-quantity UI (x1/x10/xMax/custom)
- [ ] Define manual exploration loop (movement, risk, resting, returns)
- [ ] Define auto expedition loop (planning, destination rules, recall, rewards)

## Loot → Economy Pipeline
- [ ] Specify loot types returned by expeditions (items/materials/currencies)
- [ ] Define storage/inventory for loot (caps, persistence, UI)
- [ ] Specify processing/conversion: loot → `Bassline/Chorus/Harmonics` (and/or craft tiers)
- [ ] Define itemization + crafting system (what consumes/produces what)
    - [ ] (Later) Decide first 3 loot categories and their conversion path

## Materials + Scavenging (Early)
- [ ] Define generic material resource rules (caps, overflow blocking, persistence on Tuning)
- [ ] Define Scavenge system (after resource model): action timing, yields, UI (tap-light)
- [ ] Define per-actor scavenging efficiency model (Hero/crew) and how it affects yields
- [ ] Define map node stock depletion/regeneration rules (and what persists on Tuning)
- [ ] Define harvesting channels: Hero, expeditions, later buildings

## Bubble + Map Tech
- [ ] Finalize bubble algorithm for multi-source ripple + shared `Bassline_field` budget
- [ ] Define deterministic recompute cadence (tick schedule vs real-time) and offline progress behavior
- [ ] Specify terrain data schema (impedance, occlusion flags, per-tile shadow params)
- [ ] Specify loudspeaker/relay mechanics (placement rules, upkeep, re-attune, caps)
- [ ] Define authored regions (IDs, labels, difficulty bands, quest hooks) on top of streaming chunks

## Base Systems
- [ ] Define Base “placement model” (not decided yet): grid/rooms/slots, constraints, upgrade UX
- [ ] Specify Chorus power system details (LIFO, manual overrides, prioritization UI)
- [ ] Define building caps system (`max_count`, `cap_group`) per building type
- [ ] Specify detuned → attuned re-attunement costs/conditions per building/tech/perk
- [ ] Specify Bunks + Vibes system (capacity, upkeep, overcapacity penalty, tuning reset)
- [ ] Finalize negative-Vibes penalty scope + formula (crew efficiency multiplier)
- [x] Finalize instant recruit stock `X` function (how it is earned/refreshes)
- [ ] Define recruit one-time Vibes cost curve (scales with total recruited count)
- [x] Define "send crew back to Cave" mechanic (instant, no refund, removed for run; first-time defining moment with leadership archetype choice)
- [ ] Define manual recruiting UI + later automation unlocks
- [ ] Validate `BadVibes_rate = U * (1 + β * r^p)` v0 params (p=2, β=236)
- [ ] Define Vibes tick interval (units for Vibes rates/costs)
- [ ] Validate recruit cost curve against anchors (Cost_1=30, Cost_30=1200, Cost_500=60000)

## Crew System (In Design)
> Detailed design doc: `documentation/crew-system.md`

- [x] Define crew scale (~30 ceiling, expandable later)
- [x] Define crew identity structure (Name, Family, Creed, Profession, Class, Stats, Traits)
- [x] Define trait structure (3 traits: positive + negative + mixed)
- [x] Define trait tone (absurd, fun, lore-infused)
- [x] Define relationship model (simple: Family/Creed matching → flat bonuses/maluses)
- [x] Define Lindquist over-representation curve (degressive, success-based trigger)
- [x] Define creed interaction matrix (5 creeds, cooperation bonuses/maluses)
- [x] Define send-back defining moment (leadership archetype choice)
- [x] Author full trait catalog (positive/negative/mixed + combat/expedition/crisis categories)
- [x] Define trait rarity system (Common 60%, Uncommon 25%, Rare 12%, Legendary 3%, Story, Unique)
- [x] Define trait availability system (Universal, Family-weighted/locked, Creed-weighted/locked, Multi-condition, Story-unlocked, Unique)
- [x] Define trait opposition rules (mutually exclusive traits)
- [x] Define trait discovery timing (progressive: Trait 1 on arrival, Trait 2 after assignments, Trait 3 behavior-triggered)
- [ ] Balance trait effect values (placeholder percentages need tuning)
- [ ] Define profession skill trees and effects
- [ ] Define specific success triggers for Lindquist curve advancement
- [ ] Author send-back defining moment full narrative (per-personality reactions)
- [ ] Define story trigger for leadership archetype change
- [ ] Define family stat tendency values (specific bonuses per family)
- [ ] Define politics mechanical effects (tension values, event triggers)

## Population Census (In Design)
> Detailed design doc: `lore/factions/the_unplugged/population_census.md`

- [x] Define population demographics (age, gender distribution)
- [x] Define family size distribution (~149 families after 300yr consolidation)
- [x] Define major family population percentages
- [x] Define physical trait distributions (height reduced, brown eyes dominant, cave adaptations)
- [x] Define creed distribution (overall and per-family)
- [x] Define Sounding Five descendants (hidden non-believers, ~150 people)
- [x] Define political alignment distribution (overall and per-family)
- [x] Define profession distribution with family affinities
- [x] Define name generation system (culturally diverse first names, @ handle nicknames, family names)
- [x] Define generation algorithm structure
- [x] Define data structure for generated characters
- [ ] Author key story characters (Dadi, Hero's family, political figures)
- [ ] Define special recruit unlock conditions
- [ ] Validate distribution percentages against lore
- [ ] Build relationship generation rules
- [ ] Define generational trait inheritance

## Combat + Enemies
- [ ] Define combat actions/skills (cooldowns, resource use, targeting, statuses)
- [ ] Define enemy model and scaling (stats, AI patterns, boss level definition)
- [ ] Define fail states (Hero death? retreat? timeouts?) and consequences
- [ ] Define automation rules for combat (policy/priority, safety thresholds)
    - [ ] (Later) Lock Hero death/retreat rules

## Progression + Reset (Tuning)
- [ ] Finalize Resonance factor math + UI surfacing (Frontier/Depth/Time/Active/etc.)
- [ ] Finalize Harmonics/Fragments/Polishing/Refinement math + unlock gates
- [ ] Define what persists across Tuning (beyond current tags) and what resets
- [ ] Define “critical freebies” post-Tuning (what is re-attunable at cost 0 to avoid deadlocks)

## Safe Spots + Destinations
- [ ] Define safe spot construction (temp/permanent module crafting, costs, upkeep)
- [ ] Define destination discovery/unlocking rules tied to safe spots
- [ ] Define exact “outside bubble” behavior for safe spots and expedition locks (already immediate; ensure consistency)
    - [ ] (Later) Add explicit expedition reward/punishment layer beyond brownout/incapacitation

## Runtime / Product
- [ ] Save/load format and versioning for long-term design iteration
- [ ] Offline progress policy (what runs while app closed)
- [ ] Telemetry/debug overlays needed for balancing (bubble cost, power budget, Resonance breakdown)

## Offline Policy (Decisions)
- [x] Offline/catch-up includes: Base band resources + Vibes, recruit travel timers, and expeditions (never beyond caps).
- [x] Offline/catch-up excludes: Base Scavenge actions and manual Hero harvesting.
- [x] Offline/catch-up excludes: tile Investigate and tile Explore actions.
- [x] Material cap behavior: at cap, collection is blocked; mid-action reaching cap pauses and requires player intervention.
- [x] World-state: map resource node regeneration advances in real time while offline (per save slot).
- [x] World-state: map resource node regeneration advances in real time while offline (per save slot), for nodes/resources that have regen.
