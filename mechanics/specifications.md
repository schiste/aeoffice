# Game Specifications

**Version:** 1.0.0 (Rust Edition)

## 1. Core Mechanics

### 1.1 The Acoustic Threshold (Physics)
The game world is defined by **Signal-to-Noise Ratio (SNR)** instead of HP.
* **The Silence:** The ambient environment has a dampening rating (e.g., -60dB).
* **The Output:** The **Base (Studio + Crystal)** emits sound (e.g., +65dB), produced by the crew, their equipment, and artifacts.
* **The Net Result:** `Output + Silence = Safety Margin`.
    * **> 0dB:** Safe. Viral Load decreases.
    * **< 0dB:** Danger. Viral Load increases.

### 1.2 Viral Load (Health)
Replaces traditional HP.
* **Viral Load:** 0% (Healthy) to 100% (Death).
* **In Silence:** Increases based on `(Time * DecayRate) / Resistance`.
* **In Sound:** Decreases rapidly (Recovery).
* **UI:** Displayed as a "Vitals Monitor" waveform, not a red bar.

### 1.3 Amplitude (Exploration)
Map progression is physically tied to volume.
* **Amplitude:** The radius of the safe zone around the Base Crystal.
* **Minimum radius:** Default is `0` tiles (Base tile only).
* **Primary driver:** **Bassline stored pool** (low-band stored resource), not just current output rate.
* **Modifier:** **Harmonics** improves Crystal efficiency (tuning), increasing how much Amplitude you get from the same Bassline.
* **Formula (preferred physical model: ripple rings):**
    * Let `Bassline_pool` be the current stored Bassline.
    * Let `Harmonics_raw` be the current high-band production rate (per second) (derived from tick contributions).
    * Let `η_B(Harmonics_raw)` be the Harmonics efficiency multiplier applied to Bassline-to-field conversion (hybrid: smooth + milestones; shape TBD).
    * Define “field charge”: `Bassline_field = Bassline_pool * η_B(Harmonics_raw)`
        * Intuition: Harmonics increases how much *reach* you can get out of the same stored Bassline.
    * Each map hex has a `terrain_impedance` that determines how much field charge is required to include it.
        * `terrain_impedance = base_terrain_impedance * feature_modifiers * tech_modifiers * building_modifiers`
        * Examples (placeholders): water `0.1`, plains `1.0`.
        * Rivers can have very low impedance (sound carries well), but impedance should remain `>= 0` to avoid degenerate “negative-cost” expansions.
    * Some terrains (e.g., mountains) are **hard blockers** with `terrain_impedance = ∞` until specific research/buildings are unlocked.
    * Compute ripple coverage using hex rings, per sound source:
        * The Base Crystal is always a sound source.
        * Loudspeakers (relays) can add additional sound sources (see below).
        * Each source emits a circular ripple from its own position (no bending).
    * Acoustic shadowing (no bending):
        * Occluders do not just exclude themselves; they also cast a “shadow” behind them that the ripple cannot pass through.
            * Split “difficulty” vs “occlusion”:
                * `terrain_impedance(tile)` controls how expensive the tile is.
                * `occludes_ripple(tile)` controls whether it blocks propagation (casts a shadow).
                * Example: mountains are `occludes_ripple = true` and start as `terrain_impedance = ∞`.
                * Occlusion is persistent: even if some tech/buildings reduce a blocker’s impedance later, it can still cast a shadow unless a dedicated “over-the-top” solution is active.
                * There is no “tunneling/bending” through occluders: you either go around (relays) or over (late tech/buildings).
            * Define `is_blocker(tile) := terrain_impedance(tile) = ∞` (until mitigated).
            * Define `is_shadowed(source, tile)` using hex line-of-sight:
                * `source` can be the Base Crystal or an active Loudspeaker relay.
                * Draw the hex line from `source` to `tile` (cube-coordinate line; details TBD).
                * If any intermediate hex on that line has `occludes_ripple = true`, then `tile` is shadowed from that source.
                * Shadow “widening + depth cap” (real-ripple feel):
                    * Each occluder tile instance defines `shadow_max_depth_tiles` (how far the shadow extends) and optional width parameters.
                    * The shadow cone widens slightly with distance (“a mountain blocks a bit more far away than close”), but is clamped:
                        * `shadow_width(d) = clamp(width0 + width_slope * d, 0, width_max)`
                        * and does not apply past `shadow_max_depth_tiles`.
                    * Parameters are tuned later; the key rule is: widening is small, clamped, and per-tile-configurable.
    * Bubble coverage (conceptual; exact algorithm TBD):
        * For each active source `s`, compute a max ring index `r_s` such that the ripple cost from that source stays within budget.
        * A tile is in the bubble if it is within `r_s` of at least one active source **and** it is not a blocker **and** it is not shadowed from that source.
        * The global bubble is the **union** of all source ripples.
        * For UI/tiering, define `Amplitude_radius_max = max hex_distance(base, tile)` over all tiles currently in the bubble.
    * Budget note (balancing TBD):
        * Loudspeakers are relays; they do not create a separate Bassline pool.
        * Exact allocation of `Bassline_field` across multiple sources (Base + relays) is to be defined and balanced later.
    * **Mitigation via new emitters (Loudspeakers):**
        * Some buildings can act as additional **Bassline emitters** (new spawning points for the ripple).
        * Loudspeakers are **relays**: they do not get a separate Bassline allocation; they use the same global `Bassline_field` budget and allow propagation into regions that were shadowed from the Base by providing an alternate line-of-sight source.
        * Power/placement rules:
            * Loudspeakers are Chorus-powered stations: they have Chorus upkeep when Attuned.
            * Loudspeakers can only be placed **inside** the current bubble (they require Chorus access).
            * If a loudspeaker loses Chorus (e.g., falls outside the bubble due to shrink), it turns off immediately. This can instantly remove access to regions that only existed via that relay (coverage shrinks immediately).
            * Once Chorus returns, the loudspeaker turns back on and the **safety coverage** resumes immediately (no “re-conquer” of previously revealed tiles).
        * “Over-the-top” tech:
            * Progression can offer both:
                * a global tech unlock that allows propagation **over** occluders (mountains), and/or
                * a building-based solution that projects “over the top” for a limited region.
            * These reduce or bypass shadowing rules. (Exact unlocks and math TBD.)
