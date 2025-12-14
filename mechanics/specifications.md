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
* **Minimum radius:** The Base (Crystal) provides a small minimum safe radius by default (enough room to support at least one additional station).
* **Primary driver:** **Bassline** output (low-band production).
* **Modifier:** **Harmonics** improves Crystal efficiency (tuning), increasing how much Amplitude you get from the same Bassline.
* **Formula (placeholder):** `Amplitude = f(Bassline) * Tuning(Harmonics)`.
* **Inertia (2-phase):** If Base generation drops sharply (or to 0), the field does not collapse instantly:
    * **Hold:** 60s with no change.
    * **Degrade:** then decays over the next 60s (curve TBD; default linear).
        * If Base generation is **0**, Amplitude decays to the **minimum radius**.
        * Otherwise, Amplitude decays toward the new equilibrium.
* **Effect:** Expanding Amplitude automatically "un-fogs" the map, revealing new dungeons and resource nodes.

### 1.4 Exploration, Quests, Enigmas, Expeditions
Outside the Base, the player explores the map to discover locations, complete quests, solve enigmas, and run expeditions.

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

### 3.1.1 Key Multipliers (Draft)
To keep formulas readable, we use these symbols:
* `Resonance` (`R`): The primary (and only) cross-run multiplier (NGU-style `NUMBER`). It is recalculated on each Tuning from multiple factors and applies to Base-side generation, costs, and effects. Exact factor breakdown TBD.
* `Fragments` (`F`): Total Harmonic Fragments permanently stacked on the Crystal (persistent across Tunings). Used as a weighted factor in the Resonance formula.

### 3.1.2 Resonance Calculation (Draft)
Resonance is **recomputed on every Tuning** as a product of multiple factors. Some factors use the current run, and some use the prior run to reduce volatility (NGU-style “current” and “prior” terms).

High-level shape (placeholder):
* `R_next = clamp_min(R_floor, R_base * Frontier_pair * Depth_pair * Time_pair * Active_pair * Mastering_now * Fragment_legacy * Stability_now)`
* Pair factors are typically geometric means, e.g. `Time_pair = sqrt(Time_now * Time_prev)`.

Draft factors:
* **Frontier (Reach):** Derived from the maximum exploration tier reached this run (based on max Amplitude / unlocked map zones).
* **Depth (Combat):** Derived from the deepest dungeon/boss tier cleared this run.
* **Time (Session):** A logarithmic factor based on time since last Tuning (so it still works for multi-day runs). Suggested shape:
    * `Time(t) = log(1 + t_minutes) / log(1 + 60)` (so 60 minutes ~= 1.0, shorter runs < 1.0, longer runs grow slowly > 1.0).
    * Use `Time_pair = sqrt(Time_now * Time_prev)` to bake in prior-run terms.
* **Active Playtime (Engagement):** Rewards actually playing (manual exploration/combat/enigmas) in addition to idle time. Suggested shape:
    * Track `active_minutes` via a **gameplay-action heartbeat**:
        * On meaningful gameplay actions (move/skill/use/interact/puzzle progress), update `last_action_time`.
        * While in manual gameplay (exploration/combat/enigma screens; excluding menus/pauses), count time as active as long as `now - last_action_time <= 30 minutes` (inclusive “grace” window for thinking/reading).
        * If the game loses focus/minimizes, stop counting active time immediately (grace period applies only while focused).
    * `Active(active_minutes) = 1 + a * log(1 + active_minutes)` with small `a` (diminishing returns).
    * Use `Active_pair = sqrt(Active_now * Active_prev)` to bake in prior-run terms.
* **Mastering (Harmonics):** Derived from “banked Harmonics” during the run (e.g., integrated Harmonics output and/or key Harmonics milestones).
* **Fragment legacy:** A small-weight factor derived from total stacked Harmonic Fragments (`F`), e.g. `1 + w * F` with small `w`.
* **Stability (Optional):** Mild factor based on Base stability this run (e.g., time spent in “safe” vs brownout), intended as a small optimization reward rather than a punishment.

Design goals:
* Tuning “too early” can reduce `R_next` (Resonance is recomputed, not strictly increasing).
* Different playstyles can emphasize different factors (reach vs depth vs mastery).
* Factors should be readable in UI as separate “track ratings” that multiply into the final Resonance.

