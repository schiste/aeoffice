# Travel Encounters (v0)

This document defines how travel encounters are generated/resolved while the Hero moves tile-by-tile.

Core decisions:
- Encounters can trigger **inside and outside** the bubble, with different authored rates.
- Triggers can occur on **tile entry** and **mid-travel**.
- When triggered, **movement pauses** until resolved (world time continues; Viral Load continues).
- Outcomes supported: `combat`, `event`, `loot_only`, `nothing`.
- Deterministic RNG: **per tile entry** seed derived from `(global_seed, tile_id, entry_count)`.
- Offline: travel can progress offline, but travel encounters **queue** and **stop travel** until the player returns.
- Hero can enter fogged tiles; entering reveals the tile (still not “explored”).
- Special events can be both travel outcomes and system hooks (e.g., finger loss checks after certain Echo Scars).

## 1) Authoring model
Encounter authoring is table-driven:
- A **table** describes: trigger moment(s), eligibility filters (terrain/region/content tags), a rate model, and a weighted list of outcomes.
- Tables can be layered:
  - “Global-ish” tables by terrain/region,
  - “Hot tile” overrides by tile tags/content.

## 2) Deterministic seed
For a tile-entry trigger:
- Maintain a counter `entry_count(hero_id, tile_id)`.
- When the Hero enters `tile_id`, increment the counter and compute:
  - `seed64 = hash64(global_seed, 'travel_encounter', tile_id, entry_count)`
- Use this seed to roll:
  - whether an encounter triggers (if using `per_tile_entry_chance`), and
  - which weighted outcome is selected.

Mid-travel triggers use a similar seed, but include the travel segment identity (TBD).

## 3) Offline queueing
If an encounter would trigger during offline travel:
- Create a `QueuedTravelEncounter` entry that stores:
  - tile/segment identity, trigger moment, seed, and the pre-selected outcome (deterministic).
- Stop travel at that point until the player returns.

## 4) Resolution notes
- If an outcome requires player choice (event with choices), resolution is deferred until the player is present.
- If an outcome is auto-resolvable (loot-only or “nothing”), it can still be queued for consistency, but v0 policy stops travel anyway (simplifies edge cases).

## 5) Open items
- Mid-travel segment identity + seed derivation.
- Event-choice structure and UI flow for queued encounters on login.
- First authored tables for early terrains/regions.