* **Formula (approximation for tuning/UI; optional):**
    * When a full ring-cost inversion is undesirable (e.g., early prototype), approximate with:
        * `Amplitude_radius ≈ base_min_radius_tiles + C_r * (Bassline_field)^α` with default `α = 0.5`.
    * Player control: because Bassline is a stored pool used for many things, the player can effectively choose to grow/shrink Amplitude by choosing when to accumulate Bassline versus spending it elsewhere.
    * Later tech/perk: allow setting a **Bassline storage floor** > 0 so Amplitude cannot collapse fully (stability tool).
        * Early-game default: spending Bassline for other actions can immediately shrink the bubble (intended as a meaningful tradeoff).
        * “Field reserve” is a later tech: the player can lock some stored Bassline as bubble-reserved so it cannot be spent accidentally.
* **Inertia (2-phase):** If Base generation drops sharply (or to 0), the field does not collapse instantly:
    * **Hold:** 60s with no change.
    * **Degrade:** then decays over the next 60s (curve TBD; default linear).
        * If Base generation is **0**, Amplitude decays to the **minimum radius**.
        * Otherwise, Amplitude decays toward the new equilibrium.
* **Effect:** Expanding Amplitude automatically "un-fogs" the map, revealing new dungeons and resource nodes.
    * **Reveal pacing:** newly eligible hexes are revealed gradually at `reveal_rate_hexes_per_second` (tuned later), rather than instantly revealing the entire radius in one frame.
    * **Eligibility:** a hex becomes eligible for reveal if it is in the current bubble coverage set (union of active-source ripples; see above).
    * **Persistence:** once a hex is revealed, it remains revealed permanently even if it later becomes unsafe.
    * **Safety rule:** outside current bubble coverage, there is no Chorus access; any Chorus-dependent objects outside go offline immediately.

### 1.4 Exploration, Quests, Enigmas, Expeditions
Outside the Base, the player explores the map to discover locations, complete quests, solve enigmas, and run expeditions.

Map representation:
* The world map uses a **hex grid**.
* Distance and rings are computed using hex distance (implementation details TBD; recommend **cube coordinates**).
* **Reveal vs safety:** fog-of-war reveal is permanent (map knowledge persists), but safety/Chorus access depends on current bubble coverage.
* Terrain:
    * Base terrain types (draft list): plain, forest, water, river, bridge, hills, mountains, city, village.
    * Tiles can also carry style/modifier tags (e.g., desert as a “sandy hills/plain” modifier) rather than requiring a separate base terrain type.
    * Every terrain supports `occludes_ripple` and per-tile occlusion parameters, but for now **only mountains** are occluders.
        * Rivers are not occluders; they only affect impedance.

* **Manual Mode:** Direct control for exploration and encounters; best for puzzles/enigmas and high-risk pushes.
* **Auto Mode:** The game plays on behalf of the player using the same real-time combat/action systems.

Expeditions are a primary way to acquire resources over time:
* **Player choices:** Select a destination and an expedition composition (**crew only**).
* **No failure:** Expeditions always complete; the only limiting factor is **real-time duration**.
* **Composition effects:** Changes expedition duration, loot amount, and loot rarity.
* **Crew slots:** Expedition composition uses up to **16** crew slots.
* **Shared staffing:** Expedition crew comes from the same pool that powers Base sound output; sending crew out reduces Base output accordingly.
* **Parallel runs:** Multiple expeditions can run in parallel; each consumes its assigned crew for the full duration.
* **Coordination fiction:** Expeditions are supported/managed from the Base (planning, comms, remote operation), so Base brownouts can slow or stall them.

