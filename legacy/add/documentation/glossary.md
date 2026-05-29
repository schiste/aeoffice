# Glossary & Abbreviations (Design)

This glossary defines the abbreviations and variable names used across design docs and `documentation/scaling-models.json`.

## Core Variables

- `N`: Lifetime `tuning_count` for the current save slot.
- `N_at_purchase`: Snapshot of `N` taken when an untuned (persistent) object is purchased (used for grandfathered scaling).
- `R`: `Resonance` scalar (persistent meta variable, recomputed on Tuning).
- `R_at_purchase`: Snapshot of `R` taken when an untuned (persistent) object is purchased (used for grandfathered scaling).
- `R_eff`: Effective Resonance for cost scaling, `R_eff = log10(1 + R)`.
- `N0`: Grace threshold (in tunings) before some `N`-based scaling starts.
- `k`: Coefficient for scaling models (dimensionless unless stated otherwise).
- `p`: Exponent used in scaling models.
- `s`: Coefficient used in some anti-spam curves.
- `K_field`: Bubble budget conversion coefficient used in the ripple model: `cumulative_cost[r] <= Bassline_field * K_field` (units: impedance-per-Bassline).
- `K_field_base`: v0 baseline value for `K_field` before upgrades/research (currently `0.36` for all-plains start with layer-3 threshold at 100 Bassline).
- `L`: Class level for the relevant band/class (non-negative integer).
- `a_level`: Coefficient for the class-level multiplier curve (v0: `0.2`).
- `LevelMult(L)`: Class-level multiplier used for band output: `1 + a_level * log2(1 + L)`.
- `water_liters`: Unit convention for Water costs/amounts (1 unit = 1 liter).
- `claim_count`: Repeatable reward claim counter used for deterministic per-claim loot seeds.

## Cost / Count Variables

- `n_existing`: Number of existing buildings of a given type.
- `u_total`: Total number of upgrades purchased on a building (sum of levels bought across its upgrade lines).
- `BaseCost`: The base (unscaled) cost of an action/object.
- `CountMult`: Multiplier derived from `n_existing` and a count-scaling model.
- `UpgradeMult`: Multiplier derived from `u_total` and an upgrade-scaling model.
- `TuningMult`: Multiplier derived from `N` and an `N`-based tuning-count scaling model.
- `ResonanceMult`: Multiplier derived from `R` and a Resonance scaling model.
- `MetaMult`: Combined meta multiplier used for building costs, derived from `N` and `R` in one function (see `documentation/scaling-models.json`).
- `spam_factor`: Optional anti-spam multiplier term derived from `N` (used to discourage tuning too frequently).

## Vibes / Capacity

- `Vibes`: Current Vibes pool value (can be negative).
- `K`: Parameter controlling how punishing negative Vibes is (used in `exp(Vibes / K)`).
- `bunks_capacity`: Total bunks capacity provided by Base buildings.
- `missing_bunks (U)`: `max(0, crew_count - bunks_capacity)`.
- `crew_count (C)`: Current number of crew.
- `r`: Overcapacity ratio `r = U / max(1, C)`.
- `BadVibes_rate`: Drain rate caused by overcrowding (units: Vibes per tick).
- `BadVibesMult`: Hysteresis multiplier applied to `BadVibes_rate` while overcrowding persists.

## Fire Pit Synergy

- `B_total`, `C_total`, `H_total`: Total Drummer/Vocalist/Synth class levels across the relevant assigned staff group (including powerups from research/perks/items where applicable).
- `levels_per_set`: Class levels required per synergy “set” (default 10).
- `bonus_per_set`: Bonus multiplier per completed set (default +0.10).
- `sets`: `min(floor(B_total/levels_per_set), floor(C_total/levels_per_set), floor(H_total/levels_per_set))`.
- `synergy_mult`: `1 + bonus_per_set * sets` (optionally capped; default uncapped).

## Expeditions

