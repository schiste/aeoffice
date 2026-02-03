# Save/Load & Authoritative Game State (Draft)

This document defines what the authoritative game state is, how it is saved/loaded, and how offline catch-up is applied deterministically.

It is written to support a data-driven implementation where:
- **Definitions** live in authored content/data files.
- **State** lives in save-slot files.
- The simulation is the only authority that mutates state.

Related:
- `documentation/object-types.md`
- `documentation/object-templates.json`
- `documentation/scaling-models.json`
- `documentation/glossary.md`

---

## 1) Authoritative vs Derived State

### 1.1 Authoritative (Saved)
Saved state should include only what is necessary to continue simulation exactly and deterministically:
- Save-slot metadata (schema version, timestamps, platform/build info, content hash).
- Simulation clock anchor (`last_simulated_unix_seconds`) used for offline catch-up.
- Run state (tuning count, last tuning time, run start time).
- Persistent meta progression (`R`, fragments, refinement; exact list may change).
- Resource pools (bands, Vibes, materials) and any per-pool caps/cap overrides.
- Base objects:
    - placed building/station instances (type ID, level, upgrades purchased),
    - staffing assignments,
    - any in-progress construction/upgrade timers.
- Actors:
    - Hero state,
    - crew roster state (including class levels),
    - assignment/availability flags (e.g., on expedition, incapacitated later).
    - XP/leveling state (e.g., `xp_total`, `level_total`, equipped class, and any class-switch cooldown/grace timers).
    - Viral Load state (e.g., `viral_load_ratio`) and enough location/context to progress it offline (e.g., `current_tile_id` and whether the Hero is currently inside bubble coverage).
    - Active modifier instances (temporary buffs/debuffs) with stable IDs for deterministic catch-up.
    - Travel encounter state (per-tile entry counters, queued encounters when offline).
- Future-completing actions:
    - recruit travel entries (each with end-time),
    - expedition runs (each with end-time and any sub-states).
- World state that persists per save slot:
    - resource node stocks (depletion),
    - map knowledge/discovery (fog state; discovered regions),
    - per-tile exploration state (investigation flags, `exploration_level_current`, unlock grants),
    - global unlock flags (e.g., unlocked dungeons/POIs),
    - any “one-time” world interactions.
- Tick accumulators / fractional progress for any per-tick system, so catch-up does not drift over long sessions.
- RNG state (or deterministic seeds + counters) for any system that may roll while offline.

Construction/upgrade progress rule (v0):
- Some work actions are “worker-blocking” (a Hero/crew is tied up).
- Default: work actions persist partial progress when unassigned/cancelled.
- Some work actions may override this and lose progress when unassigned (TBD per task/building).
- Therefore, saves should store work tasks as `{ total_work_seconds, worked_seconds, assigned_worker_id? }` rather than only `{ end_time }`.

### 1.2 Derived (Not Saved)
Derived values should be recomputed on load to avoid save corruption and reduce file churn:
- Bubble coverage set (recompute from stored Bassline + sources + rules).
- ReachFromBase, zone tier maxima, etc. (derive from bubble + map knowledge).
- “UI caches” and summaries (production breakdowns, tooltips, computed multipliers).

Rule of thumb:
- If it can be recomputed from authoritative state and definitions deterministically, do not save it.
- If recomputing is expensive, cache it in-memory (not in the save).

---

## 2) Save Slots

One save slot contains:
- A state file (authoritative state, versioned).
- References to the current “definition pack” (game data version/content hash).
- Optional backups/rotations.

v0 decisions:
- **Slots:** 3 save slots.
- **Naming:** each slot has a player-facing name.
- **Backups:** keep the last 3 backups per slot + keep the last **2** “last-known-good” copies.

World persistence scope:
- Map resource node depletion/regeneration is persistent **within a save slot**.
- A new save slot starts with fresh world-state.

Save-slot invariants:
- Each save slot is simulated independently (no cross-slot state sharing).
- “Lifetime” variables like `N` (tuning count) are scoped per save slot.

---

## 3) Versioning & Migration

### 3.1 Save Schema Version
Every save file includes:
- `save_schema_version` (integer, monotonically increasing).
- `game_data_version` and/or `game_data_hash` (to detect mismatched definitions).

### 3.2 Migration Strategy
- On load, migrate older save schemas forward to current schema.
- Keep migrations deterministic and testable (pure functions).
- Never delete player data; preserve unknown fields when possible.

---

## 4) Time & Offline Catch-Up

### 4.1 Time Sources
The simulation uses:
- Real-time seconds for timers (build times, travel times, cooldowns).
- In-world time is derived (`60x` by default) for narrative/UI only.

### 4.2 Offline Scope (Current Decisions)
Offline/catch-up includes:
- Base band resource generation + Vibes generation (subject to caps).
- Recruit travel timers/arrivals.
- Expeditions progress/returns (returns never exceed caps).

Offline/catch-up excludes:
- Base scavenging actions.
- Manual Hero harvesting of map resource tiles/nodes.

Excluded systems are **frozen** while offline:
- Their timers/state are still saved (so progress is not lost),
- but `dt_offline` is not applied to them during catch-up.