### 1.5 Forward Safe Spots
Later in progression, the player can create forward safe spots outside the Base.
* **Purpose:** Reduce Viral Load pressure during long pushes and act as staging points for exploration.
* **Unlock model:** Gated behind upgrades, crafting, or quest milestones (to be defined).
* **Destination unlock:** Safe spots are the mechanism to unlock expedition destinations.
    * **Temporary safe spot:** Unlocks a destination for a limited time.
    * **Permanent safe spot:** Unlocks a destination forever.
* **Power model:** Safe spots are powered by **Chorus** (not Bassline/Amplitude). They consume Chorus like stations do.
    * If Chorus cannot sustain them, they collapse immediately (no inertia).
    * Temporary safe spots also collapse when their duration ends, regardless of power state (vanish immediately).
    * Permanent safe spots do not expire, but they can still go offline if Chorus cannot sustain them (destination relocks until power returns); they come back online automatically when Chorus returns.
    * If a safe spot collapses, its unlocked destination becomes locked immediately and any active expeditions to that destination are automatically recalled using the Recall rules.
    * Destination locks apply to **auto expeditions only**; the Hero can still travel/quest outside safe spots.
    * **Tuning:** Safe spots are `tuned` objects and always collapse on Tuning (even “permanent” ones).
    * **Bubble dependency:** Safe spots require Chorus access; if a safe spot falls outside the Base bubble (Amplitude shrinks), it loses Chorus access and goes offline (treated as a collapse for destination/unlock purposes).
        * This is immediate (no inertia), like a light turning off.
* **Hero rest:** Safe spots serve as rest points for the Hero during manual exploration.
    * **Baseline effect:** Rest reduces Viral Load to **0% over time**.
    * **Rest rate:** Viral Load recovery rate during rest is derived from character stats (TBD; likely influenced by **Sustain**).
    * **Cost model:** Rest is “free”; the only upkeep is the safe spot’s normal Chorus consumption as a station.
    * Buffs/secondary effects TBD.
    * **No lockout:** The Hero can leave immediately after resting (no cooldown).
    * **Base parity:** The Base functions as the initial safe spot and uses the same rest behavior/rate.

### 1.6 Combat (Real-Time, Cooldown-Based)
Encounters are real-time. Actions recharge over time (cooldowns), enabling both manual play and automation.
* **Actions:** Examples include basic attacks, strong attacks, and utility skills.
* **Manual play:** Player chooses when to spend recharged actions.
* **Auto play:** An AI uses recharged actions according to a selected style/priority (to be defined).

---

## 2. Hero Stats (Launch Set)
To keep the system focused, the Hero starts with 3 primary stats. Damage and progression are primarily driven by **gear and skills**, with Theory providing a small multiplier.

* **Sustain:** Viral Load resistance and rest recovery rate.
* **Tempo:** Cooldown recharge speed and mobility/avoidance.
* **Theory:** Enigma support (hints/spots/clues), utility skill effectiveness, small damage multiplier, and potential Base-related perks/unlocks (TBD).

### 2.1 Theory as a “Multiplier Multiplier”
To keep Theory’s impact very small early and more relevant later, it primarily amplifies **multipliers** rather than base values.

Design principle:
* Early game bonuses are small, so Theory does almost nothing.
* Late game gear/skill bonuses are larger, so Theory meaningfully amplifies them.

Example mapping (placeholder):
* Let `M` be a multiplicative bonus from gear/skills/buffs (e.g., damage, loot quantity, loot rarity).
* Let `T` be the Hero’s Theory value.
* Compute `theory_bonus = k * T` (with a small `k`, tuned later).
* Then make the bonus portion stronger: `M' = 1 + (M - 1) * (1 + theory_bonus)`.

Scope:
* **Applies to all multipliers** (not just damage), including loot multipliers for the Hero.
* **Does not apply** to auto expeditions (crew-only reward calculations are not influenced by the Hero).
* **Does not apply** to safe spot duration (and other hard time-gates; TBD).

### 2.2 Enigma Support (Passive Thresholds)
Theory unlocks exploration/enigma assistance via passive thresholds (values TBD), such as:
* Reveal an additional clue “layer” on the map.
* Highlight suspicious tiles/objects (“spots”).
* Unlock optional hint text or a limited “analysis” overlay.

These thresholds are global and fixed. Harmonics tuning tiers can optionally provide a “catch-up” effect that helps reach early thresholds faster (implementation TBD).

Additional stats (e.g., crit/luck/social) can be added later if the game needs more build variety.

---

## 3. The Economy (Composition)

### 3.1 Base Resources (The Spectrum)
The economy is powered by three base resources generated through sound production in distinct frequency bands.

* **Bassline (Low Band):** Low-frequency energy (pressure and displacement).
* **Chorus (Mid Band):** Mid-frequency energy (body and presence).
* **Harmonics (High Band):** High-frequency energy (detail and coherence).

These resources are generated by crew roles (classes) staffing the Base and are also a primary output of expeditions.

### 3.1.0 Resource Model (Rates + Storage)
Each base resource exists as both:
* **Production rate** (per second), and
* **Stored pool** with a **maximum storage cap**.