### 3.2 The Field as Three Axes
The Crystal field is affected by the three resources in different ways:

* **Bassline -> Reach:** Sets and grows safe radius (Amplitude).
* **Chorus -> Power:** Powers Base stations and “life support” inside the field (how many systems can run, and how many people can be actively sustained as staff).
* **Harmonics -> Efficiency (Tuning):** Improves Crystal conversion efficiency, increasing the effective value of both Bassline and Chorus, and unlocking advanced upgrades/capabilities.

#### 3.2.1 Chorus Budget (Soft Cap)
Chorus acts as a soft power budget with competing demands:
* **Field Core:** Minimum power to keep the Crystal stable and provide Viral Load recovery.
* **Stations:** Workshops, research, crafting, safe-spot fabricators, etc.
* **Population Load (Active Staff):** Supporting *active* staff (comfort, food systems, medical, comms). Staff beyond Chorus capacity remain present but become **inactive** (cannot work) until capacity increases.

#### 3.2.2 Overload and Inefficiency (Brownout)
When Chorus supply is lower than Chorus demand, the Base enters a “brownout” state instead of hard-stopping:
* **Station penalties:** Station throughput scales down and/or some stations go offline.
* **Staff inactivity:** If population load exceeds what Chorus can sustain, some staff become inactive. Inactive staff are **unavailable for everything** (no station work, no expeditions) until Chorus capacity increases.
* **Recovery penalties:** Viral Load recovery inside the bubble slows and may stop at severe overload.
* **Field penalties:** The Crystal loses efficiency: **effective Bassline and effective Harmonics are reduced**, shrinking Amplitude and making safe spots less reliable.

The intended feel is a cascading failure: sending too much crew out (or powering too many stations) weakens the Base, which makes exploration riskier.

Inactive staff are explained in-world as **Silence Stupor**: without enough mid-band stimulation (Chorus), the nervous system “drops out” into a protected, semi-catatonic state. They are alive, but cannot function until the field is properly powered again.

#### 3.2.3 Harmonics: Continuous + Milestones
Harmonics contributes in two ways:
* **Continuous tuning:** Even small Harmonics output improves conversion efficiency (a multiplier to effective Bassline/Chorus).
* **Tuning tiers (milestones):** Reaching Harmonics thresholds unlocks discrete upgrades (e.g., improved automation reliability, longer-lasting safe spots, better brownout tolerance, higher max station tiers).

#### 3.2.4 Brownout Resolution (Automatic)
Brownout behavior is automatic (no player-set priorities). A simple, readable rule of thumb:
1. **Crystal Core first:** Tries to preserve the minimum needed for “safe” status and recovery.
2. **Population load next:** Keeps staff functional as long as possible.
3. **Stations last:** Station throughput is the first to degrade and/or shut down.

At extreme deficit, all three suffer, and the field penalties compound (smaller Amplitude, unstable safe spots).

When staff must be pushed into inactivity, the game resolves it automatically using a player-controllable rule:
* **Last assigned, first inactive:** The most recently assigned staff are the first to become inactive as Chorus capacity drops. This makes staffing order a meaningful lever even without explicit priority controls.

Assignment resolution details:
* **Stations first:** Staff assigned to stations are removed first (LIFO).
* **Then expeditions:** If no one is assigned to stations, expedition crew are incapacitated next (LIFO). (They remain assigned/locked, but contribute 0 until they wake.)
* **The Crystal is a station:** “Playing around the Crystal” to generate Bassline/Chorus/Harmonics counts as a station assignment.

Recovery:
* **Instant wake:** When Chorus capacity returns, inactive staff become active immediately (no warm-up timer).
* **Non-lethal:** Silence Stupor does not directly harm staff.