### 4.3 Deterministic Catch-Up Model (Design Requirement)
Use per-system tick accumulators + event scheduling (no per-frame deltas):
- Store `last_simulated_unix_seconds` in the save.
- On load, compute `dt_offline = max(0, now_unix_seconds - last_simulated_unix_seconds)`.
- Build an in-memory event list from authoritative “in-progress” timers:
    - build completions,
    - recruit arrivals,
    - expedition arrivals (and any intermediate waypoints, if added later).

Catch-up loop (conceptual):
1. `t = last_simulated_unix_seconds`
2. `t_end = t + dt_offline`
3. While `t < t_end`:
    - `t_next_event = min(event.end_time >= t, t_end)`
    - Simulate continuous tick-based systems for `dt = t_next_event - t` using accumulators:
        - For each system S:
            - `accum_S += dt`
            - `ticks = floor(accum_S / tick_seconds_S)` (often `tick_seconds_S = 1`)
            - `accum_S -= ticks * tick_seconds_S`
            - Apply `ticks` in aggregate math (not `ticks` loops) using current rates.
            - Enforce cap behavior:
                - `overflow_lost`: clamp to cap after adding gains.
                - `blocked_at_cap`: gain is `0` while at cap.
    - Advance `t = t_next_event`
    - Apply any event(s) with `end_time == t` in a deterministic order (see ordering rules below).

Ordering rules (determinism):
- If multiple events complete at the same timestamp, apply them in a stable order:
    1) construction completions, 2) recruit arrivals, 3) expedition arrivals, then by ID tie-break.
- For any event that changes production rates or caps, apply the change before simulating the next segment.

Performance note:
- “Apply ticks in aggregate math” means computing `ticks * rate_per_tick` rather than iterating per tick.
- Future optimization (optional): compute time-to-cap for capped pools to skip ahead, but keep the same ordering semantics.

Clock issues:
- If device time goes backwards, treat offline delta as `0` for simulation and record a warning flag in the save.

---

## 5) RNG & Determinism

Any system that uses randomness and is allowed to progress offline must be deterministic across save/load:
- Either store an RNG state per system, or
- Store a seed per “run instance” (e.g., per expedition) and generate outcomes from that seed.

Recommended practice:
- Prefer per-system RNG streams persisted as `{ seed, counter }`, and “fork” per-instance seeds (e.g., expeditions) from the stream.
- Never use “call order” from UI interactions as a source of randomness; only simulation events advance RNG counters.

Exploration repeatables (decision EX-0004):
- For repeatable exploration rewards, use derived per-claim seeds instead of advancing a shared RNG stream:
  - `seed64 = hash64(global_seed, 'exploration_loot', tile_id, exploration_level, reward_id, claim_count)`
  - Persist `claim_count` per `(tile_id, exploration_level, reward_id)` and increment on each claim.

---

## 6) File Format (TBD)

The save file format and storage layout are TBD:
- JSON is human-readable for iteration, but larger and slower.
- Binary formats are smaller/faster but harder to debug.

v0 recommendation:
- Use JSON save files during design iteration.
- Keep the on-disk save strictly authoritative state (no derived caches).
- Rotate a small number of backups per slot to recover from corruption.

### 6.1 JSON vs Binary (Trade-offs)
Why JSON early:
- Faster iteration: easy to inspect, diff, and patch during balancing/design.
- Easier migrations: schema changes are simpler to implement and validate.
- Better debugging: players/devs can report broken states; we can reproduce issues faster.

JSON downsides:
- Larger files and slower parse/serialize than binary.
- Easier to tamper with (not an anti-cheat system anyway).
- More care needed for numeric precision and field defaults during migrations.

Why binary early:
- Smaller saves, faster load/save, fewer GC/parse spikes on mobile/web.
- Better long-term stability/perf when save state grows.

Binary downsides:
- Harder to debug and migrate without strong tooling.
- Corruption recovery is harder unless you already implement atomic writes + backups + validation.

Pragmatic compromise:
- Start with JSON (optionally compressed on disk), and design the simulation/state so the *format is swappable* later (no semantic differences).

---

## 7) Implementation Notes (Non-binding)

Recommended separation:
- `definitions/` (static data): buildings, stations, nodes, destinations, scaling profiles.
- `saves/slot_X.json` (state): authoritative state only.

Suggested on-disk layout (v0):
- `saves/slot_01/state.json`
- `saves/slot_01/backups/state.<timestamp>.json` (keep last N backups, N small)
- `saves/slot_01/last_known_good_01.json`
- `saves/slot_01/last_known_good_02.json`
- `saves/index.json` (slot list + names + last played)

Suggested save cadence (v0):
- Save on app background/exit.
- Save after any discrete event that mutates authoritative state (completion/arrival/purchase).
- Throttle disk writes (batch changes) to avoid frequent small writes.
- Autosave safety net: every **15s** (in addition to high-salience events).

Market practice (idle/strategy/adventure on mobile):
- Save on app background/kill risk events (mobile OS can terminate quickly).
- Save after purchases/claims/arrivals (anything the player would be angry to lose).
- Add a periodic autosave (often 15–60s) as a safety net, but throttle to avoid battery/IO spam.
- Use atomic write (write temp + fsync/flush + rename) and keep rollback copies (last-known-good).

The game should be able to:
- Load state.
- Recompute derived state.
- Apply offline catch-up.
- Present a “what happened while you were away” summary derived from the catch-up steps.

Non-goals for early implementation:
- Anti-cheat. (The system is deterministic but not designed to prevent clock spoofing yet.)