Implementation-friendly representation (discrete “music ticks”):
* Every generator (crew role, station, artifact, etc.) defines two values per resource:
    * `tick_interval_seconds` (time between contributions), and
    * `amount_per_tick` (how much resource is contributed on each tick).
* The effective per-second production rate used by economy math is derived as:
    * `rate_per_second = amount_per_tick / tick_interval_seconds`
* For safety and simplicity, simulation can update pools using continuous rates (`pool += rate_per_second * delta_seconds`) while still keeping ticks as the “authoring” representation for cadence/UI/VFX.

Rules:
* If production would exceed storage capacity, the overflow is **lost** (unless a later perk changes this behavior).
* Costs come in two forms:
    * **One-time costs:** Require enough stored pool; if you don’t have the stock, the action cannot be taken.
    * **Upkeep costs (per second):** Power/maintenance drains a resource pool over time (e.g., `x Chorus / sec` to keep a safe spot online).
* Upkeep vs storage behavior:
    * If `generation > upkeep`, pay upkeep and store the surplus (up to cap).
    * If `upkeep > generation`, the pool is drained to cover the deficit; if the pool hits 0, the system enters brownout behavior (see `3.2.2`).
* On **Tuning**, all stored pools reset to **0** (run-scoped state).

### 3.1.1 Key Multipliers (Draft)
To keep formulas readable, we use these symbols:
* `Resonance` (`R`): The primary (and only) cross-run multiplier (NGU-style `NUMBER`). It is recalculated on each Tuning from multiple factors and applies to Base-side generation, costs, and effects. Exact factor breakdown TBD.
* `Fragments` (`F_unspent`): Unspent Harmonic Fragments currently held by the Crystal (persistent across Tunings). Used in `Fragment_legacy` with diminishing returns.
* `Refinement` (`P`): A single global Polishing grade (persistent across Tunings). Grants a generation multiplier and is also used for gating/unlocks (exact effects TBD).

### 3.1.3 Tuning Affinity (Persistence Tags)
To keep resets consistent, every major object/system is classified by how it behaves on Tuning:
* `untuned`: Persists across Tunings unchanged (e.g., Hero, map knowledge, `P`, `F_unspent`, most Hero gear).
* `detuned`: Persists as a physical shell but becomes inert on Tuning; it resets to its default constructed level (upgrades wiped) and must be re-attuned via a one-time payment (and any conditions) to become operational again (e.g., most Base stations).
* `tuned`: Run-scoped; reset/destroyed on Tuning (e.g., crew, stored pools, temporary boosts, safe spots, active expeditions).
* Optional later: `crystal_bound`: A subtype of gear/items that are `tuned` (destroyed or detuned on Tuning).

Runtime state (separate from Tuning affinity):
* **Attuned:** The object is calibrated to the current Crystal phase and can function (subject to Chorus power).
* **Inactive:** The object cannot do anything (no effects, no crafting/research/production, no upkeep).
    * After a Tuning, most `detuned` objects start **Inactive** until re-attuned.
    * Only **Attuned** objects have upkeep costs.
    * When a building becomes Attuned, it attempts to power automatically if Chorus budget allows.

Some buildings can be `untuned`:
* They persist across Tunings.
* They do not require Chorus power (or are otherwise exempt from brownout auto-unpower), unless explicitly designed to.
* `untuned` buildings keep their upgrade levels across Tunings.

Upgrade reset rule (draft):
* `tuned` buildings lose upgrade levels on Tuning.
* `untuned` buildings keep upgrade levels on Tuning.
* `detuned` buildings reset upgrade levels on Tuning and require a re-attunement payment before they can function again.

### 3.1.2 Resonance Calculation (Draft)
Resonance is **recomputed on every Tuning** as a product of multiple factors. Some factors use the current run, and some use the prior run to reduce volatility (NGU-style “current” and “prior” terms).

High-level shape (placeholder):
* `R_floor = 1.0`
* Resonance is replaced on Tuning: the next run starts at `R = R_next` (no accumulation).
* Baseline model: `R_current` is used as the baseline for computing the next run.
* `R_next = clamp_min(R_floor, R_current * Frontier_pair * Depth_pair * Time_pair * Active_pair * Harmonics_investment * Fragment_legacy * Stability_now)`
* Pair factors are typically geometric means, e.g. `Time_pair = sqrt(Time_now * Time_prev)`.