- `p`: Expedition progress fraction in `[0,1]` (computed from progress, not time).
- `p_round`: `p` rounded up to the next 0.25 step (with `p<0.05` special-case per spec).

## Time Fields (Templates)

- `time_seconds`: Real-time duration (seconds) of a worker-blocking action/upgrade/build step.
- `total_work_seconds`: Total required real-time work for a `WorkTaskState`.
- `worked_seconds`: Progress accumulated so far for a `WorkTaskState`.

## XP / Leveling

- `XP0`: Base XP required for the first level-up (v0 anchor; see `documentation/scaling-models.json`).
- `b_xp`: Exponential growth factor for XP thresholds (v0 anchor; see `documentation/scaling-models.json`).
- `xp_total`: Total accumulated XP for an actor.
- `level_total`: Total level (sum of all level-ups earned).

## Combat: Wounds

- `LW`: Light Wound (the smallest wound unit).
- `MW`: Major Wound (a bundle of Light Wounds; higher severity).
- `major_wounds_max (X)`: Maximum Major Wounds a combatant/gear can sustain/absorb.
- `light_wounds_per_major (Y)`: Light Wounds per Major Wound (per track/item; sometimes written as “`Y`”).
- `light_wounds_max`: Derived: `major_wounds_max * light_wounds_per_major`.
- `wound_units_taken`: Single counter used by the same-pool wound model; LW adds +1, MW adds +Y.

## Combat: Hit Success

- `hit_rating`: Unbounded hit-success rating used for hit chance (derived from `Tempo` + gear + perks + other modifiers − malus).
- `hero_advantage_mult`: Hero-only multiplier applied to the Hero side’s `hit_rating` in the hit chance ratio (v0: `1.15`).
- `hit_chance`: Derived probability that an attack connects, computed from attacker/defender ratings via a ratio model (see `mechanics/specifications.md` and `documentation/object-templates.json`).
- `crit_rating`: Unbounded crit-success rating (derived from gear/perks/etc; exact sources TBD).
- `crit_chance`: Derived probability that a successful hit becomes a crit; influenced by `Theory` (v0: linear cap at 100%).
- `d100`: Convention used in combat: roll an integer `1..100` and compare to a threshold derived from `hit_chance`.
- `viral_load_delta_ratio`: Direct delta applied to `viral_load_ratio` by an attack payload (v0: `+1 VL` = `+0.01` ratio).

## Attributes

- `Sustain`: Hero attribute affecting Viral Load resistance and recovery (unbounded; starts at 0).
- `Tempo`: Hero attribute affecting cooldown recharge, mobility, and hit success ratings (unbounded; starts at 0).
- `Theory`: Hero attribute affecting enigma support and crit chances (unbounded; starts at 0).

## Skills / Charges

- `cooldown_seconds`: Time before a skill can be used again.
- `charges_current`: Current available uses for a skill/item.
- `charges_max`: Maximum charges for that skill/item.
- `replenish_model`: How charges refill (time/object/perk/etc).

## Inventory

- `inventory_slots_max`: Maximum number of inventory slots (v0: slot-limited; exact number TBD).
- `consumable_global_cooldown_seconds`: Global cooldown between consumable uses (v0: 1s outside combat).

## Modifiers

- `modifier_definition_id`: ID of a modifier type (defines target stat, value, duration, stacking policy).
- `modifier_instance_id`: Stable unique ID for one active modifier instance in a save file (required for determinism).
- `reapply_policy`: What happens when the same modifier is applied again (`refresh_duration`, `stack`, `take_max_value`, `ignore`).
- `stack_cap`: Max stacks for a modifier definition (or null for uncapped).
- `channel`: Debug/UI grouping for modifier sources (e.g., `gear`, `perk`, `consumable`, `event`, `zone`, `echo_scar`, `system`).

## Scaling Model IDs (Reference)

- `tuning_spam_factor_power`: Anti-spam term used in some cost models: `spam_factor = s * N^p` (see `documentation/scaling-models.json`).
