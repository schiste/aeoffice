# Modifier System (Draft, v0)

This document defines how temporary/permanent modifiers (“buffs/debuffs”) are represented and combined across systems.

## 1) Why this exists
Many mechanics reference values like:
- `Tempo + gear + perks + other_modifiers − malus`
- production multipliers (`K_field_mult`, band output mults, Vibes penalties, etc.)

To keep behavior consistent and implementable, we standardize modifier **types**, **stacking**, and **persistence**.

## 2) Modifier Types

### 2.1 Additive Ratings (Unbounded)
Used for “rating” style values (combat hit rating, crit rating, etc.).
- Examples:
  - `hit_rating` adders (gear, perks, buffs, malus)
  - `crit_rating` adders (gear, perks, attribute tables)

Decision already taken:
- Combat hit/crit buffs are **rating adders** (not direct chance adders).

### 2.2 Multipliers
Used for scaling existing outputs/costs (band output, K_field, etc.).
- Examples:
  - `band_output_mult_all`
  - `K_field = K_field_base * product(K_field_mult_sources)`
  - Hero-only advantage multiplier for hit chance (`hero_advantage_mult = 1.15`)

## 3) Stacking Order (Proposed)
For a derived value `V`:
1. Start from base: `V_base`
2. Apply additive ratings: `V_add = V_base + Σ adders − Σ malus_adders`
3. Apply multipliers: `V_final = V_add * Π multipliers`
4. Apply caps/clamps (only when a system defines them; many ratings are unbounded)

Decision (MOD-0005): use this global order unless a system explicitly overrides it.

## 4) Duration & Persistence
Each modifier should define:
- `duration_seconds` (or `null` for permanent)
- `tuning_affinity` (`tuned` run-scoped vs `untuned` persistent)
- whether it progresses offline (most timers do; some systems are frozen by design)

Decision (MOD-0004/MOD-0008): durations tick in real seconds and progress offline by default.

## 5) Open questions (to be decided)
### 5.1 Representation (Decision)
We use both:
- **Implicit modifiers from sources** (gear/perks/Echo Scars/attributes): these are derived from owned/equipped state and are not stored as an “active list”.
- **Explicit active modifier instances** for temporary/time-based effects (consumables, events, zone effects): stored in save files with stable IDs for determinism.

UI note (MOD-0001): breakdown/details exist but are gated behind an explicit UI action (not always-on).
Decision (MOD-0012): modifier breakdowns are always **recomputed** from authoritative state; we do not store “snapshot” breakdowns for UI/history in save files.

### 5.2 Re-application / stacking policy (Decision)
Re-application behavior is **per modifier definition**. Supported policies:
- `refresh_duration`
- `stack`
- `take_max_value`
- `ignore`

Stack limits are per modifier definition (can be uncapped or capped).

### 5.3 Viral Load tiers (Decision)
Viral Load tier effects are treated as **separate debuffs** and should not feed into hit/crit/cooldown rating calculations in v0.

### 5.4 Gear “damaged” state (Decision)
At 0 durability, gear provides **no protection** and does not add additional malus ratings by default (malus-only damaged gear can exist later as authored exceptions).

### 5.5 Channels (Decision)
Modifier instances use channels to help debugging/UI. Channels exist (exact set is authored in config).

### 5.6 Determinism (Decision)
Every active modifier instance must have a stable `modifier_instance_id` for save/load and offline catch-up determinism.