Draft factors:
* **Frontier (Reach):** A hybrid reach factor derived from what the Crystal field reveals (unfog) and the maximum Amplitude achieved this run.
    * Frontier is **based on max reached** (peak), not “confirmed”.
    * Frontier is **unfog-based** (Amplitude reveal), not dependent on the Hero entering the area.
    * Frontier is independent from **Depth** (no capping).
    * Map representation:
        * Zones have a `zone_tier` derived from **distance-to-Base** (in tiles), and this tier is stored in the map data.
        * Zone tiers use **exponential rings** (rings get wider as you go out), matching the intuition that pushing a circular field outward gets harder as the perimeter/area grows.
            * Let `phi = 1.618...` (golden ratio).
            * Let `D0 = 1.4` (starter scale; tune later).
            * Define `ring_radius[0] = 0` (Base tile / minimum bubble).
            * Define ring boundaries (outer radius in tiles) as:
                * `ring_radius[t] = round(D0 * phi^(t-1))` for `t >= 1`
                * This yields a starting ladder close to: `1, 2, 4, 6, 10, 16, 26, 42, ...`
                * `zone_tier(tile)` is:
                    * `0` if `distance_tiles(tile, base) == 0`
                    * otherwise the smallest `t >= 1` such that `distance_tiles(tile, base) <= ring_radius[t]`.
            * For a hex grid, `distance_tiles` refers to hex distance.
        * Amplitude tiers are based on **absolute radius thresholds** (tiles).
            * Draft linking rule: **every 5 zone rings define one Amplitude tier threshold**, so:
                * `amp_threshold[0] = base_min_radius_tiles` (baseline tier at the Base minimum radius)
                * `amp_threshold[k] = ring_radius[5 * k]` for `k >= 1`
    * Hybrid shape (draft):
        * Track `zone_tier_unfog_max` = highest zone tier that became unfogged this run.
        * Track `amp_tier_max` = highest Amplitude tier achieved this run (Amplitude thresholds define tiers).
        * Map each tier to a scalar raw score (exact mapping tuned later), e.g.:
            * `ZoneScore = 1 + z * ln(1 + zone_tier_unfog_max)`
            * `AmpScore = 1 + a * ln(1 + amp_tier_max)`
        * Combine as a geometric mean: `Frontier_raw = sqrt(ZoneScore * AmpScore)`
        * Allow Frontier to be < 1.0 by normalizing against the prior run’s raw reach (acts as a moving “par”):
            * Track `Frontier_prev_raw` from the prior run.
            * `ratio = Frontier_raw / max(epsilon, Frontier_prev_raw)`
            * `Frontier_pair = ratio^w` with `w in (0, 1)` (smoothing exponent; draft `w = 0.5`)
    * UI note: show “Frontier” as one multiplier and optionally show the two sub-scores, but the exact internal math does not need to be fully explained to the player.
* **Depth (Combat):** Derived from the highest boss level cleared this run.
* **Time (Session):** A logarithmic factor based on time since last Tuning (so it still works for multi-day runs). Suggested shape:
    * Base (log) term: `Time_log(t) = log(1 + t_minutes) / log(1 + 60)` (so 60 minutes ~= 1.0, shorter runs < 1.0, longer runs grow slowly > 1.0).
    * Short-run penalty (step): `Time_penalty(t)`:
        * if `t_minutes < 15` => `0.25`
        * else if `t_minutes < 30` => `0.50`
        * else if `t_minutes < 45` => `0.75`
        * else => `1.00`
    * Combined: `Time(t) = Time_log(t) * Time_penalty(t)`
    * `t_minutes` is real-world elapsed time since last Tuning (not paused by focus/minimize/menus).
    * Apply the penalty per-run: compute `Time_now` and `Time_prev` individually, then use `Time_pair = sqrt(Time_now * Time_prev)` to bake in prior-run terms.
* **Active Playtime (Engagement):** Rewards actually playing (manual exploration/combat/enigmas) in addition to idle time. Suggested shape:
    * Track `active_seconds` via a **gameplay-action heartbeat** (session-bound; stops when paused or unfocused).
    * Track activity per category (seconds):
        * `exploration`, `combat`, `enigmas`, `hero` (inventory/skills/items), `base_management` (staffing/expedition planning), `crafting`
        * Add new categories only if needed.
    * Heartbeat model:
        * Maintain a single `last_action_time` and `last_action_category`.
        * On meaningful gameplay actions, update both (the “current action” defines the category):
            * Examples: movement, combat actions, interactions, puzzle progress, opening Hero/enigma screens, changing assignments, starting/recalling expeditions, crafting confirmations.
        * Category switches occur only when the next meaningful action happens (screen changes alone do not switch the category).
        * While the game is on an eligible gameplay screen (not paused, not settings/system menus) and focused:
            * If `now - last_action_time <= 30 minutes`, add `delta_seconds` to `active_seconds[last_action_category]`.
            * Otherwise, do not count time as active.
        * If the game loses focus/minimizes, stop counting active time immediately (grace period applies only while focused).
        * If the game is paused, stop counting active time (pause suspends session time).
    * Aggregation:
        * `active_seconds_total = sum(active_seconds_by_category)`
        * `active_minutes = active_seconds_total / 60`
    * `Active(active_minutes) = 1 + a * log(1 + active_minutes)` with small `a` (diminishing returns).
    * Use `Active_pair = sqrt(Active_now * Active_prev)` to bake in prior-run terms.
* **Harmonics Investment:** Resonance contribution driven by specific buildings/perks that consume Harmonics as **one-time investments** and convert it into a persistent “mastering” effect within the run.
    * This replaces the earlier idea of a generic `Mastering_now` stat.
