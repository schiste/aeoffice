# Dungeons & Drum Machines

> **"In the Silence, music isn't art. It's oxygen."**

**Dungeons & Drum Machines** is a Dystopian Idle-RPG built with **Godot 4** and **Rust**. It combines the addictive progression of incremental games (*NGU Idle*, *Candy Box*) with the survival tension of *Darkest Dungeon*, wrapped in a unique "Acoustic Survival" narrative.

## 🎵 The Concept
The world didn't end with a bang—it ended with a filter. Satellites dampen most audible sound on Earth (approx. 20Hz–15kHz). A "Silence Virus" kills anyone exposed to absolute quiet for more than 4 hours.

You play a survivor with a genetic resistance (24-hour tolerance). You must build a **Base (The Studio)** centered around a Crystal that amplifies sound, pushing back the Silence to reveal the map.

Outside the Base, you explore the world through **map exploration, quests, enigmas, and expeditions** (with both **manual** and **auto** play modes). Combat is **real-time** and **cooldown-based** (actions recharge over time). The Base is the primary source of sound output, produced by the crew, their equipment, and artifacts. This sound is treated as three base resources (low/mid/high band) that affect the Crystal field differently. Later progression unlocks **forward safe spots** during exploration, which are also used to unlock expedition destinations (temporarily or permanently). Expeditions can run in parallel, and they use the same crew pool as the Base (a tradeoff between exploration progress and Base output); expeditions bring back loot that is processed at the Base.

## 🧭 Game Dynamics (Core Loops)
* **Staff the Base:** Assign staff to the Crystal Circle and stations to generate and spend `Bassline` (reach), `Chorus` (power), and `Harmonics` (efficiency), all boosted by `Resonance` (Base-only multiplier).
* **Store and Spend:** Base resources are produced per-second and can be stored up to a cap; overflow is lost; some costs are one-time while others are ongoing upkeep.
* **Expand the Bubble:** Stored `Bassline` fuels the safe bubble’s expansion; loudspeakers can relay coverage past obstacles; inertia prevents instant collapse (10s hold + 10s degrade).
* **Explore Manually:** The Hero pushes beyond safety (real-time cooldown combat + enigmas) and uses safe spots (including the Base) to rest and reduce Viral Load.
* **Run Auto Expeditions:** Expeditions are crew-only, parallel, time-based resource runs that never fail, but can slow/stall during brownouts and can be recalled for partial loot.
* **Manage Tradeoffs:** Sending staff out reduces Base output; if Chorus upkeep can’t be sustained, buildings lose power (LIFO brownouts), which can cascade into smaller reach and unstable safe spots.
* **Tune (Reset):** Cash in accumulated Harmonics (incl. Harmonic Fragments carried back by the Hero) to recalculate `Resonance` for the next run at the cost of a hard reset (Crystal shutdown + all crew die); most buildings remain placed but become `detuned` (inactive shells: upgrades reset + one-time re-attunement payment), while `untuned` buildings keep upgrades, and you restart with no crew but big generation bonuses and new unlocks.
    * On Tuning, active expeditions are lost (crew dead) and safe spots collapse.

## 🛠️ Technical
See [**Technical Architecture**](./technical-architecture.md).

## 📂 Documentation
* [**Game Specifications**](../mechanics/specifications.md) - Mechanics, Economy, and Stats.
* [**World Bible**](../lore/lore.md) - The Virus, The Silence, and the world.
