# Hero Character Sheet (Design, v0)

This document centralizes the current Hero-facing stats/state as defined across the mechanics and template docs.

## 1) Identity & Persistence
- The Hero is `untuned` (persists across Tunings), including XP/levels and long-term consequences (e.g., Echo Scars).

## 2) Primary Stats (Launch Set)
From `mechanics/specifications.md`:
- `Sustain`: Viral Load resistance and rest recovery rate (exact formulas TBD).
- `Tempo`: Cooldown recharge speed and mobility/avoidance (exact formulas TBD).
- `Theory`: Enigma support + small multiplier-multiplier effects (exact formulas TBD).

Combat-facing derived ratings (decisions, v0):
- `hit_rating` is derived from: `Tempo + gear + perks + other modifiers − malus` (unbounded).
- `crit_rating` is a separate rating (source mix TBD); `Theory` contributes via an authored per-attribute level table.
- v0 crit chance model: `crit% = min(100, crit_rating_total)` (linear, cap 100%).

## 3) Progression
- XP curve: exponential (`xp_threshold_exponential` in `documentation/scaling-models.json`).
- Level-ups apply to the currently equipped class.
- Class switching cooldown: 180s; after the first class change, one additional switch is allowed within 10s (undo/adjust), then cooldown applies.

## 4) Bands / Class Focus
- Early: the Hero can generate `Bassline` only.
- The Hero has the “compounding class multiplier” rule when producing a band (all Hero class levels multiply output).

## 5) Survival: Viral Load
- Single scalar `viral_load_ratio ∈ [0,1]`.
- Progresses offline.
- Outside bubble: Hero reaches 100% in 24s (v0).
- Inside bubble: recovery from 100% to 0% in 240s (v0).
- Point-of-no-return device: when remaining Viral Load budget is insufficient to safely re-enter bubble, forced auto-return triggers; the player cannot stop it; no events during retreat; return-to-Studio travel is 2× slower; recovery begins only at the Studio.

## 6) Combat Health: Wounds
- Wounds are separate from Viral Load.
- Wounds are expressed as: `major_wounds_max = X` and `light_wounds_per_major = Y`.
- v0 Hero baseline: `3` Major Wounds of `6` Light Wounds (18 LW total capacity).
- Foes use the same structure (authored per foe).

## 7) Gear Durability (Wound Protection)
- Gear protects from Wounds via durability using the same MW/LW structure.
- When gear has durability remaining, it can absorb incoming Wounds (exact slotting and break/repair loops TBD).

## 8) Echo Scars
- Echo Scars exist in v0 and are triggered by forced-return events.
- Each Scar is mixed: a drawback + a compensating adaptation.
- Scars can stack uncapped (exact stacking/soft-cap rules TBD).
- Scars can affect both exploration and Base production.
- Removal/mitigation sources: consumables, items, buildings/upgrades, and perks.

## 9) Movement (Travel-Time)
- Tile-by-tile movement timers; baseline plains travel is 1s per tile.
- Movement travel-time is separate from bubble impedance; some tiles may be blocked for movement until unlocks.
- Travel can trigger encounters/events; time does not stop.
- Tiles traversed during forced return do not count as “Hero visited”.