* **Fragment legacy:** A bonus-only factor derived from unspent Harmonic Fragments (`F_unspent`) with diminishing returns, amplified by Refinement (`P`).
    * Draft shape: `Fragment_legacy(F_unspent, P) = f(F_unspent) * g(P)` where:
        * `f(F_unspent)` has diminishing returns (e.g., logarithmic),
        * `g(P)` is a nominal multiplier from Refinement (exact mapping TBD).
    * Optional: instead of automatic step tiers, use a dedicated long-term action/perk like **Polishing**:
        * Polishing is an instant action that permanently consumes Harmonic Fragments to increase the single global Refinement grade (`P`).
        * Immediate impact (A): Refinement increases `Fragment_legacy`.
        * Progression gates (C): Refinement levels can unlock tech/content tiers and raise caps (details TBD).
        * Polishing costs scale with diminishing returns (e.g., logarithmic or tier-based).
* **Stability (Optional):** Mild factor based on Base stability this run (e.g., time spent in “safe” vs brownout), intended as a small optimization reward rather than a punishment.

Design goals:
* Tuning “too early” can reduce `R_next` (Resonance is recomputed, not strictly increasing).
* Different playstyles can emphasize different factors (reach vs depth vs mastery).
* Factors should be readable in UI as separate “track ratings” that multiply into the final Resonance.
* Factors can be < 1.0, so short/poor runs can reduce Resonance (floored at `R_floor = 1.0`).
* Active playtime is bonus-only (should not penalize Resonance).

### 3.2 The Field as Three Axes
The Crystal field is affected by the three resources in different ways:

* **Bassline -> Reach:** Stored Bassline drives safe radius (Amplitude).
* **Chorus -> Power:** Powers Base stations and “life support” inside the field (how many systems can run, and how many people can be actively sustained as staff).
* **Harmonics -> Efficiency (Tuning):** Improves Crystal conversion efficiency for all three resources (hybrid: smooth + milestones), unlocking advanced upgrades/capabilities.

#### 3.2.1 Chorus Budget (Soft Cap)
Chorus is the Base’s primary “power” resource.

* Buildings/stations have a **Chorus upkeep** cost (per second) when powered.
* Chorus upkeep is covered first by **current generation**, then by the **stored Chorus pool**.
* If the pool reaches 0 and upkeep still exceeds generation, the Base enters brownout behavior (buildings lose power).

#### 3.2.2 Overload and Inefficiency (Brownout)
When the Chorus pool is drained and upkeep exceeds generation, the Base enters a “brownout” state instead of hard-stopping:
* **Power loss (unpowered buildings):** Some buildings/stations become unpowered, reducing throughput and disabling their effects until power returns.
* **Recovery penalties:** Viral Load recovery inside the bubble slows and may stop at severe brownouts.
* **Field penalties:** The Crystal loses efficiency: **effective Bassline and effective Harmonics are reduced**, shrinking Amplitude and making safe spots less reliable.

The intended feel is a cascading failure: sending too much crew out (or powering too many stations) weakens the Base, which makes exploration riskier.

#### 3.2.3 Harmonics: Continuous + Milestones
Harmonics contributes in two ways:
* **Continuous tuning:** Even small Harmonics output improves conversion efficiency (a multiplier to effective Bassline/Chorus).
* **Tuning tiers (milestones):** Reaching Harmonics thresholds unlocks discrete upgrades (e.g., improved automation reliability, longer-lasting safe spots, better brownout tolerance, higher max station tiers).

#### 3.2.4 Brownout Resolution (Automatic)
Brownout behavior is driven by what remains powered. A simple, readable rule of thumb:
1. **Upkeep first:** The system attempts to pay building upkeep from generation, then from the pool.
2. **Auto-unpower (LIFO):** If still in deficit, buildings are unpowered automatically using **last powered, first unpowered**.

At extreme deficit, all three suffer, and the field penalties compound (smaller Amplitude, unstable safe spots).

Player control:
* The player can manually unpower any buildings to reduce upkeep and keep the desired set powered (as long as total upkeep can be sustained).
* Powered state is a strategic lever: powering order matters because the automatic shutdown is LIFO.
* `untuned` buildings are not affected by Chorus power loss unless explicitly defined as requiring Chorus.

Expedition impact:
* **Expeditions never fail:** If expedition crew are incapacitated, the expedition continues.
* **Incapacitation:** Expedition crew can become incapacitated (unconscious) if sound support collapses (e.g., base power collapse and/or a required safe spot going offline; exact triggers TBD).
    * **Recovery window:** Incapacitation is reversible for **24 hours (real-world time)**.
    * **Recovery triggers:** Crew can recover only if (A) Base Chorus power is restored, and/or (B) a relevant safe spot comes online again.
    * **Permanent loss:** If not recovered within 24 hours, incapacitated crew are permanently lost.
    * **Recall note:** Recall can relocate an expedition, but does not itself “wake” incapacitated crew.