Expedition impact:
* **Expeditions never fail:** If expedition crew are incapacitated, the expedition continues.
* **Handicap factor:** Apply `H = 1 - (incapacitated_expedition_crew / initial_expedition_crew)` as an additional penalty on top of losing that crew’s bonuses.
* **Duration + rewards:** `H` scales both expedition progress rate (remaining duration) and rewards.
* **Hard stall at H=0:** If all expedition crew are incapacitated (`H = 0`), the expedition makes no progress until capacity returns and crew wake up.
* **Automatic resume:** When capacity returns and crew wake up, stalled expeditions automatically resume with the same crew assignment.
* **Crew locking:** Expedition crew are locked for the duration of the expedition (unless recalled).
* **Recall (Call Back):** An expedition can be recalled mid-run to free its crew.
    * **Return lag:** If the expedition is `p` complete (`0..1`), return time is `p * 120s`.
    * **Partial loot:** On recall, loot quantity/volume is reduced by `loot_multiplier = 0.66 * p` (floored down per item type when discrete items require it); rarity is unchanged.
    * **Frozen state:** If an expedition is stalled (`H = 0`), its progress is frozen (no regression); the crew is treated as unconscious and remains where they are with what they found.
    * **Auto-recall:** Some world events (e.g., destination relocking due to safe spot collapse) can force an automatic recall using the same rules.
        * **Progress snapshot:** Auto-recall uses `p` at the moment the event occurs, even if the expedition was stalled (`H = 0`).
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
* **Harmonic Fragments:** Rare physical fragments carried by the Hero and delivered to the Crystal; they permanently stack on the Crystal and contribute to Resonance (details TBD).

Immediate consequences (Tuning event):
* **Crystal shutdown:** Base generation drops to 0.
* **Crew death:** All crew members die from the virus (hard reset of staff progression).
* **System collapse:** Safe spots collapse (Chorus-powered), destinations relock, and expeditions are auto-recalled using the Recall rules.

Aftermath (new run state):
* **Resonance recalculated:** The next run starts with a new `Resonance` multiplier based on the Tuning inputs.
* **Huge Base boost:** Resonance provides a large multiplicative boost to Base generation and many Base-side effects (exact formulas TBD).
* **Unlocks:** Resonance can unlock new tech tiers/perks/content at thresholds (details TBD).
* **Restart staffing:** The Base begins with no crew; the Hero must recruit/rescue new staff over time.

Phase shift justification (why things “reset”):
* **Crystal phase shift:** Tuning changes the Crystal’s resonance phase. Existing tuned infrastructure becomes incompatible.
* **Detuned stations:** Physical buildings can remain as shells, but their calibrated components are “neutered” until re-attuned to the new phase.
    * **Upgrade reset:** Buildings lose all upgrades on Tuning; reactivated upgrades benefit from the new Harmonics bonuses.
* **Tech re-attunement:** Knowledge/blueprints can persist, but perks/tech effects must be re-implemented/recalibrated against the new phase to become active again.
* **Hero independence:** The Hero and most gear are not phase-linked to the Crystal and persist normally.
    * Optional later feature: “Crystal-bound” gear exists and is destroyed/de-tuned by Tuning.

Re-attunement cost scaling (draft):
* Each building/tech/perk has:
    * `base_cost` (its baseline price at `Resonance = 1`)
    * `fixed_factor` (always paid; keeps early staples affordable)
    * `cost_multiplier` (how strongly it scales with Resonance)
* Let `R` be the current `Resonance` multiplier (NGU-style, recalculated on Tuning). Let `F` be total Harmonic Fragments (persistent). Exact formula for `R` TBD, but `F` has a small weight.
* Cost formula: `cost = base_cost * (fixed_factor + cost_multiplier * R)`
    * Example (early staple): Fire Pit `base_cost=10`, `fixed_factor=1`, `cost_multiplier=0` => cost stays `10` for every Tuning regardless of Resonance.

Scaling principle:
* Buildings, upgrades, tech, and perks use the same scheme: they can have both **cost scaling** and **effect scaling** driven by `R`.
* Effect formula (draft): `effect = base_effect * (fixed_factor + effect_multiplier * R)`
* Harmonic Fragments are not consumed by Tuning; they remain stacked on the Crystal and contribute to Resonance permanently.

Tuning cadence (anti-spam):
* Track `N = tuning_count` (lifetime number of Tunings performed).
* Allow Tuning at any time, but enforce a short real-time cooldown between Tunings (currently **3 minutes**).
 * To discourage “too-frequent” Tuning, let some costs scale with `N` in addition to `R`, so that increasing `N` without enough run progress becomes counterproductive.
    * Draft: `cost = base_cost * (fixed_factor + cost_multiplier * (R + spam_factor(N)))`
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
* **The Hero:** The Hero can be assigned to the Crystal Circle and cannot be forced into Silence Stupor, but is unavailable while exploring manually (Base generation can drop to 0).

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
