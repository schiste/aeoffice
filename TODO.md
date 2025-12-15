# TODO (Project Lifeline)

Single source checklist for what must exist for a playable vertical slice.

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
- [ ] Define crafting tiers usage: `Beats/Bars/Tracks/Albums` (what consumes/produces them)

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
- [ ] Finalize instant recruit stock `X` function (how it is earned/refreshes)
- [ ] Define recruit one-time Vibes cost curve (scales with total recruited count)
- [ ] Define “send crew back to Cave” mechanic (done: instant, no refund, removed for run; confirm UI/limits)
- [ ] Define manual recruiting UI + later automation unlocks
- [ ] Validate `BadVibes_rate = U * (1 + β * r^p)` v0 params (p=2, β=236)
- [ ] Define Vibes tick interval (units for Vibes rates/costs)
- [ ] Validate recruit cost curve against anchors (Cost_1=30, Cost_30=1200, Cost_500=60000)

## Combat + Enemies
- [ ] Define combat actions/skills (cooldowns, resource use, targeting, statuses)
- [ ] Define enemy model and scaling (stats, AI patterns, boss level definition)
- [ ] Define fail states (Hero death? retreat? timeouts?) and consequences
- [ ] Define automation rules for combat (policy/priority, safety thresholds)

## Progression + Reset (Tuning)
- [ ] Finalize Resonance factor math + UI surfacing (Frontier/Depth/Time/Active/etc.)
- [ ] Finalize Harmonics/Fragments/Polishing/Refinement math + unlock gates
- [ ] Define what persists across Tuning (beyond current tags) and what resets
- [ ] Define “critical freebies” post-Tuning (what is re-attunable at cost 0 to avoid deadlocks)

## Safe Spots + Destinations
- [ ] Define safe spot construction (temp/permanent module crafting, costs, upkeep)
- [ ] Define destination discovery/unlocking rules tied to safe spots
- [ ] Define exact “outside bubble” behavior for safe spots and expedition locks (already immediate; ensure consistency)

## Runtime / Product
- [ ] Save/load format and versioning for long-term design iteration
- [ ] Offline progress policy (what runs while app closed)
- [ ] Telemetry/debug overlays needed for balancing (bubble cost, power budget, Resonance breakdown)