* **Handicap factor (`E`):** Expedition effectiveness multiplier computed as `E = 1 - (incapacitated_expedition_crew / initial_expedition_crew)`.
* **Duration + rewards:** `progress_rate = E` and `reward_multiplier = E`.
* **Hard stall at E=0:** If all expedition crew are incapacitated (`E = 0`), the expedition makes no progress.
    * **24h timer start:** The 24-hour permanent-loss timer starts when the expedition reaches `E = 0` (i.e., the last remaining crew becomes incapacitated).
    * **Partial incapacitation:** If `E > 0`, the expedition continues (slowly) and does not start the 24-hour permanent-loss timer.
* **Crew locking:** Expedition crew are locked for the duration of the expedition (unless recalled).
* **Recall (Call Back):** An expedition can be recalled mid-run to free its crew.
    * **Return lag:** `return_time_seconds = 60 + (p_round * planned_duration_seconds)`, where:
        * `p_round` is `p` rounded up to the next 25% increment (0.25/0.50/0.75/1.00),
        * except when `p < 0.05`, use the exact `p`.
    * **Partial loot:** On recall, loot quantity/volume is reduced by `loot_multiplier = 0.66 * p` (floored down per item type when discrete items require it); rarity is unchanged.
    * **Frozen state:** If an expedition is stalled (`E = 0`), its progress is frozen (no regression); the crew is treated as unconscious and remains where they are with what they found.
    * **Auto-recall:** Some world events (e.g., destination relocking due to safe spot collapse) can force an automatic recall using the same rules.
        * **Progress snapshot:** Auto-recall uses `p` at the moment the event occurs, even if the expedition was stalled (`E = 0`).
        * **Return lag still applies:** Auto-recall always uses the return lag (even if the crew is unconscious/stalled).

#### 3.2.5 Harmonics Cash-In (Tuning Reset)
The Hero can choose to **Tune** the Crystal (reset the run) and cash in accumulated Harmonics to permanently increase the Crystal’s long-term progression.

Concept:
* The player builds up enough Harmonics to perform a **Tuning**.
* Tuning shuts down the Crystal, triggering a lethal Silence event for the Base.
* The run continues with **no crew**, but with permanently increased long-term multipliers and unlocks.

Terminology:
* **Harmonics output:** The current run’s generated high-band resource.
* **Tuning tiers:** Milestone thresholds within a run that unlock upgrades as Harmonics output increases.
* **Resonance:** Cross-run multiplier recalculated on Tuning (see above).
* **Harmonic Fragments:** Rare physical fragments carried by the Hero and delivered to the Crystal; unspent fragments contribute to `Fragment_legacy`, and fragments can also be permanently consumed via Polishing to increase Refinement (`P`) (details TBD).

Immediate consequences (Tuning event):
* **Crystal shutdown:** Base generation drops to 0.
* **Crew death:** All crew members die from the virus (hard reset of staff progression).
* **System collapse:** Safe spots collapse (Chorus-powered), destinations relock.
* **Expeditions lost:** All active expeditions are terminated (crew dead) and unfinished expeditions yield no loot.

Aftermath (new run state):
* **Resonance recalculated:** The next run starts with a new `Resonance` multiplier based on the Tuning inputs.
* **Huge Base boost:** Resonance provides a large multiplicative boost to Base generation and many Base-side effects (exact formulas TBD).
* **Unlocks:** Resonance can unlock new tech tiers/perks/content at thresholds (details TBD).
* **Restart staffing:** The Base begins with no crew; the Hero must recruit/rescue new staff over time.
* **Detuned defaults:** Most Base buildings/tech/perks persist as `detuned` shells and start **Inactive**; they require a re-attunement payment (and any conditions) to become Attuned and operational again.
    * **Critical freebies:** Some essential objects can have `re_attune_cost = 0` so they can be re-attuned immediately after Tuning (e.g., a minimal starter loop).

Phase shift justification (why things “reset”):
* **Crystal phase shift:** Tuning changes the Crystal’s resonance phase. Existing tuned infrastructure becomes incompatible.
* **Detuned stations:** Physical buildings can remain as shells, but their calibrated components are “neutered” until re-attuned to the new phase.
    * **Tuned objects:** Anything marked `tuned` is reset/destroyed on Tuning (including upgrades).
    * **Detuned buildings:** Persist placed as shells, but upgrades are reset; they must be re-attuned (one-time payment) to become operational in the new phase.
    * **Untuned buildings:** Keep upgrades across Tunings and do not require re-attunement unless explicitly designed to.
* **Tech re-attunement:** Knowledge/blueprints can persist, but perks/tech effects must be re-implemented/recalibrated against the new phase to become active again.
* **Hero independence:** The Hero and most gear are not phase-linked to the Crystal and persist normally.
    * Optional later feature: “Crystal-bound” gear exists and is destroyed/de-tuned by Tuning.

Re-attunement cost scaling (draft):
Costs can be denominated in any mix of the three base resources (and later: crafted tiers/items). Each cost line item specifies weights per resource.

Tier-based Resonance cost scaling:
* Every building/upgrade/tech/perk has a **cost tier** that defines how strongly Resonance affects its cost.
    * Tier 1: `k = 0.0` (no Resonance scaling; cost stays the same across Tunings)
    * Higher tiers: larger `k` values (TBD ladder)
* Let `R` be the current `Resonance` multiplier (recomputed on Tuning).
* For cost stability (and to keep midgame affordable), costs can use an effective Resonance:
    * `R_eff = log10(1 + R)` (so `R=100` => `R_eff ~ 2.0`)
* Standard cost shape: `cost = base_cost * (1 + k * R_eff)`
    * If `k = 0`, cost is constant.
    * If `k > 0`, cost scales linearly with Resonance.
    * Example (early staple): Fire Pit `base_cost=10`, Tier 1 `k=0` => cost stays `10` for every Tuning regardless of Resonance.

Scaling principle:
* Resonance is used in both **production** and **cost scaling** (Base-side).
* Buildings, upgrades, tech, and perks use the same tier scheme for costs; effect scaling is handled separately.
* Harmonic Fragments are not consumed by Tuning; they remain stacked on the Crystal and contribute to Resonance permanently.

Tuning cadence (anti-spam):
* Track `N = tuning_count` (lifetime number of Tunings performed).
* Allow Tuning at any time, but enforce a short real-time cooldown between Tunings (currently **3 minutes**).
 * To discourage “too-frequent” Tuning, let some costs scale with `N` in addition to `R`, so that increasing `N` without enough run progress becomes counterproductive.
    * Draft: `cost = base_cost * (1 + k * (R_eff + spam_factor(N)))`
    * Example: `spam_factor(N) = s * N^p` (with small `s` and `p > 1`), tuned so optimal play is “Tune after meaningful progress” rather than spamming.
* Spam protection affects **costs only** (not effect strength).

### 3.3 Crafting Tiers (Compositions)
The three base resources can be refined into craftable tiers.

* **Beats:** The smallest crafted unit, mixed from Bassline/Chorus/Harmonics.
* **Bars:** Crafted from Beats (`16 Beats = 1 Bar`). Used for basic gear and building parts.
* **Tracks:** Crafted from Bars. Used for advanced gear, upgrades, and consumable effects.
* **Albums:** Crafted from Tracks. Used for artifacts and long-term progression unlocks.

### 3.4 Crew Classes and Growth
Every living person you gain becomes Base staff ("crew"). Crew members are sound producers with three learnable classes:

* **Drummer (Bassline):** Low-band output.
* **Vocalist (Chorus):** Mid-band output.
* **Synth (Harmonics):** High-band output.

Special case:
* **The Hero:** The Hero can be assigned to the Crystal Circle, but is unavailable while exploring manually (Base generation can drop to 0).
    * Early-game default: at the start of a fresh run, Base production can be `0` until the player assigns crew (or the Hero) to the Crystal Circle.

Progression model:
* **Experience (XP):** Crew gains XP from Base work and expeditions (expeditions grant much more).
* **Total level curve:** XP thresholds scale with the crew member’s overall progression.
* **Equipped class leveling:** When a crew member levels up, the level is applied to their currently equipped class.
* **Multi-class:** Switching classes is allowed, but because level-ups get more expensive over time, taking a second/third class from 0 upward is intentionally costly.
* **Combined performance:** When working at the Base, a crew member contributes using all of their learned class levels (each class level contributes to its band’s generation).

### 3.5 Base Stations (Draft List)
Stations consume Chorus while active and convert time + resources into progression.

Candidates:
* **Crystal Circle:** Staff “play” to generate Bassline/Chorus/Harmonics for the Crystal (producer; does not consume Chorus).
* **Resonance Chamber:** Improves Bassline conversion into Amplitude (reach growth).
* **Mix Console:** Improves efficiency and brownout tolerance (Harmonics-facing upgrades).
* **Workshop:** Crafts Beats/Bars/Tracks/Albums and basic gear parts.
* **Repair Bench:** Repairs and upgrades expedition equipment.
* **Research Booth:** Unlocks tech trees (safe spots, automation, new station tiers).
* **Safe Spot Fabricator:** Produces temporary/permanent safe spot modules.
* **Infirmary:** Improves Viral Load recovery quality (faster/safer recovery thresholds).
* **Relay Tower:** Extends map visibility, scanning, and destination discovery logic.

### 3.6 Harmonics Tuning Tiers (Draft)
Tuning tiers are Harmonics milestones with music-themed names.

Example ladder:
1. **Soundcheck:** Basic tuning; improves automation reliability and slightly improves conversion efficiency.
2. **Rehearsal:** Unlocks **temporary safe spots** and improves brownout recovery.
3. **Live Set:** Unlocks an additional **parallel expedition slot** and reduces brownout penalties.
4. **Studio Take:** Unlocks **permanent safe spots** and increases safe spot stability/duration.
5. **Mastering:** Major efficiency leap; raises max station tier, improves field stability, and increases brownout tolerance.
